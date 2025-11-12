import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthenticatedUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        ...decoded,
        permissions: typeof decoded.permissions === 'string' ? JSON.parse(decoded.permissions) : decoded.permissions
      };
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
    return;
  }
};

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    console.log('Checking permission:', permission);
    console.log('User:', req.user?.email);
    console.log('User role:', req.user?.role);
    console.log('User permissions:', req.user?.permissions);
    
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // ADMIN, SUPER_ADMIN, and FINANCIAL_CONTROLLER have all permissions
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.role === 'FINANCIAL_CONTROLLER') {
      console.log('✅ Access granted: User has admin-level role');
      next();
      return;
    }
    
    if (!req.user.permissions[permission]) {
      console.log('❌ Permission denied for:', permission);
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    console.log('✅ Permission granted');
    next();
  };
};

/**
 * Middleware to check if user has one of the required roles
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient role permissions' });
      return;
    }
    
    next();
  };
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user: AuthenticatedUser): string => {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string
  } as jwt.SignOptions);
};

/**
 * Alias for authenticate - for backwards compatibility
 */
export const authenticateToken = authenticate;


