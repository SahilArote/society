"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../database/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/directory/wings-flats
// Returns wings and flats grouped for Guard App and Admin
router.get('/wings-flats', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const societyId = req.user?.societyId || 'soc_greengate';
    const flats = db.flats.filter((f) => f.societyId === societyId);
    const wingsSet = new Set();
    const wingFlats = {};
    for (const flat of flats) {
        wingsSet.add(flat.wing);
        if (!wingFlats[flat.wing]) {
            wingFlats[flat.wing] = [];
        }
        const resident = db.users.find((u) => u.id === flat.residentId);
        wingFlats[flat.wing].push({
            id: flat.id,
            flatNumber: flat.flatNumber,
            buildingWing: flat.wing,
            floor: `${flat.floor}${flat.floor === 1 ? 'st' : flat.floor === 2 ? 'nd' : flat.floor === 3 ? 'rd' : 'th'} Floor`,
            residents: resident
                ? [
                    {
                        id: resident.id,
                        name: resident.name,
                        phoneNumber: resident.mobile,
                        flatNumber: flat.flatNumber,
                        buildingWing: flat.wing,
                    },
                ]
                : [],
        });
    }
    return res.json({
        success: true,
        data: {
            wings: Array.from(wingsSet),
            wingFlats,
        },
    });
});
// GET /api/directory/flats
// Flat directory with resident details for Admin & Resident PWA
router.get('/flats', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const societyId = req.user?.societyId || 'soc_greengate';
    const flats = db.flats.filter((f) => f.societyId === societyId).map((flat) => {
        const resident = db.users.find((u) => u.id === flat.residentId);
        return {
            id: flat.id,
            number: flat.flatNumber,
            flatNumber: flat.flatNumber,
            wing: flat.wing.replace(/Tower\s*/i, ''),
            floor: flat.floor,
            type: '2BHK',
            status: resident ? 'occupied' : 'vacant',
            residents: resident
                ? [
                    {
                        id: resident.id,
                        name: resident.name,
                        phone: resident.mobile,
                        email: resident.email,
                        role: 'owner',
                        isOwner: true,
                    },
                ]
                : [],
            vehicleCount: 1,
            maintenanceStatus: 'paid',
        };
    });
    return res.json({
        success: true,
        data: flats,
    });
});
// GET /api/directory/gates
// Gate list with guard status for Admin
router.get('/gates', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const societyId = req.user?.societyId || 'soc_greengate';
    const gates = db.gates.filter((g) => g.societyId === societyId).map((gate) => {
        const guardRecord = db.guards.find((gr) => gr.gateId === gate.id);
        const guardUser = guardRecord ? db.users.find((u) => u.id === guardRecord.userId) : null;
        const visitorsToday = db.visitorRequests.filter((r) => r.gateId === gate.id).length;
        return {
            id: gate.id,
            name: gate.name,
            location: gate.location,
            status: gate.status.toLowerCase(),
            currentGuardId: guardRecord?.id || null,
            guardName: guardUser?.name || 'Unassigned',
            shift: guardRecord?.shift || 'none',
            visitorsToday,
        };
    });
    return res.json({
        success: true,
        data: gates,
    });
});
// GET /api/directory/guards
router.get('/guards', auth_1.authenticateToken, (req, res) => {
    const db = (0, db_1.getDb)();
    const societyId = req.user?.societyId || 'soc_greengate';
    const guards = db.guards.map((g) => {
        const user = db.users.find((u) => u.id === g.userId);
        const gate = db.gates.find((gt) => gt.id === g.gateId);
        return {
            id: g.id,
            userId: g.userId,
            name: user?.name || 'Security Officer',
            phone: user?.mobile || '',
            badgeNumber: user?.guardBadgeNumber || 'GG-SEC-8821',
            assignedGate: gate?.name || 'Main Gate',
            shift: g.shift,
            status: g.status.toLowerCase(),
        };
    });
    return res.json({
        success: true,
        data: guards,
    });
});
exports.default = router;
