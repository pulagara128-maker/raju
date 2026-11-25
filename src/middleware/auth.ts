import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: {
    id: number;
    uid: string;
    email: string;
    role: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const email = decodedToken.email || `${decodedToken.uid}@unknown.local`;
    const dbUser = await getOrCreateUser(decodedToken.uid, email);
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireStaffOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const role = req.dbUser?.role;
  if (role === 'admin' || role === 'staff') {
    return next();
  }
  if (role === 'disabled') {
    return res.status(403).json({
      error: 'Access disabled: This account has been deactivated by the restaurant admin.',
    });
  }
  return res.status(403).json({
    error:
      'Access pending approval: Your Google account has been recorded. Ask the restaurant admin to grant Staff or Admin permissions.',
  });
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.dbUser || req.dbUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden: Restaurant Admin permissions are required for this action.',
    });
  }
  next();
};
