import { Router, Response } from 'express';
import { getDb } from '../database/db';
import { generateToken, AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { mobile, role } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Mobile number is required' },
    });
  }

  const db = getDb();
  let user = db.users.find((u) => u.mobile.replace(/\D/g, '') === mobile.replace(/\D/g, ''));

  if (!user && role) {
    // Demo user fallback if role provided
    user = db.users.find((u) => u.role === role);
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not registered in society database' },
    });
  }

  const tokenUser = {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    societyId: user.societyId,
  };

  const token = generateToken(tokenUser);

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        societyId: user.societyId,
      },
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: req.user,
  });
});

export default router;
