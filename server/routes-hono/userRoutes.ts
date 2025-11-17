import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Context } from 'hono';
import type { AuthenticatedUser } from '../types';
import { authenticate } from '../middleware-hono/auth';
import { userController } from '../controllers/userController';

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3).trim(),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).trim(),
  lastName: z.string().min(1).trim(),
  role: z.string().min(1),
});

const updateUserSchema = z.object({
  username: z.string().min(3).trim().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  role: z.string().optional(),
});

// Initialize router
const users = new Hono();

// All routes require authentication
users.use('*', authenticate);

/**
 * GET /stats - Get user statistics (MUST be before /:id route)
 */
users.get('/stats', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    let result: any;
    const fakeRes: any = {
      json: (data: any) => {
        result = data;
        return fakeRes;
      },
      status: (code: number) => {
        fakeRes.statusCode = code;
        return fakeRes;
      }
    };
    
    await userController.getUserStats(fakeReq, fakeRes);
    return c.json(result || { success: true }, fakeRes.statusCode || 200);
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * GET / - Get all users
 */
users.get('/', async (c: Context) => {
  try {
    const fakeReq: any = { user: c.get('user') };
    let result: any;
    const fakeRes: any = {
      json: (data: any) => {
        result = data;
        return fakeRes;
      },
      status: (code: number) => {
        fakeRes.statusCode = code;
        return fakeRes;
      }
    };
    
    await userController.getAllUsers(fakeReq, fakeRes);
    return c.json(result || [], fakeRes.statusCode || 200);
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * GET /:id - Get user by ID
 */
users.get('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const fakeReq: any = { params: { id }, user: c.get('user') };
    let result: any;
    const fakeRes: any = {
      json: (data: any) => {
        result = data;
        return fakeRes;
      },
      status: (code: number) => {
        fakeRes.statusCode = code;
        return fakeRes;
      }
    };
    
    await userController.getUserById(fakeReq, fakeRes);
    return c.json(result || { success: false }, fakeRes.statusCode || 404);
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

/**
 * POST / - Create new user
 */
users.post(
  '/',
  zValidator('json', createUserSchema),
  async (c: Context) => {
    try {
      const data = c.req.valid('json');
      
      const fakeReq: any = { body: data, user: c.get('user') };
      let result: any;
      const fakeRes: any = {
        json: (data: any) => {
          result = data;
          return fakeRes;
        },
        status: (code: number) => {
          fakeRes.statusCode = code;
          return fakeRes;
        }
      };
      
      await userController.createUser(fakeReq, fakeRes);
      return c.json(result || { success: true }, fakeRes.statusCode || 201);
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * PUT /:id - Update user
 */
users.put(
  '/:id',
  zValidator('json', updateUserSchema),
  async (c: Context) => {
    try {
      const id = c.req.param('id');
      const data = c.req.valid('json');
      
      const fakeReq: any = { params: { id }, body: data, user: c.get('user') };
      let result: any;
      const fakeRes: any = {
        json: (data: any) => {
          result = data;
          return fakeRes;
        },
        status: (code: number) => {
          fakeRes.statusCode = code;
          return fakeRes;
        }
      };
      
      await userController.updateUser(fakeReq, fakeRes);
      return c.json(result || { success: true }, fakeRes.statusCode || 200);
    } catch (error: any) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
  }
);

/**
 * DELETE /:id - Delete user
 */
users.delete('/:id', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const fakeReq: any = { params: { id }, user: c.get('user') };
    let result: any;
    const fakeRes: any = {
      json: (data: any) => {
        result = data;
        return fakeRes;
      },
      status: (code: number) => {
        fakeRes.statusCode = code;
        return fakeRes;
      }
    };
    
    await userController.deleteUser(fakeReq, fakeRes);
    return c.json(result || { success: true }, fakeRes.statusCode || 200);
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
    }
  }
);

/**
 * PATCH /:id/toggle-status - Toggle user status
 */
users.patch('/:id/toggle-status', async (c: Context) => {
  try {
    const id = c.req.param('id');
    
    const fakeReq: any = { params: { id }, user: c.get('user') };
    let result: any;
    const fakeRes: any = {
      json: (data: any) => {
        result = data;
        return fakeRes;
      },
      status: (code: number) => {
        fakeRes.statusCode = code;
        return fakeRes;
      }
    };
    
    await userController.toggleUserStatus(fakeReq, fakeRes);
    return c.json(result || { success: true }, fakeRes.statusCode || 200);
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 400);
  }
});

export default users;
