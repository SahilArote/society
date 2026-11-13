import assert from 'node:assert';
import {
  getSocietyServices,
  getSocietyServiceById,
  createSocietyService,
  getLostFoundItems,
  getLostFoundItemById,
  createLostFoundItem,
  updateLostFoundStatus,
  deleteLostFoundItem,
  getSocietyEvents,
  getSocietyEventById,
  registerForEvent,
  cancelEventRegistration,
  createSocietyEvent,
} from './database/db';

async function runServicesTests() {
  console.log('\n--- 1. Testing Services Module ---');

  // Test 1: Fetch verified society services
  const services = await getSocietyServices('soc_01');
  assert.ok(Array.isArray(services), 'Services should be an array');
  assert.ok(services.length > 0, 'Should return default seeded services');
  console.log(`✅ [Services List] Retrieved ${services.length} society services`);

  // Test 2: Filter by type (vendors vs utilities vs staff)
  const vendors = await getSocietyServices('soc_01', { type: 'vendors' });
  assert.ok(vendors.every(s => s.serviceType === 'VENDOR'), 'All should be VENDOR type');
  console.log(`✅ [Services Type Filter] Vendors count: ${vendors.length}`);

  const utilities = await getSocietyServices('soc_01', { type: 'utilities' });
  assert.ok(utilities.every(s => s.serviceType === 'UTILITY'), 'All should be UTILITY type');
  console.log(`✅ [Services Type Filter] Utilities count: ${utilities.length}`);

  // Test 3: Category filter
  const electricians = await getSocietyServices('soc_01', { category: 'Electrician' });
  assert.ok(electricians.length > 0, 'Should find Electrician services');
  assert.strictEqual(electricians[0].category, 'Electrician');
  console.log(`✅ [Services Category Filter] Found ${electricians.length} Electrician services`);

  // Test 4: Search query
  const searchResults = await getSocietyServices('soc_01', { search: 'Plumbing' });
  assert.ok(searchResults.length > 0, 'Search for Plumbing should return results');
  assert.ok(searchResults[0].name.includes('Plumbing') || searchResults[0].description?.includes('Plumbing'));
  console.log(`✅ [Services Search] Search query matched: "${searchResults[0].name}"`);

  // Test 5: Service Detail
  const srvId = services[0].id;
  const detail = await getSocietyServiceById(srvId, 'soc_01');
  assert.ok(detail, 'Service detail should exist');
  assert.strictEqual(detail?.id, srvId);
  console.log(`✅ [Services Detail] Successfully retrieved service "${detail?.name}"`);

  // Test 6: Create new service
  const newSrv = await createSocietyService({
    societyId: 'soc_01',
    name: 'Sai Carpentry Studio',
    category: 'Carpenter',
    serviceType: 'VENDOR',
    providerName: 'Sai Ram',
    phone: '+91 98920 12345',
    address: 'Near Gate 1 Shopping Arcade',
    description: 'Custom furniture, door repairs, lock replacements & modular kitchen woodwork.',
    rating: 4.9,
    isVerified: true,
  });
  assert.ok(newSrv.id.startsWith('srv_'));
  assert.strictEqual(newSrv.name, 'Sai Carpentry Studio');
  console.log(`✅ [Services Creation] Created custom service: ${newSrv.id}`);
}

async function runLostFoundTests() {
  console.log('\n--- 2. Testing Community: Lost & Found Module ---');

  // Test 1: Fetch list of lost and found posts
  const items = await getLostFoundItems('soc_01');
  assert.ok(Array.isArray(items), 'Items should be an array');
  assert.ok(items.length > 0, 'Should return initial seed posts');
  console.log(`✅ [Lost & Found List] Retrieved ${items.length} community posts`);

  // Test 2: Filter by Type (LOST vs FOUND)
  const lostOnly = await getLostFoundItems('soc_01', { type: 'LOST' });
  assert.ok(lostOnly.every(i => i.type === 'LOST'), 'Should only return LOST posts');
  console.log(`✅ [Lost Filter] ${lostOnly.length} LOST posts retrieved`);

  const foundOnly = await getLostFoundItems('soc_01', { type: 'FOUND' });
  assert.ok(foundOnly.every(i => i.type === 'FOUND'), 'Should only return FOUND posts');
  console.log(`✅ [Found Filter] ${foundOnly.length} FOUND posts retrieved`);

  // Test 3: Create Lost Post
  const testAuthor = 'usr_resident_test_101';
  const newPost = await createLostFoundItem({
    societyId: 'soc_01',
    authorId: testAuthor,
    authorName: 'Aarav Mehta',
    authorFlat: 'Flat B-604',
    authorPhone: '+91 98765 43210',
    type: 'LOST',
    title: 'Silver Titan wrist watch',
    description: 'Lost on jogging track on Saturday morning. Has black leather strap.',
    category: 'Jewelry & Watches',
    location: 'Jogging Track / Garden',
  });
  assert.ok(newPost.id.startsWith('lf_'));
  assert.strictEqual(newPost.status, 'ACTIVE');
  console.log(`✅ [Lost Post Created] ID: ${newPost.id}`);

  // Test 4: Post Detail
  const retrieved = await getLostFoundItemById(newPost.id, 'soc_01');
  assert.ok(retrieved);
  assert.strictEqual(retrieved?.title, 'Silver Titan wrist watch');
  console.log(`✅ [Lost Post Detail] Confirmed title: "${retrieved?.title}"`);

  // Test 5: Authorization - Unauthorized resident CANNOT update status
  const unauthorizedUpdate = await updateLostFoundStatus(
    newPost.id,
    'soc_01',
    'wrong_resident_id',
    'RESOLVED',
    false // not admin
  );
  assert.strictEqual(unauthorizedUpdate, false, 'Unauthorized resident must NOT be able to resolve post');
  console.log('✅ [Authorization Check Passed] Unauthorized resident blocked from modifying post');

  // Test 6: Authorized Author CAN mark post as RESOLVED
  const authorizedUpdate = await updateLostFoundStatus(
    newPost.id,
    'soc_01',
    testAuthor,
    'RESOLVED',
    false
  );
  assert.strictEqual(authorizedUpdate, true, 'Author should be able to resolve their own post');
  console.log('✅ [Status Lifecycle Passed] Author marked post as RESOLVED');

  // Test 7: Authorized Author CAN delete their post
  const deleted = await deleteLostFoundItem(newPost.id, 'soc_01', testAuthor, false);
  assert.strictEqual(deleted, true);
  console.log('✅ [Post Deletion Passed] Author deleted post successfully');
}

async function runEventsTests() {
  console.log('\n--- 3. Testing Community: Events Module ---');

  // Test 1: Fetch Upcoming Events
  const upcoming = await getSocietyEvents('soc_01', 'upcoming');
  assert.ok(Array.isArray(upcoming));
  assert.ok(upcoming.length > 0, 'Should return upcoming events');
  console.log(`✅ [Events List] Retrieved ${upcoming.length} upcoming events`);

  // Test 2: Event Details
  const eventId = upcoming[0].id;
  const detail = await getSocietyEventById(eventId, 'soc_01');
  assert.ok(detail);
  console.log(`✅ [Event Detail] Retrieved event: "${detail?.title}" (Capacity: ${detail?.capacity})`);

  // Test 3: Resident Registration for Event
  const testResident = {
    id: 'usr_resident_test_202',
    name: 'Pooja Kulkarni',
    flat: 'Flat C-102',
    phone: '+91 99200 88888',
    societyId: 'soc_01',
  };

  const regResult = await registerForEvent(eventId, testResident, 2);
  assert.strictEqual(regResult.success, true, 'Registration should succeed');
  assert.ok(regResult.registration);
  assert.strictEqual(regResult.registration?.guestCount, 2);
  console.log(`✅ [Event RSVP] Successfully registered 2 attendees for event`);

  // Test 4: Duplicate Registration Prevention
  const duplicateResult = await registerForEvent(eventId, testResident, 1);
  assert.strictEqual(duplicateResult.success, false, 'Duplicate registration must be rejected');
  assert.strictEqual(duplicateResult.error, 'You are already registered for this event');
  console.log('✅ [Duplicate Guard Passed] Duplicate registration rejected with clear error message');

  // Test 5: Verify event registration status shows registered for this user
  const eventForUser = await getSocietyEventById(eventId, 'soc_01', testResident.id);
  assert.strictEqual(eventForUser?.isRegistered, true);
  assert.strictEqual(eventForUser?.guestCount, 2);
  console.log('✅ [User Event State] Event detail reflects isRegistered = true with guestCount = 2');

  // Test 6: Cancel Registration
  const cancelResult = await cancelEventRegistration(eventId, testResident.id);
  assert.strictEqual(cancelResult, true, 'Cancellation should succeed');
  console.log('✅ [Event Cancellation] Registration cancelled successfully');

  // Verify status is now unregistered
  const eventAfterCancel = await getSocietyEventById(eventId, 'soc_01', testResident.id);
  assert.strictEqual(eventAfterCancel?.isRegistered, false);
  console.log('✅ [User Event State] Event detail reflects isRegistered = false after cancel');
}

async function runAll() {
  console.log('====================================================');
  console.log('🚀 Running Services & Community Automated Test Suite');
  console.log('====================================================');
  try {
    await runServicesTests();
    await runLostFoundTests();
    await runEventsTests();
    console.log('\n====================================================');
    console.log('🎉 ALL BACKEND SERVICES & COMMUNITY TESTS PASSED (100%)');
    console.log('====================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runAll();

