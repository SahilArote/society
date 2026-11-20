import { Router, Response } from 'express';
import multer from 'multer';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';
import { MaintenanceService } from '../modules/maintenance/maintenance.service';
import { uploadVisitorPhoto } from '../services/photoStorageService';
import { sendPushToUser } from '../services/pushNotificationService';
import { getMysqlPool } from '../database/mysql';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ==========================================
// RESIDENT ENDPOINTS
// ==========================================

/**
 * GET /api/resident/maintenance/current-bill
 * Fetch current maintenance bill, breakdown items, society UPI config, and UTR status
 */
router.get(['/current-bill', '/resident/current-bill'], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user?.societyId || 'soc_greengate';
    const residentId = req.user?.id || 'res_sahil';
    const flatId = req.user?.flatId;

    const bill = await MaintenanceService.getResidentCurrentBill(societyId, residentId, flatId);

    return res.json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    console.error('[MAINTENANCE RESIDENT API] Error fetching bill:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch bill' },
    });
  }
});

/**
 * GET /api/resident/maintenance/history
 * Fetch past maintenance invoices and payment receipts for the resident flat
 */
router.get(['/history', '/resident/history'], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const societyId = req.user?.societyId || 'soc_greengate';
    const residentId = req.user?.id || 'res_sahil';
    const flatId = req.user?.flatId;

    const history = await MaintenanceService.getResidentHistory(societyId, residentId, flatId);

    return res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('[MAINTENANCE RESIDENT API] Error fetching history:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch payment history' },
    });
  }
});

/**
 * POST /api/resident/maintenance/submit-payment
 * Resident submits 12-digit UTR with optional payment screenshot
 */
router.post(
  ['/submit-payment', '/resident/submit-payment'],
  authenticateToken,
  upload.single('screenshot'),
  async (req: AuthenticatedRequest, res: Response) => {
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

      let screenshotUrl: string | undefined;

      // Handle optional screenshot upload
      if (req.file) {
        try {
          const uploadResult = await uploadVisitorPhoto(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
          );
          screenshotUrl = uploadResult.photoUrl;
        } catch (uploadErr) {
          console.warn('[MAINTENANCE] Screenshot upload failed, continuing with UTR:', uploadErr);
        }
      }

      const result = await MaintenanceService.submitResidentPayment(
        societyId,
        residentId,
        flatId,
        { invoiceId, utr, screenshotUrl },
        screenshotUrl
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE RESIDENT API] Error submitting UTR:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'SUBMISSION_ERROR', message: error.message || 'Failed to submit payment' },
      });
    }
  }
);

/**
 * POST /api/resident/maintenance/cancel-submission
 * Resident cancels their own pending submission to pay again
 */
router.post(
  ['/cancel-submission', '/resident/cancel-submission'],
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const residentId = req.user?.id || 'res_sahil';
      const { invoiceId } = req.body;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invoice ID is required' },
        });
      }

      const result = await MaintenanceService.cancelResidentSubmission(societyId, residentId, invoiceId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE RESIDENT API] Error cancelling submission:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'CANCEL_ERROR', message: error.message || 'Failed to cancel submission' },
      });
    }
  }
);

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * GET /api/maintenance/overview
 * Top Metric Cards: Collected Nov, Pending check, Unpaid flats, Gateway fees (₹0)
 */
router.get(
  '/overview',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const overview = await MaintenanceService.getAdminOverview(societyId);

      return res.json({
        success: true,
        data: overview,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error fetching overview:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch overview' },
      });
    }
  }
);

/**
 * GET /api/maintenance/verification-queue
 * Admin Verification Queue table
 */
router.get(
  '/verification-queue',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const statusFilter = req.query.status as string;

      const queue = await MaintenanceService.getAdminVerificationQueue(societyId, statusFilter);

      return res.json({
        success: true,
        data: queue,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error fetching queue:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch verification queue' },
      });
    }
  }
);

/**
 * POST /api/maintenance/approve-payment/:id
 * Admin approves UTR payment
 */
router.post(
  '/approve-payment/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const adminId = req.user?.id || 'admin_user';
      const paymentId = req.params.id;

      const result = await MaintenanceService.approvePayment(societyId, adminId, paymentId);

      // Notify resident via push notification
      try {
        const pool = await getMysqlPool();
        if (pool) {
          const [pays]: any = await pool.query(
            'SELECT resident_id, amount FROM maintenance_payments WHERE id = ?',
            [paymentId]
          );
          if (pays[0]?.resident_id) {
            sendPushToUser(pays[0].resident_id, {
              title: 'Maintenance Payment Approved! 🎉',
              body: `Your payment of ₹${pays[0].amount} has been verified by the society admin. Receipt: ${result.receiptNumber}`,
              tag: `pay_approved_${paymentId}`,
            }).catch(() => {});
          }
        }
      } catch (_) {}

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error approving payment:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'APPROVAL_ERROR', message: error.message || 'Failed to approve payment' },
      });
    }
  }
);

/**
 * POST /api/maintenance/reject-payment/:id
 * Admin rejects UTR payment with reason
 */
router.post(
  '/reject-payment/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const adminId = req.user?.id || 'admin_user';
      const paymentId = req.params.id;
      const { reason } = req.body;

      const result = await MaintenanceService.rejectPayment(societyId, adminId, paymentId, reason);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error rejecting payment:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'REJECTION_ERROR', message: error.message || 'Failed to reject payment' },
      });
    }
  }
);

/**
 * GET /api/maintenance/upi-config
 * Fetch current Society Merchant UPI & Bank settings
 */
router.get(
  '/upi-config',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const config = await MaintenanceService.getSocietyUpiConfig(societyId);

      return res.json({
        success: true,
        data: config,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error fetching UPI config:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to fetch UPI config' },
      });
    }
  }
);

/**
 * POST /api/maintenance/set-upi
 * Set or update Society Merchant UPI ID
 */
router.post(
  '/set-upi',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const { merchantVpa, merchantName, bankName, accountNumber, ifscCode } = req.body;

      if (!merchantVpa || !merchantName) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Merchant UPI ID and Payee Name are required' },
        });
      }

      const result = await MaintenanceService.setSocietyUpi(societyId, {
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
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error setting UPI ID:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'CONFIG_ERROR', message: error.message || 'Failed to set UPI ID' },
      });
    }
  }
);

/**
 * POST /api/maintenance/admin/edit-amount
 * Admin updates the maintenance bill amount for a flat / invoice
 */
router.post(
  '/admin/edit-amount',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const { targetId, newAmount, breakdown } = req.body;

      if (!targetId || newAmount === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Target ID (invoice/flat) and newAmount are required' },
        });
      }

      const result = await MaintenanceService.editInvoiceAmount(
        societyId,
        targetId,
        Number(newAmount),
        breakdown
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error updating amount:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message || 'Failed to update bill amount' },
      });
    }
  }
);

/**
 * POST /api/maintenance/admin/reset-payment
 * Admin resets a resident payment back to UNPAID
 */
router.post(
  '/admin/reset-payment',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const { targetId } = req.body; // paymentId, invoiceId, or flatId

      if (!targetId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Target ID (payment/invoice/flat) is required' },
        });
      }

      const result = await MaintenanceService.resetPayment(societyId, targetId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error resetting payment:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'RESET_ERROR', message: error.message || 'Failed to reset payment' },
      });
    }
  }
);

/**
 * POST /api/maintenance/remind-unpaid
 * Send push notification reminder to all residents with unpaid bills
 */
router.post(
  '/remind-unpaid',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const pool = await getMysqlPool();
      let sentCount = 0;

      if (pool) {
        const [unpaidInvs]: any = await pool.query(
          `SELECT DISTINCT inv.resident_id, inv.total_amount, inv.billing_period, f.flat_number
           FROM maintenance_invoices inv
           JOIN flats f ON inv.flat_id = f.id
           WHERE inv.society_id = ? AND inv.status = 'UNPAID' AND inv.resident_id IS NOT NULL`,
          [societyId]
        );

        for (const row of unpaidInvs) {
          sendPushToUser(row.resident_id, {
            title: 'Maintenance Bill Reminder ⏰',
            body: `Gentle reminder: Maintenance bill of ₹${row.total_amount} for Flat ${row.flat_number} (${row.billing_period}) is due. Pay directly via UPI.`,
            tag: `remind_maint_${row.resident_id}`,
          }).catch(() => {});
          sentCount++;
        }
      }

      return res.json({
        success: true,
        data: { sentCount },
        message: `Reminders sent to ${sentCount} unpaid flat(s)`,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error sending reminders:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to send reminders' },
      });
    }
  }
);

/**
 * POST /api/maintenance/admin/mark-paid/:flatId
 * Mark a specific flat's maintenance bill as paid
 */
router.post(
  '/admin/mark-paid/:flatId',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const { flatId } = req.params;
      const pool = await getMysqlPool();
      if (!pool) throw new Error('Database pool unavailable');

      await pool.query(
        `UPDATE maintenance_invoices 
         SET status = 'PAID', paid_amount = total_amount, paid_at = NOW(), updated_at = NOW() 
         WHERE society_id = ? AND flat_id = ? AND status != 'PAID'`,
        [societyId, flatId]
      );

      return res.json({ success: true, message: 'Maintenance marked as paid' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
);

/**
 * POST /api/maintenance/admin/remind-flat/:flatId
 * Send a maintenance reminder to a specific flat resident
 */
router.post(
  '/admin/remind-flat/:flatId',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const { flatId } = req.params;
      const pool = await getMysqlPool();
      if (!pool) throw new Error('Database pool unavailable');

      const [rows]: any = await pool.query(
        `SELECT f.flat_number, f.resident_id, inv.total_amount, inv.billing_period 
         FROM flats f 
         JOIN maintenance_invoices inv ON f.id = inv.flat_id 
         WHERE f.society_id = ? AND f.id = ? LIMIT 1`,
        [societyId, flatId]
      );

      if (rows.length > 0 && rows[0].resident_id) {
        sendPushToUser(rows[0].resident_id, {
          title: 'Maintenance Due Reminder ⏰',
          body: `Dear resident, your maintenance bill of ₹${Number(rows[0].total_amount).toLocaleString('en-IN')} for ${rows[0].billing_period} (Flat ${rows[0].flat_number}) is pending. Please pay via UPI.`,
          data: { type: 'MAINTENANCE_REMINDER', flatNumber: rows[0].flat_number },
        }).catch(() => {});
      }

      return res.json({ success: true, message: 'Reminder dispatched to resident' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
);

/**
 * POST /api/maintenance/upload-statement
 * Upload bank statement CSV to auto-match UTRs
 */
router.post(
  '/upload-statement',
  authenticateToken,
  authorizeRoles('ADMIN'),
  upload.single('statement'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      let csvContent = '';

      if (req.file) {
        csvContent = req.file.buffer.toString('utf8');
      } else if (req.body.csvText) {
        csvContent = req.body.csvText;
      } else {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'CSV file or csvText is required' },
        });
      }

      const result = await MaintenanceService.autoMatchBankStatement(societyId, csvContent);

      return res.json({
        success: true,
        data: result,
        message: `Auto-match complete! Found: ${result.matchedCount}, Short: ${result.shortAmountCount}`,
      });
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error matching bank statement:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'STATEMENT_ERROR', message: error.message || 'Failed to match statement' },
      });
    }
  }
);

/**
 * GET /api/maintenance/export-ledger
 * Export CSV ledger of all payments
 */
router.get(
  '/export-ledger',
  authenticateToken,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const societyId = req.user?.societyId || 'soc_greengate';
      const csv = await MaintenanceService.exportLedgerCsv(societyId);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="maintenance_ledger.csv"');
      return res.send(csv);
    } catch (error: any) {
      console.error('[MAINTENANCE ADMIN API] Error exporting ledger:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: error.message || 'Failed to export ledger' },
      });
    }
  }
);

export default router;

