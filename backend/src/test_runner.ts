import http from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { initDb, getDb } from './database/db';
import { initSocketServer } from './services/socketService';
import authRoutes from './routes/auth';
import visitorRequestRoutes from './routes/visitorRequests';
import adminRoutes from './routes/admin';
import directoryRoutes from './routes/directory';
import announcementRoutes from './routes/announcements';
import notificationRoutes from './routes/notifications';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING GREEN GATE BACKEND AUTOMATED TEST SUITE');
  console.log('========================================================');

  const app = express();
  const server = http.createServer(app);

  initDb();
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const uploadDir = path.resolve(__dirname, '../uploads/visitor-photos');
  app.use('/api/uploads/visitor-photos', express.static(uploadDir));

  app.use('/api/auth', authRoutes);
  app.use('/api/visitor-requests', visitorRequestRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/directory', directoryRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/notifications', notificationRoutes);

  initSocketServer(server);

  const port = 5055;
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const baseUrl = `http://localhost:${port}/api`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Guard Authentication by Guard ID and PIN
    const guardLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guardId: 'GRD-8821', pin: '1234' }),
    });
    const guardLoginData: any = await guardLoginRes.json();
    assert(
      guardLoginRes.ok && guardLoginData.success && guardLoginData.data.token && guardLoginData.data.user.role === 'GUARD',
      'Guard login with ID "GRD-8821" and PIN "1234" yields valid JWT'
    );
    const guardToken = guardLoginData.data?.token;

    // 2. Guard Authentication with Wrong PIN fails
    const badGuardRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guardId: 'GRD-8821', pin: '9999' }),
    });
    assert(badGuardRes.status === 401, 'Guard login with invalid PIN correctly returns 401 Unauthorized');

    // 3. Resident Send OTP & Login
    const sendOtpRes = await fetch(`${baseUrl}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9810122334' }),
    });
    const sendOtpData: any = await sendOtpRes.json();
    assert(sendOtpRes.ok && sendOtpData.success, 'Resident send-otp for Flat A-101 (9810122334) succeeds');

    const residentLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9810122334', otp: '123456' }),
    });
    const residentLoginData: any = await residentLoginRes.json();
    assert(
      residentLoginRes.ok && residentLoginData.data.token && residentLoginData.data.user.role === 'RESIDENT',
      'Resident login with mobile and OTP yields valid JWT with flat info'
    );
    const residentToken = residentLoginData.data?.token;

    // 4. Admin Login with password
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@greengate.in', password: 'admin123' }),
    });
    const adminLoginData: any = await adminLoginRes.json();
    assert(
      adminLoginRes.ok && adminLoginData.data.token && adminLoginData.data.user.role === 'ADMIN',
      'Admin login with email and password yields valid JWT'
    );
    const adminToken = adminLoginData.data?.token;

    // 5. Guard Creates Visitor Request for Flat A-101 (Rahul, Delivery) with Photo
    const dummyPhotoPath = path.join(__dirname, '../uploads/visitor-photos/test_photo.jpg');
    fs.mkdirSync(path.dirname(dummyPhotoPath), { recursive: true });
    fs.writeFileSync(dummyPhotoPath, 'DUMMY_BINARY_IMAGE_DATA');

    const formData = new FormData();
    formData.append('name', 'Rahul');
    formData.append('mobile', '9876543210');
    formData.append('purpose', 'delivery');
    formData.append('visitorType', 'delivery');
    formData.append('deliveryCompany', 'Zomato');
    formData.append('flatNumber', 'A-101');
    formData.append('buildingWing', 'Tower A');
    formData.append('residentName', 'Priya Sharma');
    formData.append('residentPhone', '+91 98101 22334');
    const photoBlob = new Blob([fs.readFileSync(dummyPhotoPath)], { type: 'image/jpeg' });
    formData.append('photo', photoBlob, 'rahul_visitor.jpg');

    const createVisitorRes = await fetch(`${baseUrl}/visitor-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${guardToken}` },
      body: formData,
    });
    const createVisitorData: any = await createVisitorRes.json();
    assert(
      createVisitorRes.ok && createVisitorData.success && createVisitorData.data.status === 'PENDING',
      'Guard submits visitor request -> Status is PENDING with photo URL'
    );
    const requestId = createVisitorData.data?.id;

    // 6. Resident Fetches Requests & Sees Photo
    const residentGetRes = await fetch(`${baseUrl}/visitor-requests`, {
      headers: { Authorization: `Bearer ${residentToken}` },
    });
    const residentGetData: any = await residentGetRes.json();
    const targetReq = residentGetData.data?.find((r: any) => r.id === requestId);
    assert(
      targetReq && targetReq.status === 'PENDING' && targetReq.visitor?.name === 'Rahul' && !!targetReq.visitor?.photoUrl,
      'Resident receives PENDING visitor request with photo and flat details'
    );

    // 7. Resident Approves Request
    const approveRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${residentToken}` },
    });
    const approveData: any = await approveRes.json();
    assert(approveRes.ok && approveData.data.status === 'APPROVED', 'Resident APPROVES request -> Status changes to APPROVED');

    // 8. State Machine Protection: Cannot re-approve an already APPROVED request
    const duplicateApproveRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${residentToken}` },
    });
    assert(duplicateApproveRes.status === 400, 'Duplicate approval attempt correctly rejected with 400 STATE_CONFLICT');

    // 9. Guard Completes Visitor Entry
    const completeRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${guardToken}` },
    });
    const completeData: any = await completeRes.json();
    assert(completeRes.ok && completeData.data.status === 'COMPLETED', 'Guard confirms visitor entry -> Status transitions to COMPLETED');

    // 10. State Machine Protection: Cannot reject a COMPLETED request
    const rejectAfterCompleteRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`,
      },
      body: JSON.stringify({ reason: 'Too late' }),
    });
    assert(rejectAfterCompleteRes.status === 400, 'Rejecting a COMPLETED request correctly blocked by state machine');

    // 11. Rejection Flow Test: New request rejected by Resident
    const formData2 = new FormData();
    formData2.append('name', 'Unwanted Visitor');
    formData2.append('flatNumber', 'A-101');
    formData2.append('buildingWing', 'Tower A');
    formData2.append('purpose', 'sales');
    formData2.append('visitorType', 'guest');

    const createVisitor2Res = await fetch(`${baseUrl}/visitor-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${guardToken}` },
      body: formData2,
    });
    const createVisitor2Data: any = await createVisitor2Res.json();
    const requestId2 = createVisitor2Data.data?.id;

    const rejectRes = await fetch(`${baseUrl}/visitor-requests/${requestId2}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`,
      },
      body: JSON.stringify({ reason: 'Did not expect any visitors today' }),
    });
    const rejectData: any = await rejectRes.json();
    assert(
      rejectRes.ok && rejectData.data.status === 'REJECTED' && rejectData.data.rejectionReason === 'Did not expect any visitors today',
      'Resident REJECTS request -> Status changes to REJECTED with reason recorded'
    );

    // 12. State Machine Protection: Cannot complete a REJECTED request
    const completeRejectedRes = await fetch(`${baseUrl}/visitor-requests/${requestId2}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${guardToken}` },
    });
    assert(completeRejectedRes.status === 400, 'Guard attempting to complete a REJECTED request correctly rejected with 400');

    // 13. Admin Activity Privacy: Metadata is present, visitor photo is omitted
    const adminActivityRes = await fetch(`${baseUrl}/admin/activity`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminActivityData: any = await adminActivityRes.json();
    const adminReqItem = adminActivityData.data?.find((item: any) => item.id === requestId);
    assert(
      adminReqItem && !('photoUrl' in adminReqItem) && !('photo' in adminReqItem),
      'Admin activity feed enforces SRS privacy: metadata logged, visitor photo strictly omitted'
    );

    // 14. Directory API Test: Guard wings and flats
    const dirRes = await fetch(`${baseUrl}/directory/wings-flats`, {
      headers: { Authorization: `Bearer ${guardToken}` },
    });
    const dirData: any = await dirRes.json();
    assert(
      dirRes.ok && dirData.data.wings.length > 0 && !!dirData.data.wingFlats['Tower A'],
      'Directory wings-flats returns wings and resident groupings'
    );

    // 15. Announcements API Test
    const annRes = await fetch(`${baseUrl}/announcements`, {
      headers: { Authorization: `Bearer ${residentToken}` },
    });
    const annData: any = await annRes.json();
    assert(annRes.ok && Array.isArray(annData.data) && annData.data.length > 0, 'Announcements endpoint returns active society notices');

    // 16. Admin Directory Flats API Test
    const adminFlatsRes = await fetch(`${baseUrl}/directory/flats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminFlatsData: any = await adminFlatsRes.json();
    assert(
      adminFlatsRes.ok && Array.isArray(adminFlatsData.data) && adminFlatsData.data.some((f: any) => f.flatNumber === 'A-101'),
      'Admin Directory /directory/flats returns registered flats including A-101'
    );

    // 17. Admin Directory Gates API Test
    const adminGatesRes = await fetch(`${baseUrl}/directory/gates`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminGatesData: any = await adminGatesRes.json();
    assert(
      adminGatesRes.ok && Array.isArray(adminGatesData.data) && adminGatesData.data.length >= 2,
      'Admin Directory /directory/gates returns society entry gates'
    );

    // 18. Admin Directory Guards API Test
    const adminGuardsRes = await fetch(`${baseUrl}/directory/guards`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminGuardsData: any = await adminGuardsRes.json();
    assert(
      adminGuardsRes.ok && Array.isArray(adminGuardsData.data) && adminGuardsData.data.some((g: any) => g.name.includes('Singh')),
      'Admin Directory /directory/guards returns active security roster'
    );

    // 19. Admin Creates Announcement & Resident Fetches It
    const postAnnRes = await fetch(`${baseUrl}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Water Tank Cleaning Notice',
        body: 'Scheduled on Saturday 10 AM to 2 PM.',
        priority: 'urgent',
        target: 'all',
      }),
    });
    const postAnnData: any = await postAnnRes.json();
    assert(
      postAnnRes.ok && postAnnData.data?.title === 'Water Tank Cleaning Notice',
      'Admin successfully posts announcement -> Dispatched to residents'
    );

  } catch (err: any) {
    console.error('Unhandled test exception:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
