import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getMysqlPool } from '../../database/mysql';
import {
  ResidentBillResponse,
  VerificationQueueItem,
  AdminMaintenanceOverview,
  SubmitPaymentInput,
  SetSocietyUpiInput,
  BreakdownItem,
  InvoiceStatus,
  BankMatchStatus,
} from './maintenance.types';

export class MaintenanceService {
  /**
   * Format currency for display (e.g. ₹3.1L or ₹2,500)
   */
  static formatLakhs(amount: number): string {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  /**
   * Fetch or auto-seed society payment config
   */
  static async getSocietyPaymentConfig(societyId: string) {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    const [configs]: any = await pool.query(
      'SELECT * FROM society_payment_configs WHERE society_id = ? LIMIT 1',
      [societyId]
    );

    if (configs.length > 0) {
      return configs[0];
    }

    // Auto-create default merchant UPI if not set yet
    const [socRows]: any = await pool.query('SELECT name FROM societies WHERE id = ?', [societyId]);
    const societyName = socRows[0]?.name || 'Eco Residency CHS';
    const id = `spc_${uuidv4().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO society_payment_configs (
        id, society_id, merchant_vpa, merchant_name, bank_name, account_number_masked, ifsc_code
      ) VALUES (?, ?, 'ecoresidency@icici', ?, 'ICICI Bank', '•••• •••• •••• 4589', 'ICIC0001234')`,
      [id, societyId, societyName]
    );

    const [created]: any = await pool.query(
      'SELECT * FROM society_payment_configs WHERE id = ?',
      [id]
    );
    return created[0];
  }

  /**
   * RESIDENT: Fetch current maintenance bill with breakdown and UPI Intent URI
   */
  static async getResidentCurrentBill(
    societyId: string,
    residentId: string,
    flatId?: string
  ): Promise<ResidentBillResponse> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    const config = await this.getSocietyPaymentConfig(societyId);

    // 1. Resolve flat
    let targetFlatId = flatId;
    if (!targetFlatId) {
      const [flats]: any = await pool.query(
        'SELECT id, flat_number, wing FROM flats WHERE (resident_id = ? OR id = ?) AND society_id = ? LIMIT 1',
        [residentId, residentId, societyId]
      );
      if (flats.length > 0) {
        targetFlatId = flats[0].id;
      }
    }

    if (!targetFlatId) {
      // Fallback to first flat in society
      const [firstFlat]: any = await pool.query(
        'SELECT id FROM flats WHERE society_id = ? ORDER BY flat_number ASC LIMIT 1',
        [societyId]
      );
      targetFlatId = firstFlat[0]?.id || 'flat_a101';
    }

    // 2. Fetch society details
    const [socRows]: any = await pool.query(
      'SELECT name FROM societies WHERE id = ?',
      [societyId]
    );
    const societyName = socRows[0]?.name || config.merchant_name || 'Green Valley CHS';

    // 3. Fetch flat details
    const [flatRows]: any = await pool.query(
      'SELECT flat_number, wing FROM flats WHERE id = ?',
      [targetFlatId]
    );
    const flatNumber = flatRows[0]?.flat_number || 'A-101';
    const wing = flatRows[0]?.wing || 'Wing A';

    // 4. Fetch latest invoice for this flat
    let [invoices]: any = await pool.query(
      `SELECT * FROM maintenance_invoices 
       WHERE society_id = ? AND flat_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [societyId, targetFlatId]
    );

    let inv = invoices[0];

    // If no invoice exists, auto-seed default invoice (e.g. Nov 2026 ₹2,500)
    if (!inv) {
      const invId = `inv_${uuidv4().slice(0, 8)}`;
      const cleanFlatNum = flatNumber.replace(/[^a-zA-Z0-9]/g, '');
      const refId = `NXG-${cleanFlatNum}-112026`;
      const breakdown = [
        { title: 'Maintenance', amount: 2000 },
        { title: 'Sinking fund', amount: 300 },
        { title: 'Parking', amount: 200 },
      ];

      await pool.query(
        `INSERT INTO maintenance_invoices (
          id, society_id, flat_id, resident_id, invoice_number,
          billing_period, due_date, total_amount, paid_amount, status,
          breakdown_json, reference_id
        ) VALUES (?, ?, ?, ?, ?, 'Nov 2026', '2026-12-10', 2500.00, 0.00, 'UNPAID', ?, ?)`,
        [
          invId,
          societyId,
          targetFlatId,
          residentId,
          `INV-2026-11-${cleanFlatNum}`,
          JSON.stringify(breakdown),
          refId,
        ]
      );

      const [newInvs]: any = await pool.query(
        'SELECT * FROM maintenance_invoices WHERE id = ?',
        [invId]
      );
      inv = newInvs[0];
    }

    // 5. Check if there is an active payment submission for this invoice
    const [payments]: any = await pool.query(
      `SELECT * FROM maintenance_payments 
       WHERE invoice_id = ? ORDER BY submitted_at DESC LIMIT 1`,
      [inv.id]
    );
    const latestPayment = payments[0];

    // Parse breakdown items
    let breakdown: BreakdownItem[] = [];
    try {
      breakdown =
        typeof inv.breakdown_json === 'string'
          ? JSON.parse(inv.breakdown_json)
          : inv.breakdown_json || [];
    } catch (_) {
      breakdown = [
        { title: 'Maintenance', amount: 2000 },
        { title: 'Sinking fund', amount: 300 },
        { title: 'Parking', amount: 200 },
      ];
    }

    // 6. Generate Direct NPCI UPI Intent URI
    const amountVal = Number(inv.total_amount).toFixed(2);
    const safeNote = `${flatNumber} ${inv.billing_period} Maintenance`
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .slice(0, 50);

    const params = new URLSearchParams();
    params.set('pa', config.merchant_vpa);
    params.set('pn', config.merchant_name);
    params.set('am', amountVal);
    params.set('cu', 'INR');
    params.set('tn', safeNote);
    params.set('tr', inv.reference_id);

    // Standard RFC3986 percent-encoding for native UPI app compatibility
    const upiUri = `upi://pay?${params.toString().replace(/\+/g, '%20')}`;

    // Determine effective status
    let effectiveStatus: InvoiceStatus = inv.status;
    if (latestPayment) {
      if (latestPayment.status === 'APPROVED') {
        effectiveStatus = 'PAID';
      } else if (latestPayment.status === 'PENDING_CHECK') {
        effectiveStatus = 'PENDING_CHECK';
      }
    }

    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      flatId: targetFlatId || 'flat_a101',
      flatNumber,
      wing,
      societyName,
      billingPeriod: inv.billing_period,
      dueDate: inv.due_date ? new Date(inv.due_date).toISOString().slice(0, 10) : '2026-12-10',
      totalAmount: Number(inv.total_amount),
      paidAmount: Number(inv.paid_amount),
      status: effectiveStatus,
      breakdown,
      referenceId: inv.reference_id,
      merchantVpa: config.merchant_vpa,
      merchantName: config.merchant_name,
      upiUri,
      submittedUtr: latestPayment?.utr,
      submittedAt: latestPayment?.submitted_at,
      receiptNumber: latestPayment?.receipt_number,
      paidAt: inv.paid_at || latestPayment?.verified_at,
    };
  }

  /**
   * RESIDENT: Submit 12-digit UTR confirmation with optional screenshot proof
   */
  static async submitResidentPayment(
    societyId: string,
    residentId: string,
    flatId: string | undefined,
    input: SubmitPaymentInput,
    screenshotUrl?: string
  ): Promise<{ success: boolean; paymentId: string; message: string; receiptNumber?: string }> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    const cleanUtr = input.utr.trim().replace(/\s+/g, '');
    if (cleanUtr.length < 6 || cleanUtr.length > 32) {
      throw new Error('Please enter a valid UPI transaction reference (UTR) number');
    }

    // 1. Fetch invoice
    const [invoices]: any = await pool.query(
      'SELECT * FROM maintenance_invoices WHERE id = ? AND society_id = ?',
      [input.invoiceId, societyId]
    );

    if (invoices.length === 0) {
      throw new Error('Invoice not found');
    }
    const inv = invoices[0];

    if (inv.status === 'PAID') {
      throw new Error('This bill has already been paid and verified');
    }

    // 2. Check for duplicate UTR submission
    const [existingUtr]: any = await pool.query(
      'SELECT id, status FROM maintenance_payments WHERE society_id = ? AND utr = ?',
      [societyId, cleanUtr]
    );

    if (existingUtr.length > 0) {
      const ex = existingUtr[0];
      if (ex.status === 'APPROVED') {
        throw new Error('This UTR has already been approved for another payment');
      }
      if (ex.status === 'PENDING_CHECK') {
        throw new Error('This UTR has already been submitted and is awaiting admin check');
      }
    }

    // 3. Bank Statement Matcher check (if society uploaded statements)
    let bankMatchStatus: BankMatchStatus = 'NOT_YET';
    const [stmtMatches]: any = await pool.query(
      'SELECT * FROM bank_statement_entries WHERE society_id = ? AND utr = ? LIMIT 1',
      [societyId, cleanUtr]
    );

    if (stmtMatches.length > 0) {
      const stmt = stmtMatches[0];
      if (Number(stmt.amount) >= Number(inv.total_amount)) {
        bankMatchStatus = 'FOUND';
      } else {
        bankMatchStatus = 'AMOUNT_SHORT';
      }
    }

    // 4. Create payment submission record
    const paymentId = `pay_${uuidv4().slice(0, 8)}`;
    const targetFlatId = flatId || inv.flat_id;

    await pool.query(
      `INSERT INTO maintenance_payments (
        id, society_id, invoice_id, resident_id, flat_id,
        amount, utr, screenshot_url, status, bank_match_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_CHECK', ?)`,
      [
        paymentId,
        societyId,
        inv.id,
        residentId,
        targetFlatId,
        inv.total_amount,
        cleanUtr,
        screenshotUrl || null,
        bankMatchStatus,
      ]
    );

    // 5. Update invoice status to PENDING_CHECK
    await pool.query(
      "UPDATE maintenance_invoices SET status = 'PENDING_CHECK', updated_at = NOW() WHERE id = ?",
      [inv.id]
    );

    return {
      success: true,
      paymentId,
      message: 'UTR submitted successfully. Society admin will verify against the society bank account.',
    };
  }

  /**
   * ADMIN: Fetch Top Metric Cards (Collected, Pending check, Unpaid flats, Gateway fees)
   */
  static async getAdminOverview(societyId: string): Promise<AdminMaintenanceOverview> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    // 1. Collected this month (Nov 2026 or current)
    const [collectedRows]: any = await pool.query(
      `SELECT COALESCE(SUM(paid_amount), 0) as totalCollected
       FROM maintenance_invoices 
       WHERE society_id = ? AND status = 'PAID' AND billing_period = 'Nov 2026'`,
      [societyId]
    );

    const collectedNov = Number(collectedRows[0]?.totalCollected) || 0;

    // 2. Pending check count
    const [pendingRows]: any = await pool.query(
      "SELECT COUNT(*) as cnt FROM maintenance_payments WHERE society_id = ? AND status = 'PENDING_CHECK'",
      [societyId]
    );
    const pendingCheck = Number(pendingRows[0]?.cnt) || 0;

    // 3. Unpaid flats count
    const [unpaidRows]: any = await pool.query(
      "SELECT COUNT(*) as cnt FROM maintenance_invoices WHERE society_id = ? AND status = 'UNPAID'",
      [societyId]
    );
    const unpaidFlats = Number(unpaidRows[0]?.cnt) || 0;

    return {
      collectedNov,
      collectedNovFormatted: this.formatLakhs(collectedNov),
      pendingCheck,
      unpaidFlats,
      gatewayFees: 0, // ₹0 gateway fees
    };
  }

  /**
   * ADMIN: Fetch Verification Queue (Pending & Verified Payments)
   */
  static async getAdminVerificationQueue(
    societyId: string,
    statusFilter?: string
  ): Promise<VerificationQueueItem[]> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    let query = `
      SELECT 
        p.id as paymentId,
        p.invoice_id as invoiceId,
        p.amount,
        p.utr,
        p.screenshot_url as screenshotUrl,
        p.status,
        p.bank_match_status as bankMatchStatus,
        p.submitted_at as submittedAt,
        p.verified_at as verifiedAt,
        p.receipt_number as receiptNumber,
        f.flat_number as flatNumber,
        f.wing,
        u.name as residentName,
        u.mobile as residentMobile
      FROM maintenance_payments p
      JOIN flats f ON p.flat_id = f.id
      JOIN maintenance_invoices inv ON p.invoice_id = inv.id
      LEFT JOIN users u ON p.resident_id = u.id
      WHERE p.society_id = ?
    `;

    const params: any[] = [societyId];

    if (statusFilter && statusFilter !== 'ALL') {
      query += ' AND p.status = ?';
      params.push(statusFilter);
    } else {
      query += " ORDER BY FIELD(p.status, 'PENDING_CHECK', 'APPROVED', 'REJECTED'), p.submitted_at DESC";
    }

    const [rows]: any = await pool.query(query, params);

    return rows.map((r: any) => ({
      paymentId: r.paymentId,
      invoiceId: r.invoiceId,
      flatNumber: r.flatNumber || 'A-101',
      wing: r.wing || 'Wing A',
      residentName: r.residentName || 'Resident',
      residentMobile: r.residentMobile,
      amount: Number(r.amount),
      utr: r.utr,
      screenshotUrl: r.screenshotUrl || undefined,
      bankMatchStatus: r.bankMatchStatus || 'NOT_YET',
      status: r.status,
      submittedAt: r.submittedAt,
      verifiedAt: r.verifiedAt || undefined,
      receiptNumber: r.receiptNumber || undefined,
    }));
  }

  /**
   * ADMIN: Approve UTR Payment (Marks Paid, generates receipt, updates invoice)
   */
  static async approvePayment(
    societyId: string,
    adminId: string,
    paymentId: string
  ): Promise<{ success: boolean; receiptNumber: string; message: string }> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    const [payments]: any = await pool.query(
      'SELECT * FROM maintenance_payments WHERE id = ? AND society_id = ?',
      [paymentId, societyId]
    );

    if (payments.length === 0) {
      throw new Error('Payment record not found');
    }
    const pay = payments[0];

    // Generate official Receipt Number (e.g. RCPT-202611-A101)
    const [flats]: any = await pool.query('SELECT flat_number FROM flats WHERE id = ?', [pay.flat_id]);
    const flatNum = (flats[0]?.flat_number || 'A101').replace(/[^a-zA-Z0-9]/g, '');
    const randCode = crypto.randomBytes(2).toString('hex').toUpperCase();
    const receiptNumber = `RCPT-${new Date().toISOString().slice(0, 7).replace('-', '')}-${flatNum}-${randCode}`;

    // 1. Update Payment Record
    await pool.query(
      `UPDATE maintenance_payments SET
        status = 'APPROVED',
        verified_by = ?,
        verified_at = NOW(),
        receipt_number = ?
      WHERE id = ?`,
      [adminId, receiptNumber, paymentId]
    );

    // 2. Mark Invoice as PAID
    await pool.query(
      `UPDATE maintenance_invoices SET
        status = 'PAID',
        paid_amount = total_amount,
        paid_at = NOW(),
        updated_at = NOW()
      WHERE id = ?`,
      [pay.invoice_id]
    );

    return {
      success: true,
      receiptNumber,
      message: `Payment of ₹${pay.amount} approved. Invoice marked as Paid.`,
    };
  }

  /**
   * ADMIN: Reject Payment with reason
   */
  static async rejectPayment(
    societyId: string,
    adminId: string,
    paymentId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    const [payments]: any = await pool.query(
      'SELECT * FROM maintenance_payments WHERE id = ? AND society_id = ?',
      [paymentId, societyId]
    );

    if (payments.length === 0) {
      throw new Error('Payment record not found');
    }
    const pay = payments[0];

    // 1. Mark payment REJECTED
    await pool.query(
      `UPDATE maintenance_payments SET
        status = 'REJECTED',
        rejection_reason = ?,
        verified_by = ?,
        verified_at = NOW()
      WHERE id = ?`,
      [reason || 'UTR could not be verified on society bank statement', adminId, paymentId]
    );

    // 2. Revert invoice to UNPAID
    await pool.query(
      "UPDATE maintenance_invoices SET status = 'UNPAID', updated_at = NOW() WHERE id = ?",
      [pay.invoice_id]
    );

    return {
      success: true,
      message: 'Payment rejected. Resident invoice returned to Unpaid.',
    };
  }

  /**
   * ADMIN: Configure Society Merchant UPI ID
   */
  static async setSocietyUpi(
    societyId: string,
    input: SetSocietyUpiInput
  ): Promise<{ success: boolean; message: string }> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    const cleanVpa = input.merchantVpa.trim().toLowerCase();
    if (!cleanVpa.includes('@')) {
      throw new Error('Invalid UPI ID format. Example: greenvalley@icici');
    }

    const [existing]: any = await pool.query(
      'SELECT id FROM society_payment_configs WHERE society_id = ?',
      [societyId]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE society_payment_configs SET
          merchant_vpa = ?,
          merchant_name = ?,
          bank_name = ?,
          account_number_masked = ?,
          ifsc_code = ?,
          updated_at = NOW()
        WHERE society_id = ?`,
        [
          cleanVpa,
          input.merchantName.trim(),
          input.bankName?.trim() || 'ICICI Bank',
          input.accountNumber ? `•••• •••• •••• ${input.accountNumber.trim().slice(-4)}` : null,
          input.ifscCode?.trim() || null,
          societyId,
        ]
      );
    } else {
      const id = `spc_${uuidv4().slice(0, 8)}`;
      await pool.query(
        `INSERT INTO society_payment_configs (
          id, society_id, merchant_vpa, merchant_name, bank_name, account_number_masked, ifsc_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          societyId,
          cleanVpa,
          input.merchantName.trim(),
          input.bankName?.trim() || 'ICICI Bank',
          input.accountNumber ? `•••• •••• •••• ${input.accountNumber.trim().slice(-4)}` : null,
          input.ifscCode?.trim() || null,
        ]
      );
    }

    return {
      success: true,
      message: 'Society Merchant UPI ID updated successfully.',
    };
  }

  /**
   * ADMIN: Auto-match Bank Statement CSV entries with pending payments
   */
  static async autoMatchBankStatement(
    societyId: string,
    csvContent: string
  ): Promise<{ matchedCount: number; shortAmountCount: number; totalProcessed: number }> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    let matchedCount = 0;
    let shortAmountCount = 0;
    let totalProcessed = 0;

    for (const line of lines) {
      // Support common CSV formats: Date, Description, Amount, UTR/Ref
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 3) continue;

      // Extract UTR from any column or description
      const utrMatch = line.match(/\b\d{12}\b/);
      const utr = utrMatch ? utrMatch[0] : parts.find((p) => /^\d{10,16}$/.test(p));

      // Extract amount
      const amountVal = parseFloat(parts.find((p) => /^\d+(\.\d{1,2})?$/.test(p)) || '0');

      if (utr) {
        totalProcessed++;
        // Check if there is a pending payment with this UTR
        const [pending]: any = await pool.query(
          "SELECT * FROM maintenance_payments WHERE society_id = ? AND utr = ? AND status = 'PENDING_CHECK'",
          [societyId, utr]
        );

        if (pending.length > 0) {
          const p = pending[0];
          if (amountVal >= Number(p.amount) - 5) {
            await pool.query(
              "UPDATE maintenance_payments SET bank_match_status = 'FOUND' WHERE id = ?",
              [p.id]
            );
            matchedCount++;
          } else {
            await pool.query(
              "UPDATE maintenance_payments SET bank_match_status = 'AMOUNT_SHORT' WHERE id = ?",
              [p.id]
            );
            shortAmountCount++;
          }
        }
      }
    }

    return { matchedCount, shortAmountCount, totalProcessed };
  }

  /**
   * ADMIN: Export Ledger CSV
   */
  static async exportLedgerCsv(societyId: string): Promise<string> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    const [rows]: any = await pool.query(
      `SELECT 
        f.flat_number as Flat,
        f.wing as Wing,
        inv.billing_period as BillingPeriod,
        inv.total_amount as BillAmount,
        p.amount as PaidAmount,
        p.utr as UTR,
        p.receipt_number as ReceiptNumber,
        p.status as VerificationStatus,
        p.submitted_at as SubmittedAt,
        p.verified_at as VerifiedAt
      FROM maintenance_invoices inv
      JOIN flats f ON inv.flat_id = f.id
      LEFT JOIN maintenance_payments p ON p.invoice_id = inv.id
      WHERE inv.society_id = ?
      ORDER BY inv.created_at DESC`,
      [societyId]
    );

    const headers = [
      'Flat',
      'Wing',
      'Billing Period',
      'Bill Amount',
      'Paid Amount',
      'UTR',
      'Receipt #',
      'Verification Status',
      'Submitted At',
      'Verified At',
    ];

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      csvLines.push(
        [
          `"${r.Flat || ''}"`,
          `"${r.Wing || ''}"`,
          `"${r.BillingPeriod || ''}"`,
          r.BillAmount || 0,
          r.PaidAmount || 0,
          `"${r.UTR || ''}"`,
          `"${r.ReceiptNumber || ''}"`,
          `"${r.VerificationStatus || 'UNPAID'}"`,
          `"${r.SubmittedAt || ''}"`,
          `"${r.VerifiedAt || ''}"`,
        ].join(',')
      );
    }

    return csvLines.join('\n');
  }

  /**
   * ADMIN: Edit maintenance bill amount for a flat / invoice
   */
  static async editInvoiceAmount(
    societyId: string,
    targetId: string, // invoiceId or flatId
    newAmount: number,
    breakdown?: BreakdownItem[]
  ): Promise<{ success: boolean; message: string; updatedAmount: number }> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    if (newAmount < 0 || isNaN(newAmount)) {
      throw new Error('Please enter a valid amount');
    }

    // Default breakdown if none provided
    const defaultBreakdown = breakdown && breakdown.length > 0
      ? breakdown
      : [
          { title: 'Maintenance', amount: Math.round(newAmount * 0.8) },
          { title: 'Sinking fund', amount: Math.round(newAmount * 0.12) },
          { title: 'Parking', amount: Math.round(newAmount * 0.08) },
        ];

    // Find invoice by id or flat_id
    const [invs]: any = await pool.query(
      'SELECT id, flat_id FROM maintenance_invoices WHERE (id = ? OR flat_id = ?) AND society_id = ? LIMIT 1',
      [targetId, targetId, societyId]
    );

    if (invs.length === 0) {
      throw new Error('Invoice not found');
    }

    const inv = invs[0];

    await pool.query(
      `UPDATE maintenance_invoices SET
        total_amount = ?,
        breakdown_json = ?,
        updated_at = NOW()
      WHERE id = ? AND society_id = ?`,
      [newAmount, JSON.stringify(defaultBreakdown), inv.id, societyId]
    );

    return {
      success: true,
      message: `Maintenance bill updated to ₹${newAmount.toLocaleString('en-IN')}`,
      updatedAmount: newAmount,
    };
  }

  /**
   * ADMIN: Reset payment status back to UNPAID
   */
  static async resetPayment(
    societyId: string,
    targetId: string // paymentId, invoiceId, or flatId
  ): Promise<{ success: boolean; message: string }> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    // 1. Resolve invoice
    let invId = targetId;
    const [invRows]: any = await pool.query(
      'SELECT id FROM maintenance_invoices WHERE (id = ? OR flat_id = ?) AND society_id = ? LIMIT 1',
      [targetId, targetId, societyId]
    );

    if (invRows.length > 0) {
      invId = invRows[0].id;
    }

    // 2. Revert invoice to UNPAID
    await pool.query(
      `UPDATE maintenance_invoices SET
        status = 'UNPAID',
        paid_amount = 0.00,
        paid_at = NULL,
        updated_at = NOW()
      WHERE id = ? AND society_id = ?`,
      [invId, societyId]
    );

    // 3. Delete / Clear payments for this invoice
    await pool.query(
      `DELETE FROM maintenance_payments 
       WHERE (invoice_id = ? OR id = ? OR flat_id = ?) AND society_id = ?`,
      [invId, targetId, targetId, societyId]
    );

    return {
      success: true,
      message: 'Payment has been successfully reset. The bill is now UNPAID and resident can pay again.',
    };
  }

  /**
   * RESIDENT: Cancel own pending UTR submission to retry payment
   */
  static async cancelResidentSubmission(
    societyId: string,
    residentId: string,
    invoiceId: string
  ): Promise<{ success: boolean; message: string }> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    // Remove pending payment
    await pool.query(
      `DELETE FROM maintenance_payments 
       WHERE invoice_id = ? AND society_id = ? AND status = 'PENDING_CHECK'`,
      [invoiceId, societyId]
    );

    // Revert invoice back to UNPAID
    await pool.query(
      `UPDATE maintenance_invoices SET
        status = 'UNPAID',
        updated_at = NOW()
      WHERE id = ? AND society_id = ?`,
      [invoiceId, societyId]
    );

    return {
      success: true,
      message: 'Submission cancelled. You can now choose a payment app and pay again.',
    };
  }
}
