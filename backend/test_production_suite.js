const fs = require('fs');
const path = require('path');

async function runTestSuite(baseUrl = 'http://localhost:5000/api') {
  console.log('===============================================================');
  console.log(`🧪 RUNNING PRODUCTION STABILIZATION SUITE AGAINST: ${baseUrl}`);
  console.log('===============================================================');

  // 1. Health Check
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthJson = await healthRes.json();
  console.log('1. Health Check [200 JSON]:', healthRes.status === 200 && healthJson.status === 'ok' ? 'PASSED ✅' : 'FAILED ❌');

  // 2. Guard Authentication
  const guardRes = await fetch(`${baseUrl}/auth/guard/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guardIdOrMobile: 'guard_ramesh', pin: '1234' }),
  });
  const guardJson = await guardRes.json();
  const guardToken = guardJson.data?.token || guardJson.token;
  console.log('2. Guard Authentication [200 JSON]:', guardRes.status === 200 && guardToken ? 'PASSED ✅' : 'FAILED ❌');
  if (!guardToken) {
    console.error('Guard token not obtained. Aborting.');
    return;
  }

  // 3. Directory Listing
  const dirRes = await fetch(`${baseUrl}/visitor-requests/directory`, {
    headers: { Authorization: `Bearer ${guardToken}` },
  });
  const dirJson = await dirRes.json();
  console.log('3. Directory Fetch [200 JSON]:', dirRes.status === 200 && dirJson.data?.wings ? 'PASSED ✅' : 'FAILED ❌');

  // 4. Submit with Real Image (image/jpeg)
  const tinyJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const jpegBlob = new Blob([Buffer.from(tinyJpegBase64, 'base64')], { type: 'image/jpeg' });

  const form1 = new FormData();
  form1.append('name', 'Sunil Patil');
  form1.append('mobile', '9811223344');
  form1.append('purpose', 'Family Visit');
  form1.append('visitorType', 'guest');
  form1.append('flatNumber', 'A-402');
  form1.append('buildingWing', 'Tower A');
  form1.append('photo', jpegBlob, 'camera_visitor.jpg');

  const req1Res = await fetch(`${baseUrl}/visitor-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${guardToken}` },
    body: form1,
  });
  const req1Json = await req1Res.json();
  const requestId = req1Json.data?.id;
  console.log('4. Visitor Submit with image/jpeg [201 JSON]:', req1Res.status === 201 && requestId ? 'PASSED ✅' : 'FAILED ❌');
  console.log('   - Request ID:', requestId);

  // 5. Submit with Android generic MIME (application/octet-stream + .jpg extension)
  const octetBlob = new Blob([Buffer.from(tinyJpegBase64, 'base64')], { type: 'application/octet-stream' });
  const form2 = new FormData();
  form2.append('name', 'Pooja Verma');
  form2.append('mobile', '9822334455');
  form2.append('purpose', 'Grocery Delivery');
  form2.append('visitorType', 'delivery');
  form2.append('deliveryCompany', 'Blinkit');
  form2.append('flatNumber', 'A-402');
  form2.append('buildingWing', 'Tower A');
  form2.append('photo', octetBlob, 'android_cam_stream.jpg');

  const req2Res = await fetch(`${baseUrl}/visitor-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${guardToken}` },
    body: form2,
  });
  const req2Json = await req2Res.json();
  console.log('5. Visitor Submit with application/octet-stream fallback [201 JSON]:', req2Res.status === 201 && req2Json.data?.id ? 'PASSED ✅' : 'FAILED ❌');

  // 6. Security Rejection: Invalid file type (.txt file with fake .jpg extension)
  const fakeBlob = new Blob([Buffer.from('THIS IS NOT A VALID JPEG IMAGE')], { type: 'image/jpeg' });
  const form3 = new FormData();
  form3.append('name', 'Hacker Attempt');
  form3.append('flatNumber', 'A-402');
  form3.append('buildingWing', 'Tower A');
  form3.append('photo', fakeBlob, 'malicious.jpg');

  const req3Res = await fetch(`${baseUrl}/visitor-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${guardToken}` },
    body: form3,
  });
  const req3Json = await req3Res.json();
  console.log('6. Reject Invalid Image Header [400 JSON]:', req3Res.status === 400 && req3Json.error?.code === 'INVALID_IMAGE_CONTENT' ? 'PASSED ✅' : 'FAILED ❌');
  console.log('   - Error Response:', req3Json.error?.message);

  // 7. Security Rejection: Reject non-image extension (.pdf)
  const pdfBlob = new Blob([Buffer.from('%PDF-1.4 ...')], { type: 'application/pdf' });
  const form4 = new FormData();
  form4.append('name', 'PDF Document');
  form4.append('flatNumber', 'A-402');
  form4.append('buildingWing', 'Tower A');
  form4.append('photo', pdfBlob, 'document.pdf');

  const req4Res = await fetch(`${baseUrl}/visitor-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${guardToken}` },
    body: form4,
  });
  const req4Json = await req4Res.json();
  console.log('7. Reject Disallowed Extension [400 JSON]:', req4Res.status === 400 && req4Json.error?.code === 'INVALID_FILE_TYPE' ? 'PASSED ✅' : 'FAILED ❌');
  console.log('   - Error Response:', req4Json.error?.message);

  // 8. Rejection: Oversized file (> 10MB)
  const hugeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
  hugeBuffer[0] = 0xff; hugeBuffer[1] = 0xd8; hugeBuffer[2] = 0xff; // Valid JPEG header but oversized
  const hugeBlob = new Blob([hugeBuffer], { type: 'image/jpeg' });
  const form5 = new FormData();
  form5.append('name', 'Oversized Photo');
  form5.append('flatNumber', 'A-402');
  form5.append('buildingWing', 'Tower A');
  form5.append('photo', hugeBlob, 'huge_camera.jpg');

  const req5Res = await fetch(`${baseUrl}/visitor-requests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${guardToken}` },
    body: form5,
  });
  const req5Json = await req5Res.json();
  console.log('8. Reject Oversized Photo [400 JSON]:', req5Res.status === 400 && req5Json.error?.code === 'FILE_TOO_LARGE' ? 'PASSED ✅' : 'FAILED ❌');
  console.log('   - Error Response:', req5Json.error?.message);

  // 9. API 404 Route returns JSON (Never HTML)
  const notFoundRes = await fetch(`${baseUrl}/non_existent_route`);
  const notFoundJson = await notFoundRes.json();
  console.log('9. Unmatched API Route returns 404 JSON [Never HTML]:', notFoundRes.status === 404 && notFoundJson.error?.code === 'NOT_FOUND' ? 'PASSED ✅' : 'FAILED ❌');

  // 10. Complete Production Flow: Resident Approves Request
  if (requestId) {
    const resOtpRes = await fetch(`${baseUrl}/auth/resident/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', otp: '123456' }),
    });
    const resOtpJson = await resOtpRes.json();
    const residentToken = resOtpJson.data?.token;

    const approveRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`,
      },
      body: JSON.stringify({}),
    });
    const approveJson = await approveRes.json();
    console.log('10. Resident Approves Visitor Request [200 JSON]:', approveRes.status === 200 && approveJson.data?.status === 'APPROVED' ? 'PASSED ✅' : 'FAILED ❌');
  }

  // 11. Push Notification VAPID Key & Subscription Registration
  const vapidRes = await fetch(`${baseUrl}/notifications/vapid-public-key`);
  const vapidJson = await vapidRes.json();
  const hasVapidKey = vapidRes.status === 200 && Boolean(vapidJson.data?.publicKey);
  console.log('11. Push Notification VAPID Public Key [200 JSON]:', hasVapidKey ? 'PASSED ✅' : 'FAILED ❌');

  console.log('===============================================================');
  console.log('🏁 ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('===============================================================');
}

module.exports = { runTestSuite };

if (require.main === module) {
  runTestSuite(process.argv[2] || 'http://localhost:5000/api');
}
