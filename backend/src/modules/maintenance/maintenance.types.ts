export interface BreakdownItem {
  title: string;
  amount: number;
}

export type InvoiceStatus = 'UNPAID' | 'PENDING_CHECK' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'PENDING_CHECK' | 'APPROVED' | 'REJECTED';
export type BankMatchStatus = 'FOUND' | 'AMOUNT_SHORT' | 'NOT_YET';

export interface ResidentBillResponse {
  invoiceId: string;
  invoiceNumber: string;
  flatId: string;
  flatNumber: string;
  wing: string;
  societyName: string;
  billingPeriod: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  breakdown: BreakdownItem[];
  referenceId: string;
  merchantVpa: string;
  merchantName: string;
  /** true = admin has configured a real registered UPI VPA; false = UPI not ready, block payment */
  upiReady: boolean;
  upiUri: string;
  submittedUtr?: string;
  submittedAt?: string;
  receiptNumber?: string;
  paidAt?: string;
}

export interface VerificationQueueItem {
  paymentId: string;
  invoiceId: string;
  flatNumber: string;
  wing: string;
  residentName: string;
  residentMobile?: string;
  amount: number;
  utr: string;
  screenshotUrl?: string;
  bankMatchStatus: BankMatchStatus;
  status: PaymentStatus;
  submittedAt: string;
  verifiedAt?: string;
  receiptNumber?: string;
}

export interface AdminMaintenanceOverview {
  collectedNov: number;
  collectedNovFormatted: string;
  pendingCheck: number;
  unpaidFlats: number;
  gatewayFees: number; // Strictly 0
}

export interface SubmitPaymentInput {
  invoiceId: string;
  utr: string;
  screenshotUrl?: string;
}

export interface SetSocietyUpiInput {
  merchantVpa: string;
  merchantName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

