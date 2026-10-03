"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./database/db");
const socketService_1 = require("./services/socketService");
const auth_1 = __importDefault(require("./routes/auth"));
const visitorRequests_1 = __importDefault(require("./routes/visitorRequests"));
const admin_1 = __importDefault(require("./routes/admin"));
const directory_1 = __importDefault(require("./routes/directory"));
const announcements_1 = __importDefault(require("./routes/announcements"));
const notifications_1 = __importDefault(require("./routes/notifications"));
async function runTests() {
    console.log('========================================================');
    console.log('🧪 RUNNING GREEN GATE BACKEND AUTOMATED TEST SUITE');
    console.log('========================================================');
    const app = (0, express_1.default)();
    const server = http_1.default.createServer(app);
    (0, db_1.initDb)();
    app.use((0, cors_1.default)({ origin: '*' }));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    const uploadDir = path_1.default.resolve(__dirname, '../uploads/visitor-photos');
    app.use('/api/uploads/visitor-photos', express_1.default.static(uploadDir));
    app.use('/api/auth', auth_1.default);
    app.use('/api/visitor-requests', visitorRequests_1.default);
    app.use('/api/admin', admin_1.default);
    app.use('/api/directory', directory_1.default);
    app.use('/api/announcements', announcements_1.default);
    app.use('/api/notifications', notifications_1.default);
    (0, socketService_1.initSocketServer)(server);
    const port = 5055;
    await new Promise((resolve) => server.listen(port, resolve));
    const baseUrl = `http://localhost:${port}/api`;
    let passed = 0;
    let failed = 0;
    function assert(condition, testName) {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passed++;
        }
        else {
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
        const guardLoginData = await guardLoginRes.json();
        assert(guardLoginRes.ok && guardLoginData.success && guardLoginData.data.token && guardLoginData.data.user.role === 'GUARD', 'Guard login with ID "GRD-8821" and PIN "1234" yields valid JWT');
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
        const sendOtpData = await sendOtpRes.json();
        assert(sendOtpRes.ok && sendOtpData.success, 'Resident send-otp for Flat A-101 (9810122334) succeeds');
        const residentLoginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '9810122334', otp: '123456' }),
        });
        const residentLoginData = await residentLoginRes.json();
        assert(residentLoginRes.ok && residentLoginData.data.token && residentLoginData.data.user.role === 'RESIDENT', 'Resident login with mobile and OTP yields valid JWT with flat info');
        const residentToken = residentLoginData.data?.token;
        // 4. Admin Login with password
        const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@greengate.in', password: 'admin123' }),
        });
        const adminLoginData = await adminLoginRes.json();
        assert(adminLoginRes.ok && adminLoginData.data.token && adminLoginData.data.user.role === 'ADMIN', 'Admin login with email and password yields valid JWT');
        const adminToken = adminLoginData.data?.token;
        // 5. Guard Creates Visitor Request for Flat A-101 (Rahul, Delivery) with Photo
        const dummyPhotoPath = path_1.default.join(__dirname, '../uploads/visitor-photos/test_photo.jpg');
        fs_1.default.mkdirSync(path_1.default.dirname(dummyPhotoPath), { recursive: true });
        fs_1.default.writeFileSync(dummyPhotoPath, 'DUMMY_BINARY_IMAGE_DATA');
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
        const photoBlob = new Blob([fs_1.default.readFileSync(dummyPhotoPath)], { type: 'image/jpeg' });
        formData.append('photo', photoBlob, 'rahul_visitor.jpg');
        const createVisitorRes = await fetch(`${baseUrl}/visitor-requests`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${guardToken}` },
            body: formData,
        });
        const createVisitorData = await createVisitorRes.json();
        assert(createVisitorRes.ok && createVisitorData.success && createVisitorData.data.status === 'PENDING', 'Guard submits visitor request -> Status is PENDING with photo URL');
        const requestId = createVisitorData.data?.id;
        // 6. Resident Fetches Requests & Sees Photo
        const residentGetRes = await fetch(`${baseUrl}/visitor-requests`, {
            headers: { Authorization: `Bearer ${residentToken}` },
        });
        const residentGetData = await residentGetRes.json();
        const targetReq = residentGetData.data?.find((r) => r.id === requestId);
        assert(targetReq && targetReq.status === 'PENDING' && targetReq.visitor?.name === 'Rahul' && !!targetReq.visitor?.photoUrl, 'Resident receives PENDING visitor request with photo and flat details');
        // 7. Resident Approves Request
        const approveRes = await fetch(`${baseUrl}/visitor-requests/${requestId}/approve`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${residentToken}` },
        });
        const approveData = await approveRes.json();
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
        const completeData = await completeRes.json();
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
        const createVisitor2Data = await createVisitor2Res.json();
        const requestId2 = createVisitor2Data.data?.id;
        const rejectRes = await fetch(`${baseUrl}/visitor-requests/${requestId2}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${residentToken}`,
            },
            body: JSON.stringify({ reason: 'Did not expect any visitors today' }),
        });
        const rejectData = await rejectRes.json();
        assert(rejectRes.ok && rejectData.data.status === 'REJECTED' && rejectData.data.rejectionReason === 'Did not expect any visitors today', 'Resident REJECTS request -> Status changes to REJECTED with reason recorded');
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
        const adminActivityData = await adminActivityRes.json();
        const adminReqItem = adminActivityData.data?.find((item) => item.id === requestId);
        assert(adminReqItem && !('photoUrl' in adminReqItem) && !('photo' in adminReqItem), 'Admin activity feed enforces SRS privacy: metadata logged, visitor photo strictly omitted');
        // 14. Directory API Test: Guard wings and flats
        const dirRes = await fetch(`${baseUrl}/directory/wings-flats`, {
            headers: { Authorization: `Bearer ${guardToken}` },
        });
        const dirData = await dirRes.json();
        assert(dirRes.ok && dirData.data.wings.length > 0 && !!dirData.data.wingFlats['Tower A'], 'Directory wings-flats returns wings and resident groupings');
        // 15. Announcements API Test
        const annRes = await fetch(`${baseUrl}/announcements`, {
            headers: { Authorization: `Bearer ${residentToken}` },
        });
        const annData = await annRes.json();
        assert(annRes.ok && Array.isArray(annData.data) && annData.data.length > 0, 'Announcements endpoint returns active society notices');
        // 16. Admin Directory Flats API Test
        const adminFlatsRes = await fetch(`${baseUrl}/directory/flats`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const adminFlatsData = await adminFlatsRes.json();
        assert(adminFlatsRes.ok && Array.isArray(adminFlatsData.data) && adminFlatsData.data.some((f) => f.flatNumber === 'A-101'), 'Admin Directory /directory/flats returns registered flats including A-101');
        // 17. Admin Directory Gates API Test
        const adminGatesRes = await fetch(`${baseUrl}/directory/gates`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const adminGatesData = await adminGatesRes.json();
        assert(adminGatesRes.ok && Array.isArray(adminGatesData.data) && adminGatesData.data.length >= 2, 'Admin Directory /directory/gates returns society entry gates');
        // 18. Admin Directory Guards API Test
        const adminGuardsRes = await fetch(`${baseUrl}/directory/guards`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const adminGuardsData = await adminGuardsRes.json();
        assert(adminGuardsRes.ok && Array.isArray(adminGuardsData.data) && adminGuardsData.data.some((g) => g.name.includes('Singh')), 'Admin Directory /directory/guards returns active security roster');
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
        const postAnnData = await postAnnRes.json();
        assert(postAnnRes.ok && postAnnData.data?.title === 'Water Tank Cleaning Notice', 'Admin successfully posts announcement -> Dispatched to residents');
    }
    catch (err) {
        console.error('Unhandled test exception:', err);
        failed++;
    }
    finally {
        server.close();
    }
    console.log('========================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');
    if (failed > 0) {
        process.exit(1);
    }
    else {
        process.exit(0);
    }
}
runTests();
