import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser, UserRole } from '../types';
import { getDb } from '../database/db';

const JWT_SECRET = process.env.JWT_SECRET || 'greengate_secret_jwt_key_2026_super_secure';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required' },
    });
  }

  // Handle Demo Tokens strictly in development/test environment
  const isDemoAllowed = process.env.ALLOW_DEMO_TOKENS === 'true' || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  if (isDemoAllowed) {
    const db = getDb();
    if (token === 'demo_guard_token' || token === 'guard_token') {
      const guardUser = db.users.find((u) => u.role === 'GUARD');
      if (guardUser) {
        const guardRecord = db.guards.find((g) => g.userId === guardUser.id);
        req.user = {
          id: guardUser.id,
          name: guardUser.name,
          mobile: guardUser.mobile,
          role: 'GUARD',
          societyId: guardUser.societyId,
          gateId: guardRecord?.gateId || 'gate_main',
        };
        return next();
      }
    }

    if (token === 'demo_resident_token' || token === 'resident_token') {
      const residentUser = db.users.find((u) => u.role === 'RESIDENT');
      if (residentUser) {
        const flat = db.flats.find((f) => f.residentId === residentUser.id);
        req.user = {
          id: residentUser.id,
          name: residentUser.name,
          mobile: residentUser.mobile,
          role: 'RESIDENT',
          societyId: residentUser.societyId,
          flatId: flat?.id,
        };
        return next();
      }
    }

    if (token === 'demo_admin_token' || token === 'admin_token') {
      const adminUser = db.users.find((u) => u.role === 'ADMIN');
      if (adminUser) {
        req.user = {
          id: adminUser.id,
          name: adminUser.name,
          mobile: adminUser.mobile,
          role: 'ADMIN',
          societyId: adminUser.societyId,
        };
        return next();
      }
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    // Enrich with flatId or gateId if omitted from token
    const db = getDb();
    if (decoded.role === 'RESIDENT' && !decoded.flatId) {
      const flat = db.flats.find((f) => f.residentId === decoded.id);
      decoded.flatId = flat?.id;
    } else if (decoded.role === 'GUARD' && !decoded.gateId) {
      const guardRecord = db.guards.find((g) => g.userId === decoded.id);
      decoded.gateId = guardRecord?.gateId || 'gate_main';
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid or expired token' },
    });
  }
}

export function authorizeRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Access denied. Requires role: ${roles.join(', ')}` },
      });
    }
    next();
  };
}
