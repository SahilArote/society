import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  findAllSocietiesWithUsage,
  findSocietyById,
  findSocietyBySubdomain,
  createSocietyRecord,
  updateSocietyStatus,
  updateSociety,
  updateSocietyAdminCredentials,
  findUserByMobile,
  findUserByEmail,
} from '../database/db';
import { getMysqlPool } from '../database/mysql';
import { authenticateToken, AuthenticatedRequest, authorizeRoles } from '../middleware/auth';
import { computeSocietySubscriptionStatus, normalizePlan, PLANS_CONFIG, PLANS_LIST } from '../utils/subscription';

const router = Router();

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

    const society = await findSocietyBySubdomain(subdomain);
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
  } catch (error: any) {
    console.error('Error finding society by subdomain:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to look up subdomain' } });
  }
});

// =============================================================
// SUPER ADMIN PROTECTED ENDPOINTS
// =============================================================

// GET /api/super-admin/societies
router.get('/societies', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const societies = await findAllSocietiesWithUsage();
    return res.json({
      success: true,
      data: societies,
    });
  } catch (error: any) {
    console.error('Error fetching societies list for super admin:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch societies directory' },
    });
  }
});

// GET /api/super-admin/stats
router.get('/stats', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const societies = await findAllSocietiesWithUsage();
    const totalSocieties = societies.length;
    const activeSocieties = societies.filter((s: any) => s.status === 'ACTIVE').length;
    const totalDevices = societies.reduce((acc: number, s: any) => acc + (s.totalGuards || 0), 0);
    const totalFlats = societies.reduce((acc: number, s: any) => acc + (s.totalFlats || 0), 0);
    const totalResidents = societies.reduce((acc: number, s: any) => acc + (s.totalResidents || 0), 0);

    let trialCount = 0;
    let graceCount = 0;
    let activePaidCount = 0;
    let suspendedCount = 0;

    const planBreakdown: Record<string, number> = {
      STANDARD_1_DEVICE: 0,
      PREMIUM_2_DEVICE: 0,
      ENTERPRISE_3_DEVICE: 0,
    };

    for (const s of societies) {
      const plan = normalizePlan(s.planName, s.maxDevices);
      planBreakdown[plan.code] = (planBreakdown[plan.code] || 0) + 1;

      const subStatus = s.subscription?.status;
      if (subStatus === 'TRIAL') trialCount++;
      else if (subStatus === 'GRACE_PERIOD') graceCount++;
      else if (subStatus === 'ACTIVE') activePaidCount++;
      else if (subStatus === 'SUSPENDED') suspendedCount++;
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
        plans: PLANS_LIST,
      },
    });
  } catch (error: any) {
    console.error('Error fetching super admin stats:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch platform metrics' },
    });
  }
});

// POST /api/super-admin/societies/onboard
router.post('/societies/onboard', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      subdomain,
      address,
      city,
      state,
      pincode,
      contactEmail,
      contactPhone,
      logoUrl,
      upiId,
      maintenanceAmount,
      maintenanceDueDay,
      planName,
      maxDevices,
      billingCycle,
      // Initial Admin Details
      adminName,
      adminMobile,
      adminEmail,
      adminPassword,
      // Gate Details
      initialGateName,
    } = req.body;

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
    let cleanSubdomain: string | null = null;
    if (subdomain && subdomain.trim()) {
      const sanitized = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (sanitized.length < 2) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SUBDOMAIN', message: 'Subdomain must be at least 2 characters (alphanumeric and dashes only)' } });
      }
      const existing = await findSocietyBySubdomain(sanitized);
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

    const existingMobileUser = await findUserByMobile(cleanAdminMobile);
    if (existingMobileUser) {
      return res.status(409).json({ success: false, error: { code: 'MOBILE_EXISTS', message: `Admin mobile ${cleanAdminMobile} is already registered.` } });
    }

    if (adminEmail && adminEmail.trim()) {
      const existingEmailUser = await findUserByEmail(adminEmail.trim().toLowerCase());
      if (existingEmailUser) {
        return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: `Admin email ${adminEmail} is already registered.` } });
      }
    }

    // Plan & Device Limits Resolution (Strictly 3 Canonical Plans)
    const plan = normalizePlan(planName, maxDevices);

    // 2. Create Society Record with 1-Month Free Trial
    const society = await createSocietyRecord({
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
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database pool unavailable');

    // 4. Create Default Gate
    const gateName = initialGateName?.trim() || 'Main Gate';
    const gateId = 'gate_' + uuidv4().replace(/-/g, '').slice(0, 12);
    await pool.query(
      'INSERT INTO gates (id, society_id, name, location, status) VALUES (?, ?, ?, ?, ?)',
      [gateId, society.id, gateName, 'Primary Society Entrance', 'OPERATIONAL']
    );

    // 5. Create Initial Society Admin User
    const adminId = 'adm_' + uuidv4().replace(/-/g, '').slice(0, 12);
    const pwdHash = bcrypt.hashSync(String(adminPassword).trim(), 10);

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
  } catch (error: any) {
    console.error('Error onboarding society:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to onboard society' },
    });
  }
});

// PATCH /api/super-admin/societies/:id/status
router.patch('/societies/:id/status', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be ACTIVE or INACTIVE' } });
    }

    const updated = await updateSocietyStatus(id, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
    }

    return res.json({
      success: true,
      message: `Society status updated to ${status.toUpperCase()}`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error toggling society status:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update society status' } });
  }
});

// PUT /api/super-admin/societies/:id
router.put('/societies/:id', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (payload.subdomain) {
      payload.subdomain = payload.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      const existing = await findSocietyBySubdomain(payload.subdomain);
      if (existing && existing.id !== id) {
        return res.status(409).json({ success: false, error: { code: 'SUBDOMAIN_EXISTS', message: 'Subdomain already taken' } });
      }
    }

    const updated = await updateSociety(id, payload);
    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
    }

    // If admin credentials fields are provided, update admin user as well
    let updatedAdmin = null;
    if (
      payload.adminEmail !== undefined ||
      payload.adminPassword !== undefined ||
      payload.adminName !== undefined ||
      payload.adminMobile !== undefined
    ) {
      try {
        updatedAdmin = await updateSocietyAdminCredentials(id, {
          email: payload.adminEmail,
          password: payload.adminPassword,
          name: payload.adminName,
          mobile: payload.adminMobile,
        });
      } catch (adminErr: any) {
        return res.status(400).json({
          success: false,
          error: { code: 'ADMIN_UPDATE_FAILED', message: adminErr.message || 'Failed to update admin credentials' },
        });
      }
    }

    return res.json({
      success: true,
      message: 'Society configuration and admin details updated successfully',
      data: {
        ...updated,
        admin: updatedAdmin,
      },
    });
  } catch (error: any) {
    console.error('Error updating society details:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update society' } });
  }
});

// PATCH /api/super-admin/societies/:id/admin-credentials
// Dedicated endpoint to update society admin login email, password, name, and mobile
router.patch('/societies/:id/admin-credentials', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, password, name, mobile } = req.body;

    if (!email && !password && !name && !mobile) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'At least one field (email, password, name, or mobile) must be provided' },
      });
    }

    const society = await findSocietyById(id);
    if (!society) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
    }

    const updatedAdmin = await updateSocietyAdminCredentials(id, {
      email,
      password,
      name,
      mobile,
    });

    return res.json({
      success: true,
      message: `Admin credentials for '${society.name}' updated successfully`,
      data: updatedAdmin,
    });
  } catch (error: any) {
    console.error('Error updating society admin credentials:', error);
    return res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message || 'Failed to update admin credentials' },
    });
  }
});

// POST /api/super-admin/societies/:id/renew
// Super Admin manually activates / renews a society's subscription
router.post('/societies/:id/renew', authenticateToken, authorizeRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { months = 1, planName, paymentMode = 'UPI', referenceId } = req.body;

    const society = await findSocietyById(id);
    if (!society) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
    }

    const plan = normalizePlan(planName || society.planName, society.maxDevices);
    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database pool unavailable');

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

    const updated = await findSocietyById(id);
    const subInfo = computeSocietySubscriptionStatus(updated);

    return res.json({
      success: true,
      message: `Subscription for '${society.name}' successfully recharged for ${durationMonths} month(s) (${plan.name}).`,
      data: {
        ...updated,
        subscription: subInfo,
      },
    });
  } catch (error: any) {
    console.error('Error renewing society subscription:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to renew subscription' } });
  }
});

// GET /api/super-admin/societies/:id/backup
// Full society-wise data backup export for Super Admin only
router.get('/societies/:id/backup', authenticateToken,  authorizeRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const society = await findSocietyById(id);
    if (!society) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Society not found' } });
    }

    const pool = await getMysqlPool();
    if (!pool) throw new Error('Database pool unavailable');

    const [flats]: any = await pool.query('SELECT * FROM flats WHERE society_id = ? ORDER BY flat_number ASC', [id]);
    const [residents]: any = await pool.query('SELECT * FROM residents WHERE society_id = ?', [id]);
    const [guards]: any = await pool.query('SELECT * FROM guards WHERE society_id = ?', [id]);
    const [gates]: any = await pool.query('SELECT * FROM gates WHERE society_id = ?', [id]);
    const [admins]: any = await pool.query('SELECT id, name, email, mobile, role, status, created_at FROM users WHERE society_id = ?', [id]);
    const [visitors]: any = await pool.query('SELECT * FROM visitors WHERE society_id = ? ORDER BY created_at DESC LIMIT 500', [id]);
    const [announcements]: any = await pool.query('SELECT * FROM announcements WHERE society_id = ?', [id]).catch(() => [[]]);
    const [recharges]: any = await pool.query('SELECT * FROM subscription_recharges WHERE society_id = ? ORDER BY created_at DESC', [id]).catch(() => [[]]);

    const backup = {
      exportVersion: '2.0-ENTERPRISE',
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.email || 'Super Admin',
      society,
      summary: {
        totalFlats: flats.length,
        totalResidents: residents.length,
        totalGuards: guards.length,
        totalGates: gates.length,
        totalAdmins: admins.length,
        totalVisitorsLogged: visitors.length,
      },
      flats,
      residents,
      guards,
      gates,
      admins,
      visitors,
      announcements,
      recharges,
    };

    return res.json({
      success: true,
      data: backup,
    });
  } catch (error: any) {
    console.error('Error generating society backup:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate society backup' } });
  }
});

export default router;
