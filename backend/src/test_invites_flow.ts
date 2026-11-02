import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();

import {
  createVisitorInvite,
  findInvitesByResident,
  findInviteByCode,
  markInviteAsUsed,
  cancelVisitorInvite,
  ensureVisitorInvitesTable,
} from './database/db';
import { getMysqlPool } from './database/mysql';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PRE-APPROVED VISITOR INVITES UNIT TESTS');
  console.log('====================================================\n');

  const pool = await getMysqlPool();
  if (!pool) {
    console.error('❌ Database connection failed. Aborting test.');
    process.exit(1);
  }

  await ensureVisitorInvitesTable();

  // Pick an active resident and flat from DB for testing
  const [flats]: any = await pool.query(
    `SELECT f.id as flatId, f.flat_number as flatNumber, f.society_id as societyId, u.id as residentId, u.name as residentName
     FROM flats f
     JOIN users u ON f.resident_id = u.id
     WHERE u.role = 'RESIDENT'
     LIMIT 1`
  );

  if (!flats || flats.length === 0) {
    console.warn('⚠️ No active resident/flat found. Creating mock references for test.');
  }

  const testFlatId = flats[0]?.flatId || 'flat_test_101';
  const testSocietyId = flats[0]?.societyId || 'soc_greengate';
  const testResidentId = flats[0]?.residentId || 'usr_test_resident';

  let testInviteId = '';
  let testPassCode = '';

  try {
    // -----------------------------------------------------------
    // TEST 1: Pass Generation & Code Uniqueness
    // -----------------------------------------------------------
    console.log('[TEST 1] Testing pre-approved pass generation...');
    const now = new Date();
    const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const invite = await createVisitorInvite({
      societyId: testSocietyId,
      flatId: testFlatId,
      residentId: testResidentId,
      visitorName: 'Unit Test Guest',
      visitorPhone: '9876543210',
      purpose: 'guest',
      validFrom: now,
      validUntil,
      notes: 'Testing instructions',
    });

    if (!invite || !invite.id || !invite.passCode) {
      throw new Error('Pass creation failed or returned empty payload');
    }

    if (invite.passCode.length !== 6 || isNaN(Number(invite.passCode))) {
      throw new Error(`Pass code must be a 6-digit numeric string, got: "${invite.passCode}"`);
    }

    if (invite.status !== 'ACTIVE') {
      throw new Error(`Expected status ACTIVE, got: "${invite.status}"`);
    }

    testInviteId = invite.id;
    testPassCode = invite.passCode;
    console.log(`✅ [TEST 1 PASSED] Generated Pass #${testPassCode} (ID: ${testInviteId})\n`);

    // -----------------------------------------------------------
    // TEST 2: List Invites by Resident
    // -----------------------------------------------------------
    console.log('[TEST 2] Testing fetching invites by resident...');
    const list = await findInvitesByResident(testResidentId, testSocietyId);
    const found = list.find((i) => i.id === testInviteId);

    if (!found) {
      throw new Error(`Created pass ${testInviteId} not found in resident invites list`);
    }

    if (found.visitorName !== 'Unit Test Guest') {
      throw new Error(`Visitor name mismatch: expected "Unit Test Guest", got: "${found.visitorName}"`);
    }

    console.log(`✅ [TEST 2 PASSED] Successfully retrieved resident invites list (Total: ${list.length})\n`);

    // -----------------------------------------------------------
    // TEST 3: Guard Lookup by Pass Code
    // -----------------------------------------------------------
    console.log('[TEST 3] Testing guard pass lookup by 6-digit code...');
    const lookup = await findInviteByCode(testSocietyId, testPassCode);

    if (!lookup) {
      throw new Error(`Pass lookup by code "${testPassCode}" returned null`);
    }

    if (lookup.id !== testInviteId || lookup.status !== 'ACTIVE') {
      throw new Error(`Lookup returned wrong invite or status: ${JSON.stringify(lookup)}`);
    }

    console.log(`✅ [TEST 3 PASSED] Lookup resolved: ${lookup.visitorName} for Flat ${lookup.flatNumber || 'N/A'}\n`);

    // -----------------------------------------------------------
    // TEST 4: Atomic Verification & Single-Use Enforcement
    // -----------------------------------------------------------
    console.log('[TEST 4] Testing atomic mark as USED (Single-Use protection)...');
    const firstUse = await markInviteAsUsed(testInviteId);
    if (!firstUse) {
      throw new Error('Initial mark as USED returned false');
    }

    // Attempt second check-in with SAME code (Must fail)
    const secondUse = await markInviteAsUsed(testInviteId);
    if (secondUse) {
      throw new Error('CRITICAL VULNERABILITY: Pass was reused! Atomic mark failed to prevent double check-in.');
    }

    const verifiedState = await findInviteByCode(testSocietyId, testPassCode);
    if (verifiedState?.status !== 'USED') {
      throw new Error(`Expected status USED, got: ${verifiedState?.status}`);
    }

    console.log('✅ [TEST 4 PASSED] Pass marked as USED. Re-use attempts strictly blocked.\n');

    // -----------------------------------------------------------
    // TEST 5: Pass Cancellation Flow
    // -----------------------------------------------------------
    console.log('[TEST 5] Testing resident cancellation of an active pass...');
    const inviteToCancel = await createVisitorInvite({
      societyId: testSocietyId,
      flatId: testFlatId,
      residentId: testResidentId,
      visitorName: 'Cancelled Guest',
      purpose: 'cab',
      validFrom: now,
      validUntil,
    });

    const cancelled = await cancelVisitorInvite(inviteToCancel.id, testResidentId);
    if (!cancelled) {
      throw new Error('Failed to cancel active pass');
    }

    const cancelledState = await findInviteByCode(testSocietyId, inviteToCancel.passCode);
    if (cancelledState?.status !== 'CANCELLED') {
      throw new Error(`Expected CANCELLED status, got: ${cancelledState?.status}`);
    }

    // Cleanup second test invite
    await pool.query('DELETE FROM visitor_invites WHERE id = ?', [inviteToCancel.id]);
    console.log(`✅ [TEST 5 PASSED] Pass #${inviteToCancel.passCode} cancelled successfully.\n`);

    // Cleanup primary test invite
    await pool.query('DELETE FROM visitor_invites WHERE id = ?', [testInviteId]);

    console.log('====================================================');
    console.log('🎉 ALL PRE-APPROVED VISITOR UNIT TESTS PASSED (5/5)');
    console.log('====================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ UNIT TEST FAILED:', err.message);
    if (testInviteId) {
      await pool.query('DELETE FROM visitor_invites WHERE id = ?', [testInviteId]);
    }
    process.exit(1);
  }
}

runTests();
