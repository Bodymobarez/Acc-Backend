import type { Context } from 'hono';
import jwt from 'jsonwebtoken';
import type { AuthenticatedUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authentication middleware for Hono
 */
export const authenticate = async (c: Context, next: () => Promise<void>) => {
  try {
    const authHeader = c.req.header('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      c.set('user', {
        ...decoded,
        permissions: typeof decoded.permissions === 'string' ? JSON.parse(decoded.permissions) : decoded.permissions
      } as AuthenticatedUser);
      await next();
    } catch (error) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
  } catch (error) {
    return c.json({ error: 'Authentication error' }, 500);
  }
};

/**
 * Permission check middleware factory
 */
export const requirePermission = (permission: string) => {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get('user') as AuthenticatedUser | undefined;
    
    console.log('Checking permission:', permission);
    console.log('User:', user?.email);
    console.log('User role:', user?.role);
    console.log('User permissions:', user?.permissions);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // ADMIN, SUPER_ADMIN, and FINANCIAL_CONTROLLER have all permissions
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'FINANCIAL_CONTROLLER') {
      console.log('✅ Access granted: User has admin-level role');
      await next();
      return;
    }
    
    if (!user.permissions[permission]) {
      console.log('❌ Permission denied for:', permission);
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    console.log('✅ Permission granted');
    await next();
  };
};

/**
 * Role check middleware factory
 */
export const requireRole = (roles: string[]) => {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get('user') as AuthenticatedUser | undefined;
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Insufficient role permissions' }, 403);
    }
    
    await next();
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
