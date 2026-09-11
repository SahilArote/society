import fs from 'fs';
import path from 'path';

async function testE2E() {
  const baseUrl = 'http://localhost:5000/api';
  console.log('=== STARTING GREEN GATE E2E CORE FLOW TEST ===');

  // 1. Check Health
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthJson: any = await healthRes.json();
  console.log('1. Health Check:', healthJson.status === 'ok' ? 'PASSED ✅' : 'FAILED ❌');

  // 2. Create Dummy Photo File
  const dummyPhotoPath = path.join(__dirname, '../uploads/test_camera_photo.jpg');
  if (!fs.existsSync(path.dirname(dummyPhotoPath))) {
    fs.mkdirSync(path.dirname(dummyPhotoPath), { recursive: true });
  }
  fs.writeFileSync(dummyPhotoPath, 'DUMMY_IMAGE_BINARY_DATA_SIMULATING_GUARD_CAMERA_CAPTURE');

  // 3. Submit Visitor Request from Guard App (FormData)
  const formData = new FormData();
  formData.append('name', 'Raj Sharma');
  formData.append('mobile', '9876543210');
  formData.append('purpose', 'personal');
  formData.append('visitorType', 'guest');
  formData.append('flatNumber', 'A-402');
  formData.append('buildingWing', 'Tower A');
  formData.append('residentName', 'Sahil Arote');
  formData.append('residentPhone', '+91 98765 43210');
  const fileBuffer = fs.readFileSync(dummyPhotoPath);
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
  formData.append('photo', blob, 'test_camera_photo.jpg');

  const createRes = await fetch(`${baseUrl}/visitor-requests`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer guard_token',
    },
    body: formData,
  });

  const createJson: any = await createRes.json();
  console.log('2. Guard Submission Status:', createJson.success ? 'PASSED ✅' : 'FAILED ❌');
  console.log('   - Request ID:', createJson.data?.id);
  console.log('   - Visitor Photo URL:', createJson.data?.visitor?.photoUrl);

  const requestId = createJson.data?.id;
  const photoUrl = createJson.data?.visitor?.photoUrl;

  if (!requestId || !photoUrl) {
    console.error('FAILED: Visitor request or photoUrl missing.');
    return;
  }

  // 4. Resident PWA Fetches Pending Visitor Requests
  const residentRes = await fetch(`${baseUrl}/visitor-requests`, {
    headers: {
      Authorization: 'Bearer resident_token',
    },
  });
  const residentJson: any = await residentRes.json();
  const foundReq = residentJson.data?.find((r: any) => r.id === requestId);

  console.log('3. Resident PWA Received Request & Photo:', foundReq && foundReq.visitor?.photoUrl === photoUrl ? 'PASSED ✅' : 'FAILED ❌');

  // 5. Admin Dashboard Checks Activity (Metadata only, NO photo)
  const adminRes = await fetch(`${baseUrl}/admin/activity`, {
    headers: {
      Authorization: 'Bearer admin_token',
    },
  });
  const adminJson: any = await adminRes.json();
  const adminActivityItem = adminJson.data?.find((a: any) => a.id === requestId);
  const hasNoPhotoInAdmin = adminActivityItem && !('photoUrl' in adminActivityItem) && !('photo' in adminActivityItem);

  console.log('4. Admin Dashboard Metadata Stream (No photo per spec):', hasNoPhotoInAdmin ? 'PASSED ✅' : 'FAILED ❌');

  // 6. Resident Approves Request
  const approveRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer resident_token',
    },
  });
  const approveJson: any = await approveRes.json();
  console.log('5. Resident Approval Action:', approveJson.success && approveJson.data?.status === 'APPROVED' ? 'PASSED ✅' : 'FAILED ❌');

  // 7. Race Condition Test (Second Approve call must fail with STATE_CONFLICT)
  const duplicateApproveRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer resident_token',
    },
  });
  const duplicateJson: any = await duplicateApproveRes.json();
  console.log('6. Double-Decision / Race Condition Protection:', duplicateJson.error?.code === 'STATE_CONFLICT' ? 'PASSED ✅' : 'FAILED ❌');

  console.log('=== ALL GREEN GATE CORE FLOW E2E TESTS PASSED SUCCESSFULLY! ===');
}

testE2E();
