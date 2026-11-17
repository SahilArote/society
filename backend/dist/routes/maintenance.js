"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const maintenance_service_1 = require("../modules/maintenance/maintenance.service");
const photoStorageService_1 = require("../services/photoStorageService");
const pushNotificationService_1 = require("../services/pushNotificationService");
const mysql_1 = require("../database/mysql");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
// ==========================================
// RESIDENT ENDPOINTS
// ==========================================
/**
 * GET /api/resident/maintenance/current-bill
 * Fetch current maintenance bill, breakdown items, society UPI config, and UTR status
 */
router.get(['/current-bill', '/resident/current-bill'], auth_1.authenticateToken, async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const residentId = req.user?.id || 'res_sahil';
        const flatId = req.user?.flatId;
        const bill = await maintenance_service_1.MaintenanceService.getResidentCurrentBill(societyId, residentId, flatId);
        return res.json({
            success: true,
            data: bill,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE RESIDENT API] Error fetching bill:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch bill' },
        });
    }
});
/**
 * POST /api/resident/maintenance/submit-payment
 * Resident submits 12-digit UTR with optional payment screenshot
 */
router.post(['/submit-payment', '/resident/submit-payment'], auth_1.authenticateToken, upload.single('screenshot'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const residentId = req.user?.id || 'res_sahil';
        const flatId = req.user?.flatId;
        const { invoiceId, utr } = req.body;
        if (!invoiceId || !utr) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invoice ID and 12-digit UTR are required' },
            });
        }
        let screenshotUrl;
        // Handle optional screenshot upload
        if (req.file) {
            try {
                const uploadResult = await (0, photoStorageService_1.uploadVisitorPhoto)(req.file.buffer, req.file.originalname, req.file.mimetype);
                screenshotUrl = uploadResult.photoUrl;
            }
            catch (uploadErr) {
                console.warn('[MAINTENANCE] Screenshot upload failed, continuing with UTR:', uploadErr);
            }
        }
        const result = await maintenance_service_1.MaintenanceService.submitResidentPayment(societyId, residentId, flatId, { invoiceId, utr, screenshotUrl }, screenshotUrl);
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE RESIDENT API] Error submitting UTR:', error);
        return res.status(400).json({
            success: false,
            error: { code: 'SUBMISSION_ERROR', message: error.message || 'Failed to submit payment' },
        });
    }
});
// ==========================================
// ADMIN ENDPOINTS
// ==========================================
/**
 * GET /api/maintenance/overview
 * Top Metric Cards: Collected Nov, Pending check, Unpaid flats, Gateway fees (₹0)
 */
router.get('/overview', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const overview = await maintenance_service_1.MaintenanceService.getAdminOverview(societyId);
        return res.json({
            success: true,
            data: overview,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE ADMIN API] Error fetching overview:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch overview' },
        });
    }
});
/**
 * GET /api/maintenance/verification-queue
 * Admin Verification Queue table
 */
router.get('/verification-queue', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const statusFilter = req.query.status;
        const queue = await maintenance_service_1.MaintenanceService.getAdminVerificationQueue(societyId, statusFilter);
        return res.json({
            success: true,
            data: queue,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE ADMIN API] Error fetching queue:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch verification queue' },
        });
    }
});
/**
 * POST /api/maintenance/approve-payment/:id
 * Admin approves UTR payment
 */
router.post('/approve-payment/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const adminId = req.user?.id || 'admin_user';
        const paymentId = req.params.id;
        const result = await maintenance_service_1.MaintenanceService.approvePayment(societyId, adminId, paymentId);
        // Notify resident via push notification
        try {
            const pool = await (0, mysql_1.getMysqlPool)();
            if (pool) {
                const [pays] = await pool.query('SELECT resident_id, amount FROM maintenance_payments WHERE id = ?', [paymentId]);
                if (pays[0]?.resident_id) {
                    (0, pushNotificationService_1.sendPushToUser)(pays[0].resident_id, {
                        title: 'Maintenance Payment Approved! 🎉',
                        body: `Your payment of ₹${pays[0].amount} has been verified by the society admin. Receipt: ${result.receiptNumber}`,
                        tag: `pay_approved_${paymentId}`,
                    }).catch(() => { });
                }
            }
        }
        catch (_) { }
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE ADMIN API] Error approving payment:', error);
        return res.status(400).json({
            success: false,
            error: { code: 'APPROVAL_ERROR', message: error.message || 'Failed to approve payment' },
        });
    }
});
/**
 * POST /api/maintenance/reject-payment/:id
 * Admin rejects UTR payment with reason
 */
router.post('/reject-payment/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const adminId = req.user?.id || 'admin_user';
        const paymentId = req.params.id;
        const { reason } = req.body;
        const result = await maintenance_service_1.MaintenanceService.rejectPayment(societyId, adminId, paymentId, reason);
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE ADMIN API] Error rejecting payment:', error);
        return res.status(400).json({
            success: false,
            error: { code: 'REJECTION_ERROR', message: error.message || 'Failed to reject payment' },
        });
    }
});
/**
 * POST /api/maintenance/set-upi
 * Set or update Society Merchant UPI ID
 */
router.post('/set-upi', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const { merchantVpa, merchantName, bankName, accountNumber, ifscCode } = req.body;
        if (!merchantVpa || !merchantName) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Merchant UPI ID and Payee Name are required' },
            });
        }
        const result = await maintenance_service_1.MaintenanceService.setSocietyUpi(societyId, {
            merchantVpa,
            merchantName,
            bankName,
            accountNumber,
            ifscCode,
        });
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE ADMIN API] Error setting UPI ID:', error);
        return res.status(400).json({
            success: false,
            error: { code: 'CONFIG_ERROR', message: error.message || 'Failed to set UPI ID' },
        });
    }
});
/**
 * POST /api/maintenance/remind-unpaid
 * Send push notification reminder to all residents with unpaid bills
 */
router.post('/remind-unpaid', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const pool = await (0, mysql_1.getMysqlPool)();
        let sentCount = 0;
        if (pool) {
            const [unpaidInvs] = await pool.query(`SELECT DISTINCT inv.resident_id, inv.total_amount, inv.billing_period, f.flat_number
           FROM maintenance_invoices inv
           JOIN flats f ON inv.flat_id = f.id
           WHERE inv.society_id = ? AND inv.status = 'UNPAID' AND inv.resident_id IS NOT NULL`, [societyId]);
            for (const row of unpaidInvs) {
                (0, pushNotificationService_1.sendPushToUser)(row.resident_id, {
                    title: 'Maintenance Bill Reminder ⏰',
                    body: `Gentle reminder: Maintenance bill of ₹${row.total_amount} for Flat ${row.flat_number} (${row.billing_period}) is due. Pay directly via UPI.`,
                    tag: `remind_maint_${row.resident_id}`,
                }).catch(() => { });
                sentCount++;
            }
        }
        return res.json({
            success: true,
            data: { sentCount },
            message: `Reminders sent to ${sentCount} unpaid flat(s)`,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE ADMIN API] Error sending reminders:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to send reminders' },
        });
    }
});
/**
 * POST /api/maintenance/upload-statement
 * Upload bank statement CSV to auto-match UTRs
 */
router.post('/upload-statement', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), upload.single('statement'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        let csvContent = '';
        if (req.file) {
            csvContent = req.file.buffer.toString('utf8');
        }
        else if (req.body.csvText) {
            csvContent = req.body.csvText;
        }
        else {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'CSV file or csvText is required' },
            });
        }
        const result = await maintenance_service_1.MaintenanceService.autoMatchBankStatement(societyId, csvContent);
        return res.json({
            success: true,
            data: result,
            message: `Auto-match complete! Found: ${result.matchedCount}, Short: ${result.shortAmountCount}`,
        });
    }
    catch (error) {
        console.error('[MAINTENANCE ADMIN API] Error matching bank statement:', error);
        return res.status(400).json({
            success: false,
            error: { code: 'STATEMENT_ERROR', message: error.message || 'Failed to match statement' },
        });
    }
});
/**
 * GET /api/maintenance/export-ledger
 * Export CSV ledger of all payments
 */
router.get('/export-ledger', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('ADMIN'), async (req, res) => {
    try {
        const societyId = req.user?.societyId || 'soc_greengate';
        const csv = await maintenance_service_1.MaintenanceService.exportLedgerCsv(societyId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="maintenance_ledger.csv"');
        return res.send(csv);
    }
    catch (error) {
        console.error('[MAINTENANCE ADMIN API] Error exporting ledger:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message || 'Failed to export ledger' },
        });
    }
});
exports.default = router;
