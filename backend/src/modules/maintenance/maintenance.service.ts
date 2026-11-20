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
   * Fetch society payment config — returns null if admin has not configured a real UPI ID yet.
   * Does NOT auto-seed a fake VPA. Admin must set a real one via /admin/maintenance → Set UPI ID.
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

    // No config found — return null so callers can show "UPI not configured" state
    return null;
  }

  /**
   * Check whether the society has configured a valid (non-placeholder) UPI ID.
   */
  static isVpaConfigured(config: any): boolean {
    if (!config) return false;
    const vpa = (config.merchant_vpa || '').trim();
    if (!vpa || !vpa.includes('@')) return false;
    const parts = vpa.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
    const lower = vpa.toLowerCase();
    if (lower.startsWith('example@') || lower.startsWith('test@')) return false;
    return true;
  }

  /**
   * ADMIN: Fetch current society UPI & Bank configuration
   */
  static async getSocietyUpiConfig(societyId: string): Promise<any> {
    const config = await this.getSocietyPaymentConfig(societyId);
    return {
      merchantVpa: config?.merchant_vpa || '',
      merchantName: config?.merchant_name || '',
      bankName: config?.bank_name || 'ICICI Bank',
      accountNumber: config?.account_number_masked || '',
      ifscCode: config?.ifsc_code || '',
      isConfigured: this.isVpaConfigured(config),
    };
  }

  /**
   * Build a correctly-encoded NPCI UPI Intent URI.
   * - pa= (VPA): @ must NOT be percent-encoded
   * - tr= (transaction ref): alphanumeric only, max 50 chars
   * - tn= (note): percent-encoded, max 50 chars
   * - pn= (payee name): percent-encoded
   * - am= (amount): 2 decimal places
   * Does NOT use URLSearchParams (which encodes @ → %40, space → +)
   */
  static buildUpiUri(params: {
    vpa: string;
    name: string;
    amount: string;
    note: string;
    ref: string;
  }): string {
    const safeVpa = params.vpa.trim(); // keep @ unencoded per NPCI spec
    const safeName = encodeURIComponent(params.name.trim());
    const safeNote = encodeURIComponent(params.note.slice(0, 50));
    // tr= must be alphanumeric only (A-Z, 0-9), max 50 chars
    const safeRef = params.ref.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50);
    return `upi://pay?pa=${safeVpa}&pn=${safeName}&am=${params.amount}&cu=INR&tn=${safeNote}&tr=${safeRef}`;
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
    const upiReady = this.isVpaConfigured(config);

    // 1. Resolve flat — strictly by resident ownership, never fall back to another resident's flat
    let targetFlatId = flatId;
    if (!targetFlatId) {
      const [flats]: any = await pool.query(
        'SELECT id, flat_number, wing FROM flats WHERE resident_id = ? AND society_id = ? LIMIT 1',
        [residentId, societyId]
      );
      if (flats.length > 0) {
        targetFlatId = flats[0].id;
      }
    }

    if (!targetFlatId) {
      throw new Error('Your flat is not assigned yet. Please contact the society admin to approve your registration.');
    }

    // 2. Fetch society details
    const [socRows]: any = await pool.query(
      'SELECT name FROM societies WHERE id = ?',
      [societyId]
    );
    const societyName = socRows[0]?.name || (config?.merchant_name) || 'Green Valley CHS';

    // 3. Fetch flat details
    const [flatRows]: any = await pool.query(
      'SELECT flat_number, wing FROM flats WHERE id = ?',
      [targetFlatId]
    );
    const flatNumber = flatRows[0]?.flat_number || 'A-101';
    const wing = flatRows[0]?.wing || 'Wing A';

    // 4. Fetch latest invoice for this flat (most recent billing period)
    let [invoices]: any = await pool.query(
      `SELECT * FROM maintenance_invoices
       WHERE society_id = ? AND flat_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [societyId, targetFlatId]
    );

    let inv = invoices[0];

    // If no invoice exists, auto-seed — using INSERT IGNORE to prevent race-condition duplicates
    if (!inv) {
      const now = new Date();
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const billingPeriod = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

      // Due date = 10th of next month
      const dueMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
      const dueDateStr = dueMonth.toISOString().slice(0, 10);

      const invId = `inv_${uuidv4().slice(0, 8)}`;
      const cleanFlatNum = flatNumber.replace(/[^a-zA-Z0-9]/g, '');
      const monthNum = String(now.getMonth() + 1).padStart(2, '0');
      const yearNum = String(now.getFullYear()).slice(2);
      // tr-safe alphanumeric reference id
      const refId = `NXG${cleanFlatNum}${monthNum}${yearNum}`;
      const invNumber = `INV-${now.getFullYear()}-${monthNum}-${cleanFlatNum}`;

      const breakdown = [
        { title: 'Maintenance', amount: 2000 },
        { title: 'Sinking fund', amount: 300 },
        { title: 'Parking', amount: 200 },
      ];

      // INSERT IGNORE prevents crash if two simultaneous requests race here
      await pool.query(
        `INSERT IGNORE INTO maintenance_invoices (
          id, society_id, flat_id, resident_id, invoice_number,
          billing_period, due_date, total_amount, paid_amount, status,
          breakdown_json, reference_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 2500.00, 0.00, 'UNPAID', ?, ?)`,
        [
          invId,
          societyId,
          targetFlatId,
          residentId,
          invNumber,
          billingPeriod,
          dueDateStr,
          JSON.stringify(breakdown),
          refId,
        ]
      );

      // Always re-fetch to get the winning record (in case INSERT IGNORE skipped ours)
      const [newInvs]: any = await pool.query(
        'SELECT * FROM maintenance_invoices WHERE society_id = ? AND flat_id = ? ORDER BY created_at DESC LIMIT 1',
        [societyId, targetFlatId]
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

    // 6. Build NPCI-compliant UPI Intent URI (manual build, NOT URLSearchParams)
    // Client rebuilds from live fields on every payment attempt — this is for reference/display only
    const amountVal = Number(inv.total_amount).toFixed(2);
    const noteStr = `${flatNumber} ${inv.billing_period} Maintenance`;

    let upiUri = '';
    if (upiReady && config) {
      upiUri = this.buildUpiUri({
        vpa: config.merchant_vpa,
        name: config.merchant_name,
        amount: amountVal,
        note: noteStr,
        ref: inv.reference_id,
      });
    }

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
      flatId: targetFlatId,
      flatNumber,
      wing,
      societyName,
      billingPeriod: inv.billing_period,
      dueDate: inv.due_date ? new Date(inv.due_date).toISOString().slice(0, 10) : '',
      totalAmount: Number(inv.total_amount),
      paidAmount: Number(inv.paid_amount),
      status: effectiveStatus,
      breakdown,
      referenceId: inv.reference_id,
      merchantVpa: upiReady && config ? config.merchant_vpa : '',
      merchantName: upiReady && config ? config.merchant_name : '',
      upiReady,
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

    // 1. Collected this month (current billing period — dynamic, not hardcoded)
    const now = new Date();
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentPeriod = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    const [collectedRows]: any = await pool.query(
      `SELECT COALESCE(SUM(paid_amount), 0) as totalCollected
       FROM maintenance_invoices 
       WHERE society_id = ? AND status = 'PAID' AND billing_period = ?`,
      [societyId, currentPeriod]
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

    const paymentConfig = await this.getSocietyUpiConfig(societyId);

    return {
      collectedNov,
      collectedNovFormatted: this.formatLakhs(collectedNov),
      pendingCheck,
      unpaidFlats,
      gatewayFees: 0, // ₹0 gateway fees
      paymentConfig,
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
          input.accountNumber ? (input.accountNumber.trim().startsWith('••••') ? input.accountNumber.trim() : `•••• •••• •••• ${input.accountNumber.trim().slice(-4)}`) : null,
          input.ifscCode?.trim() || null,
          societyId,
        ]
      );
      // Keep societies table upi_id in sync
      await pool.query('UPDATE societies SET upi_id = ?, updated_at = NOW() WHERE id = ?', [cleanVpa, societyId]);
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
          input.accountNumber ? (input.accountNumber.trim().startsWith('••••') ? input.accountNumber.trim() : `•••• •••• •••• ${input.accountNumber.trim().slice(-4)}`) : null,
          input.ifscCode?.trim() || null,
        ]
      );
    }

    // Keep societies table upi_id in sync
    await pool.query('UPDATE societies SET upi_id = ?, updated_at = NOW() WHERE id = ?', [cleanVpa, societyId]);

    return {
      success: true,
      message: 'Society Merchant UPI ID & bank details updated successfully.',
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

  /**
   * RESIDENT: Fetch payment and billing history for resident's flat
   */
  static async getResidentHistory(
    societyId: string,
    residentId: string,
    flatId?: string
  ): Promise<any[]> {
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database connection unavailable');

    let targetFlatId = flatId;
    if (!targetFlatId) {
      const [flats]: any = await pool.query(
        'SELECT id FROM flats WHERE resident_id = ? AND society_id = ? LIMIT 1',
        [residentId, societyId]
      );
      if (flats.length > 0) {
        targetFlatId = flats[0].id;
      }
    }

    if (!targetFlatId) return [];

    const [rows]: any = await pool.query(
      `SELECT 
        mi.id as invoice_id,
        mi.invoice_number,
        mi.billing_period,
        mi.total_amount,
        mi.paid_amount,
        mi.status as invoice_status,
        mi.due_date,
        mi.paid_at,
        mi.created_at,
        mp.id as payment_id,
        mp.utr,
        mp.receipt_number,
        mp.status as payment_status,
        mp.submitted_at,
        mp.verified_at
      FROM maintenance_invoices mi
      LEFT JOIN maintenance_payments mp ON mi.id = mp.invoice_id
      WHERE mi.society_id = ? AND mi.flat_id = ?
      ORDER BY mi.created_at DESC`,
      [societyId, targetFlatId]
    );

    return rows.map((r: any) => {
      const isPaid = r.invoice_status === 'PAID' || r.payment_status === 'APPROVED';
      const isPending = r.invoice_status === 'PENDING_CHECK' || r.payment_status === 'PENDING_CHECK';
      const effectiveStatus = isPaid ? 'PAID' : isPending ? 'PENDING_CHECK' : r.invoice_status;

      const paidDate = r.paid_at || r.verified_at || r.submitted_at;
      let formattedPaidDate = '';
      if (paidDate) {
        const d = new Date(paidDate);
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        formattedPaidDate = `${day} ${months[d.getMonth()]} · UPI`;
      }

      return {
        invoiceId: r.invoice_id,
        invoiceNumber: r.invoice_number,
        billingPeriod: r.billing_period,
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount || r.total_amount),
        status: effectiveStatus,
        dueDate: r.due_date ? new Date(r.due_date).toISOString().slice(0, 10) : '',
        paidAt: r.paid_at,
        paidDateFormatted: formattedPaidDate,
        utr: r.utr,
        receiptNumber: r.receipt_number || (isPaid ? `RCPT-${r.invoice_number?.slice(-8)}` : null),
        submittedAt: r.submitted_at,
      };
    });
  }
}
