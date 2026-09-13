import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';

async function testRealtimeSockets() {
  const baseUrl = 'http://localhost:5000/api';
  const socketUrl = 'http://localhost:5000';

  console.log('--- 1. Authenticating Resident & Admin ---');
  // Resident Login
  const resAuth = await fetch(`${baseUrl}/auth/resident/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: '9876543210', otp: '123456' }),
  });
  const resJson: any = await resAuth.json();
  const residentToken = resJson.data.token;

  // Admin Login
  const adminAuth = await fetch(`${baseUrl}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@greengate.in', password: 'admin123' }),
  });
  const adminJson: any = await adminAuth.json();
  const adminToken = adminJson.data.token;

  // Guard Login
  const guardAuth = await fetch(`${baseUrl}/auth/guard/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guardIdOrMobile: 'guard_ramesh', pin: '1234' }),
  });
  const guardJson: any = await guardAuth.json();
  const guardToken = guardJson.data.token;

  console.log('--- 2. Connecting Realtime WebSockets ---');
  const residentSocket = io(socketUrl, { auth: { token: residentToken } });
  const adminSocket = io(socketUrl, { auth: { token: adminToken } });

  let residentGotRequest = false;
  let adminGotRequest = false;
  let residentGotApproval = false;
  let adminGotApproval = false;
  let photoVerifiedInSocket = false;
  let adminHasNoPhotoInSocket = false;

  residentSocket.on('connect', () => console.log('✅ Resident Socket Connected'));
  adminSocket.on('connect', () => console.log('✅ Admin Socket Connected'));

  residentSocket.on('visitor:request_created', (data: any) => {
    console.log('🔔 Resident Socket received visitor:request_created:', data.visitor?.name);
    residentGotRequest = true;
    if (data.visitor?.photoUrl) {
      photoVerifiedInSocket = true;
    }
  });

  adminSocket.on('admin:visitor_activity', (data: any) => {
    console.log('⚡ Admin Socket received admin:visitor_activity:', data.type || data.status, data.visitorName);
    if (data.type === 'NEW_REQUEST' || data.status === 'PENDING') {
      adminGotRequest = true;
      if (!('photo' in data) && !('photoUrl' in data)) {
        adminHasNoPhotoInSocket = true;
      }
    }
    if (data.type === 'APPROVED' || data.status === 'APPROVED') {
      adminGotApproval = true;
    }
  });

  residentSocket.on('visitor:request_updated', (data: any) => {
    console.log('🔄 Resident Socket received visitor:request_updated:', data.status);
    if (data.status === 'APPROVED') {
      residentGotApproval = true;
    }
  });

  // Wait for connections
  await new Promise(r => setTimeout(r, 1200));

  console.log('--- 3. Guard Submitting Visitor Request with Photo ---');
  const dummyPhotoPath = path.join(__dirname, '../uploads/test_guard_photo.jpg');
  const fileBuffer = fs.readFileSync(dummyPhotoPath);
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('name', 'Sunil Deshmukh');
  formData.append('mobile', '9811223344');
  formData.append('purpose', 'delivery');
  formData.append('visitorType', 'delivery');
  formData.append('flatNumber', 'A-402');
  formData.append('buildingWing', 'Tower A');
  formData.append('deliveryCompany', 'Amazon');
  formData.append('photo', blob, 'test_guard_photo.jpg');

  const createRes = await fetch(`${baseUrl}/visitor-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${guardToken}` },
    body: formData,
  });
  const createJson: any = await createRes.json();
  const requestId = createJson.data.id;
  console.log('Created Request ID:', requestId);

  // Wait for socket delivery
  await new Promise(r => setTimeout(r, 1500));

  console.log('--- 4. Resident Approving Visitor Request ---');
  const approveRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${residentToken}` },
  });
  const approveJson: any = await approveRes.json();
  console.log('Approved Request Result:', approveJson.data?.status);

  // Wait for approval socket delivery
  await new Promise(r => setTimeout(r, 1500));

  residentSocket.disconnect();
  adminSocket.disconnect();

  console.log('===========================================================');
  console.log('📊 REALTIME SOCKET VERIFICATION RESULTS:');
  console.log('1. Resident received new request over Socket.IO:', residentGotRequest ? 'PASSED ✅' : 'FAILED ❌');
  console.log('2. Resident request payload includes photoUrl:', photoVerifiedInSocket ? 'PASSED ✅' : 'FAILED ❌');
  console.log('3. Admin received live activity event over Socket.IO:', adminGotRequest ? 'PASSED ✅' : 'FAILED ❌');
  console.log('4. Admin payload strictly contains NO photo data:', adminHasNoPhotoInSocket ? 'PASSED ✅' : 'FAILED ❌');
  console.log('5. Resident received updated approval over Socket.IO:', residentGotApproval ? 'PASSED ✅' : 'FAILED ❌');
  console.log('6. Admin received approved activity event over Socket.IO:', adminGotApproval ? 'PASSED ✅' : 'FAILED ❌');
  console.log('===========================================================');

  if (residentGotRequest && photoVerifiedInSocket && adminGotRequest && adminHasNoPhotoInSocket && residentGotApproval && adminGotApproval) {
    console.log('🎉 ALL REALTIME MULTI-APP SOCKET FLOWS FULLY VERIFIED!');
    process.exit(0);
  } else {
    console.error('❌ SOME SOCKET TESTS FAILED');
    process.exit(1);
  }
}

testRealtimeSockets().catch(err => {
  console.error(err);
  process.exit(1);
});
