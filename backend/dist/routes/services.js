"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../database/db");
const router = (0, express_1.Router)();
// GET /api/resident/services
// Returns verified society services filtered by type (vendors, utilities, staff), category, and search query
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN', 'GUARD'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_01';
        const { type, category, search } = req.query;
        const services = await (0, db_1.getSocietyServices)(societyId, {
            type: type ? String(type) : undefined,
            category: category ? String(category) : undefined,
            search: search ? String(search) : undefined,
        });
        return res.json({
            success: true,
            data: services,
        });
    }
    catch (error) {
        console.error('[SERVICES API] Error fetching services:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch society services' },
        });
    }
});
// GET /api/resident/services/:id
router.get('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('RESIDENT', 'ADMIN', 'GUARD'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_01';
        const { id } = req.params;
        const service = await (0, db_1.getSocietyServiceById)(id, societyId);
        if (!service) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Service not found' },
            });
        }
        return res.json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        console.error('[SERVICES API] Error fetching service detail:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch service detail' },
        });
    }
});
// POST /api/resident/services (Admin / Authorized Creation)
router.post('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_01';
        const { name, category, serviceType, providerName, phone, alternatePhone, address, description, timing, rating, isVerified } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Service name is required' },
            });
        }
        if (!category || !category.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Category is required' },
            });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Contact phone number is required' },
            });
        }
        const service = await (0, db_1.createSocietyService)({
            societyId,
            name: name.trim(),
            category: category.trim(),
            serviceType: serviceType || 'VENDOR',
            providerName,
            phone: phone.trim(),
            alternatePhone,
            address,
            description,
            timing,
            rating: rating !== undefined ? parseFloat(rating) : 4.5,
            isVerified: isVerified !== undefined ? Boolean(isVerified) : true,
        });
        return res.status(201).json({
            success: true,
            message: 'Society service added successfully',
            data: service,
        });
    }
    catch (error) {
        console.error('[SERVICES API] Error creating service:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to create service' },
        });
    }
});
// DELETE /api/resident/services/:id (Admin delete service)
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_01';
        const { id } = req.params;
        const deleted = await (0, db_1.deleteSocietyService)(id, societyId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Service not found' },
            });
        }
        return res.json({
            success: true,
            message: 'Society service deleted successfully',
        });
    }
    catch (error) {
        console.error('[SERVICES API] Error deleting service:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to delete service' },
        });
    }
});
exports.default = router;
