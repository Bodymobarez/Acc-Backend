import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authService } from '../services/authService';
import type { Context } from 'hono';
import type { AuthenticatedUser } from '../types';
import { authenticate } from '../middleware-hono/auth';

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1).trim(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3).trim(),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'BOOKING_AGENT', 'CUSTOMER_SERVICE', 'MANAGER']),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// Initialize router
const auth = new Hono();

/**
 * POST /login - User login
 */
auth.post('/login', zValidator('json', loginSchema), async (c: Context) => {
  try {
    const { username, password } = c.req.valid('json');
    
    console.log('🔐 Login attempt for username:', username);
    
    const result = await authService.login({ username, password });
    
    console.log('✅ Login successful for:', username);
    
    return c.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ Login error:', error.message);
    console.error('Stack:', error.stack);
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * POST /register - User registration
 */
auth.post('/register', zValidator('json', registerSchema), async (c: Context) => {
  try {
    const data = c.req.valid('json');
    
    const result = await authService.register(data);
    
    return c.json({
      success: true,
      data: result
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * GET /profile - Get user profile (protected)
 */
auth.get('/profile', authenticate, async (c: Context) => {
  try {
    const user = c.get('user') as AuthenticatedUser | undefined;
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await authService.getProfile(user.id);
    
    return c.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * PUT /profile - Update user profile (protected)
 */
auth.put('/profile', authenticate, zValidator('json', updateProfileSchema), async (c: Context) => {
  try {
    const user = c.get('user') as AuthenticatedUser | undefined;
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { firstName, lastName } = c.req.valid('json');
    
    const updatedProfile = await authService.updateProfile(user.id, {
      firstName,
      lastName
    });
    
    return c.json({
      success: true,
      data: updatedProfile
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * POST /change-password - Change password (protected)
 */
auth.post('/change-password', authenticate, zValidator('json', changePasswordSchema), async (c: Context) => {
  try {
    const user = c.get('user') as AuthenticatedUser | undefined;
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { oldPassword, newPassword } = c.req.valid('json');
    
    await authService.changePassword(user.id, oldPassword, newPassword);
    
    return c.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

export default auth;
