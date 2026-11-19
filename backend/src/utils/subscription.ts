export interface PlanDefinition {
  code: 'STANDARD_1_DEVICE' | 'PREMIUM_2_DEVICE' | 'ENTERPRISE_3_DEVICE';
  name: string;
  devices: number;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
}

export const PLANS_CONFIG: Record<string, PlanDefinition> = {
  STANDARD_1_DEVICE: {
    code: 'STANDARD_1_DEVICE',
    name: 'Standard (1 Device)',
    devices: 1,
    monthlyPrice: 1999,
    annualPrice: 19990,
    description: '1 Guard Kiosk / Gate Device — Ideal for single-gate standalone societies & small complexes',
    features: [
      '1 Concurrent Guard Kiosk Device',
      '30-Day Free Full Access Trial',
      '7-Day Grace Period Protection',
      'Unlimited Resident Mobile Apps',
      'Instant Visitor QR Passes & Approvals',
      'Resident Maintenance UPI Collections',
    ],
  },
  PREMIUM_2_DEVICE: {
    code: 'PREMIUM_2_DEVICE',
    name: 'Premium (2 Devices)',
    devices: 2,
    monthlyPrice: 2999,
    annualPrice: 29990,
    description: '2 Guard Kiosk / Gate Devices — Mid-sized societies with Main Entrance + Back / Service Gate',
    features: [
      '2 Concurrent Guard Kiosk Devices',
      '30-Day Free Full Access Trial',
      '7-Day Grace Period Protection',
      'Multi-Gate Live Sync & Handover',
      'Delivery Vendor & Daily Staff Tracking',
      'Resident Maintenance UPI Collections',
    ],
  },
  ENTERPRISE_3_DEVICE: {
    code: 'ENTERPRISE_3_DEVICE',
    name: 'Enterprise (3 Devices)',
    devices: 3,
    monthlyPrice: 3999,
    annualPrice: 39990,
    description: '3 Guard Kiosk / Gate Devices — High-density towers & multi-gate residential estates',
    features: [
      '3 Concurrent Guard Kiosk Devices',
      '30-Day Free Full Access Trial',
      '7-Day Grace Period Protection',
      'Multi-Tower Traffic & Inter-Gate Routing',
      'Automated Staff Attendance & Incident Logs',
      'Resident Maintenance UPI Collections',
    ],
  },
};

export const PLANS_LIST = Object.values(PLANS_CONFIG);

export function normalizePlan(planName?: string, maxDevices?: number): PlanDefinition {
  const p = (planName || '').toUpperCase();
  if (p === 'STANDARD_1_DEVICE' || p === 'STANDARD' || p === 'STARTER_1_DEVICE' || p.includes('STANDARD') || p.includes('STARTER') || maxDevices === 1) {
    return PLANS_CONFIG.STANDARD_1_DEVICE;
  }
  if (p === 'PREMIUM_2_DEVICE' || p === 'PREMIUM' || p === 'DUAL_2_DEVICE' || p.includes('PREMIUM') || p.includes('DUAL') || maxDevices === 2) {
    return PLANS_CONFIG.PREMIUM_2_DEVICE;
  }
  if (p === 'ENTERPRISE_3_DEVICE' || p === 'ENTERPRISE' || p === 'PRO_3_DEVICE' || p.includes('ENTERPRISE') || p.includes('PRO') || (maxDevices && maxDevices >= 3)) {
    return PLANS_CONFIG.ENTERPRISE_3_DEVICE;
  }
  return PLANS_CONFIG.STANDARD_1_DEVICE;
}

export interface SubscriptionStatusResult {
  planCode: string;
  planName: string;
  maxDevices: number;
  monthlyPrice: number;
  amountDue: number;
  status: 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED';
  isTrialActive: boolean;
  isGracePeriod: boolean;
  isDue: boolean;
  isSuspended: boolean;
  trialEndsAt: string | null;
  subscriptionExpiresAt: string | null;
  graceEndsAt: string | null;
  daysRemainingInTrial: number;
  daysRemainingInGrace: number;
  daysOverdue: number;
  platformUpiId: string;
  banner: {
    type: 'info' | 'warning' | 'danger' | 'success';
    title: string;
    message: string;
    rechargeRecommended: boolean;
  };
}

export function computeSocietySubscriptionStatus(society: any): SubscriptionStatusResult {
  const plan = normalizePlan(society.planName || society.plan_name, society.maxDevices || society.max_devices);
  const now = new Date();
  const createdAt = society.createdAt || society.created_at ? new Date(society.createdAt || society.created_at) : new Date();

  // 1. Calculate trialEndsAt (default: createdAt + 30 days)
  let trialEndsAt: Date;
  if (society.trialEndsAt || society.trial_ends_at) {
    trialEndsAt = new Date(society.trialEndsAt || society.trial_ends_at);
  } else {
    trialEndsAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  // 2. Calculate subscriptionExpiresAt
  let subscriptionExpiresAt: Date;
  if (society.subscriptionExpiresAt || society.subscription_expires_at) {
    subscriptionExpiresAt = new Date(society.subscriptionExpiresAt || society.subscription_expires_at);
  } else {
    subscriptionExpiresAt = new Date(trialEndsAt.getTime());
  }

  // 3. Grace period is 7 days after expiration
  const gracePeriodDays = 7;
  const graceEndsAt = new Date(subscriptionExpiresAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  const rawSubStatus = (society.subscriptionStatus || society.subscription_status || 'TRIAL').toUpperCase();
  const isSocietyInactive = String(society.status).toUpperCase() === 'INACTIVE';

  const platformUpiId = process.env.PLATFORM_RECHARGE_UPI_ID || 'nexgate.billing@icici';

  const msToDays = (ms: number) => Math.ceil(ms / (1000 * 60 * 60 * 24));

  // If society explicitly marked inactive by super admin
  if (isSocietyInactive) {
    return {
      planCode: plan.code,
      planName: plan.name,
      maxDevices: plan.devices,
      monthlyPrice: plan.monthlyPrice,
      amountDue: plan.monthlyPrice,
      status: 'SUSPENDED',
      isTrialActive: false,
      isGracePeriod: false,
      isDue: true,
      isSuspended: true,
      trialEndsAt: trialEndsAt.toISOString(),
      subscriptionExpiresAt: subscriptionExpiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      daysRemainingInTrial: 0,
      daysRemainingInGrace: 0,
      daysOverdue: Math.max(1, msToDays(now.getTime() - graceEndsAt.getTime())),
      platformUpiId,
      banner: {
        type: 'danger',
        title: 'Society Account Suspended',
        message: 'This society account has been deactivated. Gate devices and guard logins are temporarily locked. Please contact platform administration.',
        rechargeRecommended: true,
      },
    };
  }

  // Evaluation for TRIAL status
  if (rawSubStatus === 'TRIAL') {
    if (now.getTime() <= trialEndsAt.getTime()) {
      const daysLeft = Math.max(1, msToDays(trialEndsAt.getTime() - now.getTime()));
      return {
        planCode: plan.code,
        planName: plan.name,
        maxDevices: plan.devices,
        monthlyPrice: plan.monthlyPrice,
        amountDue: plan.monthlyPrice,
        status: 'TRIAL',
        isTrialActive: true,
        isGracePeriod: false,
        isDue: false,
        isSuspended: false,
        trialEndsAt: trialEndsAt.toISOString(),
        subscriptionExpiresAt: subscriptionExpiresAt.toISOString(),
        graceEndsAt: graceEndsAt.toISOString(),
        daysRemainingInTrial: daysLeft,
        daysRemainingInGrace: 7,
        daysOverdue: 0,
        platformUpiId,
        banner: {
          type: 'info',
          title: '30-Day Free Trial Active',
          message: `Enjoying NexGate ${plan.name}! ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} remaining in your complimentary 1-month trial.`,
          rechargeRecommended: false,
        },
      };
    } else if (now.getTime() <= graceEndsAt.getTime()) {
      // Free trial has ended, within 1-week grace period
      const daysGraceLeft = Math.max(1, msToDays(graceEndsAt.getTime() - now.getTime()));
      return {
        planCode: plan.code,
        planName: plan.name,
        maxDevices: plan.devices,
        monthlyPrice: plan.monthlyPrice,
        amountDue: plan.monthlyPrice,
        status: 'GRACE_PERIOD',
        isTrialActive: false,
        isGracePeriod: true,
        isDue: true,
        isSuspended: false,
        trialEndsAt: trialEndsAt.toISOString(),
        subscriptionExpiresAt: subscriptionExpiresAt.toISOString(),
        graceEndsAt: graceEndsAt.toISOString(),
        daysRemainingInTrial: 0,
        daysRemainingInGrace: daysGraceLeft,
        daysOverdue: msToDays(now.getTime() - trialEndsAt.getTime()),
        platformUpiId,
        banner: {
          type: 'warning',
          title: 'Free Trial Expired — Payment Due (1-Week Grace Period)',
          message: `Your 1-month trial ended. ₹${plan.monthlyPrice.toLocaleString('en-IN')} is due for renewal. You have ${daysGraceLeft} ${daysGraceLeft === 1 ? 'day' : 'days'} left in your grace period before gate kiosk devices are locked. Recharge now.`,
          rechargeRecommended: true,
        },
      };
    } else {
      // Past 7-day grace period — Lock access
      const daysOverdue = msToDays(now.getTime() - graceEndsAt.getTime());
      return {
        planCode: plan.code,
        planName: plan.name,
        maxDevices: plan.devices,
        monthlyPrice: plan.monthlyPrice,
        amountDue: plan.monthlyPrice,
        status: 'SUSPENDED',
        isTrialActive: false,
        isGracePeriod: false,
        isDue: true,
        isSuspended: true,
        trialEndsAt: trialEndsAt.toISOString(),
        subscriptionExpiresAt: subscriptionExpiresAt.toISOString(),
        graceEndsAt: graceEndsAt.toISOString(),
        daysRemainingInTrial: 0,
        daysRemainingInGrace: 0,
        daysOverdue: Math.max(1, daysOverdue),
        platformUpiId,
        banner: {
          type: 'danger',
          title: 'Subscription Expired — Gate Kiosks Suspended',
          message: `The 1-month trial and 7-day grace period have expired. Guard kiosks are locked. Please complete recharge of ₹${plan.monthlyPrice.toLocaleString('en-IN')} to restore gate services.`,
          rechargeRecommended: true,
        },
      };
    }
  }

  // ACTIVE Paid Subscription
  if (now.getTime() <= subscriptionExpiresAt.getTime()) {
    const daysLeft = Math.max(1, msToDays(subscriptionExpiresAt.getTime() - now.getTime()));
    return {
      planCode: plan.code,
      planName: plan.name,
      maxDevices: plan.devices,
      monthlyPrice: plan.monthlyPrice,
      amountDue: plan.monthlyPrice,
      status: 'ACTIVE',
      isTrialActive: false,
      isGracePeriod: false,
      isDue: false,
      isSuspended: false,
      trialEndsAt: trialEndsAt.toISOString(),
      subscriptionExpiresAt: subscriptionExpiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      daysRemainingInTrial: 0,
      daysRemainingInGrace: 7,
      daysOverdue: 0,
      platformUpiId,
      banner: {
        type: 'success',
        title: `${plan.name} Active`,
        message: `Subscription active with ${plan.devices} device capacity. Next renewal in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`,
        rechargeRecommended: false,
      },
    };
  } else if (now.getTime() <= graceEndsAt.getTime()) {
    // Paid subscription expired, within 7-day grace period
    const daysGraceLeft = Math.max(1, msToDays(graceEndsAt.getTime() - now.getTime()));
    return {
      planCode: plan.code,
      planName: plan.name,
      maxDevices: plan.devices,
      monthlyPrice: plan.monthlyPrice,
      amountDue: plan.monthlyPrice,
      status: 'GRACE_PERIOD',
      isTrialActive: false,
      isGracePeriod: true,
      isDue: true,
      isSuspended: false,
      trialEndsAt: trialEndsAt.toISOString(),
      subscriptionExpiresAt: subscriptionExpiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      daysRemainingInTrial: 0,
      daysRemainingInGrace: daysGraceLeft,
      daysOverdue: msToDays(now.getTime() - subscriptionExpiresAt.getTime()),
      platformUpiId,
      banner: {
        type: 'warning',
        title: 'Subscription Expired — 1-Week Grace Period Active',
        message: `Your ${plan.name} plan expired. Renewal of ₹${plan.monthlyPrice.toLocaleString('en-IN')} is due. ${daysGraceLeft} ${daysGraceLeft === 1 ? 'day' : 'days'} remaining in grace period before guard kiosk devices are locked.`,
        rechargeRecommended: true,
      },
    };
  } else {
    // Past grace period
    const daysOverdue = msToDays(now.getTime() - graceEndsAt.getTime());
    return {
      planCode: plan.code,
      planName: plan.name,
      maxDevices: plan.devices,
      monthlyPrice: plan.monthlyPrice,
      amountDue: plan.monthlyPrice,
      status: 'SUSPENDED',
      isTrialActive: false,
      isGracePeriod: false,
      isDue: true,
      isSuspended: true,
      trialEndsAt: trialEndsAt.toISOString(),
      subscriptionExpiresAt: subscriptionExpiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      daysRemainingInTrial: 0,
      daysRemainingInGrace: 0,
      daysOverdue: Math.max(1, daysOverdue),
      platformUpiId,
      banner: {
        type: 'danger',
        title: 'Subscription Expired — Gate Kiosks Suspended',
        message: `Your subscription and 1-week grace period have expired. Guard kiosk devices are currently locked. Please recharge ₹${plan.monthlyPrice.toLocaleString('en-IN')} to resume services immediately.`,
        rechargeRecommended: true,
      },
    };
  }
}
