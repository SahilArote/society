"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const db_1 = require("../database/db");
const mysql_1 = require("../database/mysql");
const auth_1 = require("../middleware/auth");
const subscription_1 = require("../utils/subscription");
const router = (0, express_1.Router)();
// =============================================================
// PUBLIC ENDPOINTS
// =============================================================
// GET /api/public/subdomain/:subdomain
// Auto-detect society branding & UPI details by subdomain
router.get('/public/subdomain/:subdomain', async (req, res) => {
    try {
        const { subdomain } = req.params;
        if (!subdomain) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Subdomain is required' } });
        }
        const society = await (0, db_1.findSocietyBySubdomain)(subdomain);
        if (!society) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found for this subdomain' } });
        }
        return res.json({
            success: true,
            data: {
                id: society.id,
                name: society.name,
                subdomain: society.subdomain,
                city: society.city,
                state: society.state,
                logoUrl: society.logoUrl,
                upiId: society.upiId,
                maintenanceAmount: society.maintenanceAmount,
                status: society.status,
            },
        });
    }
    catch (error) {
        console.error('Error finding society by subdomain:', error);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to look up subdomain' } });
    }
});
// =============================================================
// SUPER ADMIN PROTECTED ENDPOINTS
// =============================================================
// GET /api/super-admin/societies
router.get('/societies', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (_req, res) => {
    try {
        const societies = await (0, db_1.findAllSocietiesWithUsage)();
        return res.json({
            success: true,
            data: societies,
        });
    }
    catch (error) {
        console.error('Error fetching societies list for super admin:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch societies directory' },
        });
    }
});
// GET /api/super-admin/stats
router.get('/stats', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (_req, res) => {
    try {
        const societies = await (0, db_1.findAllSocietiesWithUsage)();
        const totalSocieties = societies.length;
        const activeSocieties = societies.filter((s) => s.status === 'ACTIVE').length;
        const totalDevices = societies.reduce((acc, s) => acc + (s.totalGuards || 0), 0);
        const totalFlats = societies.reduce((acc, s) => acc + (s.totalFlats || 0), 0);
        const totalResidents = societies.reduce((acc, s) => acc + (s.totalResidents || 0), 0);
        let trialCount = 0;
        let graceCount = 0;
        let activePaidCount = 0;
        let suspendedCount = 0;
        const planBreakdown = {
            STANDARD_1_DEVICE: 0,
            PREMIUM_2_DEVICE: 0,
            ENTERPRISE_3_DEVICE: 0,
        };
        for (const s of societies) {
            const plan = (0, subscription_1.normalizePlan)(s.planName, s.maxDevices);
            planBreakdown[plan.code] = (planBreakdown[plan.code] || 0) + 1;
            const subStatus = s.subscription?.status;
            if (subStatus === 'TRIAL')
                trialCount++;
            else if (subStatus === 'GRACE_PERIOD')
                graceCount++;
            else if (subStatus === 'ACTIVE')
                activePaidCount++;
            else if (subStatus === 'SUSPENDED')
                suspendedCount++;
        }
        return res.json({
            success: true,
            data: {
                totalSocieties,
                activeSocieties,
                inactiveSocieties: totalSocieties - activeSocieties,
                trialSocieties: trialCount,
                gracePeriodSocieties: graceCount,
                activePaidSocieties: activePaidCount,
                suspendedSocieties: suspendedCount,
                totalDevices,
                totalFlats,
                totalResidents,
                planBreakdown,
                plans: subscription_1.PLANS_LIST,
            },
        });
    }
    catch (error) {
        console.error('Error fetching super admin stats:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Failed to fetch platform metrics' },
        });
    }
});
// POST /api/super-admin/societies/onboard
router.post('/societies/onboard', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { name, subdomain, address, city, state, pincode, contactEmail, contactPhone, logoUrl, upiId, maintenanceAmount, maintenanceDueDay, planName, maxDevices, billingCycle, 
        // Initial Admin Details
        adminName, adminMobile, adminEmail, adminPassword, 
        // Gate Details
        initialGateName, } = req.body;
        // 1. Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Society name is required' } });
        }
        if (!address || !address.trim()) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Society address is required' } });
        }
        if (!adminName || !adminMobile || !adminPassword) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Admin name, mobile, and password are required' } });
        }
        // Subdomain formatting and check
        let cleanSubdomain = null;
        if (subdomain && subdomain.trim()) {
            const sanitized = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
            if (sanitized.length < 2) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_SUBDOMAIN', message: 'Subdomain must be at least 2 characters (alphanumeric and dashes only)' } });
            }
            const existing = await (0, db_1.findSocietyBySubdomain)(sanitized);
            if (existing) {
                return res.status(409).json({ success: false, error: { code: 'SUBDOMAIN_EXISTS', message: `Subdomain '${sanitized}' is already assigned to another society.` } });
            }
            cleanSubdomain = sanitized;
        }
        // Clean admin mobile
        const cleanAdminMobile = String(adminMobile).replace(/\D/g, '').slice(-10);
        if (cleanAdminMobile.length < 10) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_MOBILE', message: 'Admin mobile must be a valid 10-digit number' } });
        }
        const existingMobileUser = await (0, db_1.findUserByMobile)(cleanAdminMobile);
        if (existingMobileUser) {
            return res.status(409).json({ success: false, error: { code: 'MOBILE_EXISTS', message: `Admin mobile ${cleanAdminMobile} is already registered.` } });
        }
        if (adminEmail && adminEmail.trim()) {
            const existingEmailUser = await (0, db_1.findUserByEmail)(adminEmail.trim().toLowerCase());
            if (existingEmailUser) {
                return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: `Admin email ${adminEmail} is already registered.` } });
            }
        }
        // Plan & Device Limits Resolution (Strictly 3 Canonical Plans)
        const plan = (0, subscription_1.normalizePlan)(planName, maxDevices);
        // 2. Create Society Record with 1-Month Free Trial
        const society = await (0, db_1.createSocietyRecord)({
            name: name.trim(),
            subdomain: cleanSubdomain,
            address: address.trim(),
            city: city?.trim() || null,
            state: state?.trim() || null,
            pincode: pincode?.trim() || null,
            contactEmail: contactEmail?.trim() || null,
            contactPhone: contactPhone?.trim() || null,
            logoUrl: logoUrl?.trim() || null,
            upiId: upiId?.trim() || null,
            maintenanceAmount: Number(maintenanceAmount || 0),
            maintenanceDueDay: Number(maintenanceDueDay || 5),
            planName: plan.code,
            maxDevices: plan.devices,
            planAmount: plan.monthlyPrice,
            billingCycle: billingCycle || 'MONTHLY',
            subscriptionStatus: 'TRIAL',
            status: 'ACTIVE',
        });
        // 3. Database Pool
        const pool = await (0, mysql_1.getMysqlPool)();
        if (!pool)
            throw new Error('Database pool unavailable');
        // 4. Create Default Gate
        const gateName = initialGateName?.trim() || 'Main Gate';
        const gateId = 'gate_' + (0, uuid_1.v4)().replace(/-/g, '').slice(0, 12);
        await pool.query('INSERT INTO gates (id, society_id, name, location, status) VALUES (?, ?, ?, ?, ?)', [gateId, society.id, gateName, 'Primary Society Entrance', 'OPERATIONAL']);
        // 5. Create Initial Society Admin User
        const adminId = 'adm_' + (0, uuid_1.v4)().replace(/-/g, '').slice(0, 12);
        const pwdHash = bcryptjs_1.default.hashSync(String(adminPassword).trim(), 10);
        await pool.query(`
      INSERT INTO users (id, name, mobile, email, password_hash, role, society_id, status)
      VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, 'ACTIVE')
    `, [
            adminId,
            adminName.trim(),
            cleanAdminMobile,
            adminEmail?.trim().toLowerCase() || null,
            pwdHash,
            society.id,
        ]);
        return res.status(201).json({
            success: true,
            message: `Society '${society.name}' onboarded successfully.`,
            data: {
                society: {
                    id: society.id,
                    name: society.name,
                    subdomain: society.subdomain,
                    fullDomain: society.subdomain ? `${society.subdomain}.nexgate.co.in` : null,
                    planName: society.planName,
                    maxDevices: society.maxDevices,
                    upiId: society.upiId,
                    status: society.status,
                },
                admin: {
                    id: adminId,
                    name: adminName.trim(),
                    mobile: cleanAdminMobile,
                    email: adminEmail?.trim().toLowerCase() || null,
                    role: 'ADMIN',
                },
                gate: {
                    id: gateId,
                    name: gateName,
                },
            },
        });
    }
    catch (error) {
        console.error('Error onboarding society:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to onboard society' },
        });
    }
});
// PATCH /api/super-admin/societies/:id/status
router.patch('/societies/:id/status', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
            return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be ACTIVE or INACTIVE' } });
        }
        const updated = await (0, db_1.updateSocietyStatus)(id, status);
        if (!updated) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
        }
        return res.json({
            success: true,
            message: `Society status updated to ${status.toUpperCase()}`,
            data: updated,
        });
    }
    catch (error) {
        console.error('Error toggling society status:', error);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update society status' } });
    }
});
// PUT /api/super-admin/societies/:id
router.put('/societies/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        if (payload.subdomain) {
            payload.subdomain = payload.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
            const existing = await (0, db_1.findSocietyBySubdomain)(payload.subdomain);
            if (existing && existing.id !== id) {
                return res.status(409).json({ success: false, error: { code: 'SUBDOMAIN_EXISTS', message: 'Subdomain already taken' } });
            }
        }
        const updated = await (0, db_1.updateSociety)(id, payload);
        if (!updated) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
        }
        return res.json({
            success: true,
            message: 'Society configuration updated successfully',
            data: updated,
        });
    }
    catch (error) {
        console.error('Error updating society details:', error);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update society' } });
    }
});
// POST /api/super-admin/societies/:id/renew
// Super Admin manually activates / renews a society's subscription
router.post('/societies/:id/renew', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { months = 1, planName, paymentMode = 'UPI', referenceId } = req.body;
        const society = await (0, db_1.findSocietyById)(id);
        if (!society) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
        }
        const plan = (0, subscription_1.normalizePlan)(planName || society.planName, society.maxDevices);
        const pool = await (0, mysql_1.getMysqlPool)();
        if (!pool)
            throw new Error('Database pool unavailable');
        const durationMonths = Number(months) || 1;
        // Extend from current expiration date if it is in the future, else from NOW()
        await pool.query(`
      UPDATE societies
      SET
        subscription_status = 'ACTIVE',
        status = 'ACTIVE',
        plan_name = ?,
        max_devices = ?,
        plan_amount = ?,
        subscription_expires_at = DATE_ADD(
          CASE
            WHEN subscription_expires_at IS NOT NULL AND subscription_expires_at > NOW()
            THEN subscription_expires_at
            ELSE NOW()
          END,
          INTERVAL ? MONTH
        ),
        updated_at = NOW()
      WHERE id = ?
    `, [plan.code, plan.devices, plan.monthlyPrice, durationMonths, id]);
        const updated = await (0, db_1.findSocietyById)(id);
        const subInfo = (0, subscription_1.computeSocietySubscriptionStatus)(updated);
        return res.json({
            success: true,
            message: `Subscription for '${society.name}' successfully recharged for ${durationMonths} month(s) (${plan.name}).`,
            data: {
                ...updated,
                subscription: subInfo,
            },
        });
    }
    catch (error) {
        console.error('Error renewing society subscription:', error);
        return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to renew subscription' } });
    }
});
exports.default = router;
