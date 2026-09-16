"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../database/db");
const mysql_1 = require("../database/mysql");
const router = (0, express_1.Router)();
// Helper to find resident's flat_id
async function getResidentFlatId(residentId, societyId) {
    const pool = await (0, mysql_1.getMysqlPool)();
    if (!pool)
        return null;
    try {
        const [rows] = await pool.query('SELECT id FROM flats WHERE resident_id = ? AND society_id = ? LIMIT 1', [residentId, societyId]);
        return rows && rows.length > 0 ? rows[0].id : null;
    }
    catch (err) {
        return null;
    }
}
// =============================================================
// FAMILY MEMBERS ENDPOINTS
// =============================================================
// GET /api/resident/family-members
router.get('/family-members', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN'), async (req, res) => {
    try {
        const residentId = req.user.id;
        const societyId = req.user.societyId;
        const members = await (0, db_1.findFamilyMembersByResident)(residentId, societyId);
        return res.json({
            success: true,
            data: members,
        });
    }
    catch (error) {
        console.error('Error fetching family members:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch family members' },
        });
    }
});
// POST /api/resident/family-members
router.post('/family-members', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN'), async (req, res) => {
    try {
        const residentId = req.user.id;
        const societyId = req.user.societyId;
        const { name, relationship, phone } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Name is required' },
            });
        }
        if (!relationship || !relationship.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Relationship is required' },
            });
        }
        const flatId = await getResidentFlatId(residentId, societyId);
        const member = await (0, db_1.createFamilyMember)({
            societyId,
            residentId,
            flatId: flatId || undefined,
            name: name.trim(),
            relationship: relationship.trim().toLowerCase(),
            phone: phone ? phone.trim() : undefined,
        });
        return res.status(201).json({
            success: true,
            message: 'Family member added successfully',
            data: member,
        });
    }
    catch (error) {
        console.error('Error adding family member:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to add family member' },
        });
    }
});
// DELETE /api/resident/family-members/:id
router.delete('/family-members/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN'), async (req, res) => {
    try {
        const residentId = req.user.id;
        const { id } = req.params;
        const ok = await (0, db_1.deleteFamilyMember)(id, residentId);
        if (!ok) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Family member not found' },
            });
        }
        return res.json({
            success: true,
            message: 'Family member removed successfully',
        });
    }
    catch (error) {
        console.error('Error deleting family member:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to delete family member' },
        });
    }
});
// =============================================================
// VEHICLES ENDPOINTS
// =============================================================
// GET /api/resident/vehicles
router.get('/vehicles', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN'), async (req, res) => {
    try {
        const residentId = req.user.id;
        const societyId = req.user.societyId;
        const vehicles = await (0, db_1.findVehiclesByResident)(residentId, societyId);
        return res.json({
            success: true,
            data: vehicles,
        });
    }
    catch (error) {
        console.error('Error fetching vehicles:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch vehicles' },
        });
    }
});
// POST /api/resident/vehicles
router.post('/vehicles', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN'), async (req, res) => {
    try {
        const residentId = req.user.id;
        const societyId = req.user.societyId;
        const { number, type, brand, model, color } = req.body;
        if (!number || !number.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Vehicle number is required' },
            });
        }
        const flatId = await getResidentFlatId(residentId, societyId);
        const vehicle = await (0, db_1.createVehicle)({
            societyId,
            residentId,
            flatId: flatId || undefined,
            vehicleNumber: number.trim().toUpperCase(),
            type: type ? type.trim().toLowerCase() : 'car',
            brand: brand ? brand.trim() : '',
            model: model ? model.trim() : '',
            color: color ? color.trim() : '#000000',
        });
        return res.status(201).json({
            success: true,
            message: 'Vehicle registered successfully',
            data: vehicle,
        });
    }
    catch (error) {
        console.error('Error adding vehicle:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to register vehicle' },
        });
    }
});
// DELETE /api/resident/vehicles/:id
router.delete('/vehicles/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN'), async (req, res) => {
    try {
        const residentId = req.user.id;
        const { id } = req.params;
        const ok = await (0, db_1.deleteVehicle)(id, residentId);
        if (!ok) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Vehicle record not found' },
            });
        }
        return res.json({
            success: true,
            message: 'Vehicle removed successfully',
        });
    }
    catch (error) {
        console.error('Error deleting vehicle:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to delete vehicle' },
        });
    }
});
exports.default = router;
