import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

interface ActivityData {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  changes?: any;
  targetUserId?: string;
  metadata?: any;
}

/**
 * Activity Tracker Middleware
 * Logs all important actions in the system
 */
export const trackActivity = async (
  req: AuthRequest,
  activityData: ActivityData
) => {
  try {
    if (!req.user) return;

    const { action, entityType, entityId, description, changes, targetUserId, metadata } = activityData;

    // Create activity log
    await prisma.activity_logs.create({
      data: {
        id: nanoid(),
        userId: req.user.id,
        action,
        entityType,
        entityId,
        description,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        changes: changes ? JSON.stringify(changes) : null,
        targetUserId,
        metadata: JSON.stringify(metadata || {}),
        createdAt: new Date(),
      },
    });

    // Create notifications for admins about important actions
    if (shouldNotifyAdmins(action, entityType)) {
      await createAdminNotifications(req, activityData);
    }
  } catch (error) {
    console.error('Activity tracking error:', error);
    // Don't throw error to avoid breaking the main request
  }
};

/**
 * Determine if admins should be notified about this action
 */
function shouldNotifyAdmins(action: string, entityType: string): boolean {
  const criticalActions = [
    'CREATE', 'UPDATE', 'DELETE', 
    'APPROVE', 'REJECT', 'CANCEL',
    'EXPORT', 'IMPORT'
  ];
  
  const criticalEntities = [
    'BOOKING', 'INVOICE', 'RECEIPT', 'JOURNAL_ENTRY',
    'CUSTOMER', 'SUPPLIER', 'USER', 'ACCOUNT'
  ];

  return criticalActions.includes(action) && criticalEntities.includes(entityType);
}

/**
 * Create notifications for all admin users
 */
async function createAdminNotifications(
  req: AuthRequest,
  activityData: ActivityData
) {
  try {
    // Get all admin users
    const adminUsers = await prisma.users.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTING'] },
        isActive: true,
        id: { not: req.user!.id }, // Don't notify the user who performed the action
      },
      select: { id: true },
    });

    if (adminUsers.length === 0) return;

    // Create notification for each admin
    const notifications = adminUsers.map((admin) => ({
      id: nanoid(),
      userId: admin.id,
      type: `${activityData.entityType}_${activityData.action}`,
      title: getNotificationTitle(activityData),
      message: activityData.description,
      actionType: activityData.action,
      actionBy: req.user!.id,
      entityType: activityData.entityType,
      entityId: activityData.entityId,
      metadata: JSON.stringify({
        userName: `${req.user!.firstName} ${req.user!.lastName}`,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        ...activityData.metadata,
      }),
      isRead: false,
      createdAt: new Date(),
    }));

    await prisma.notifications.createMany({
      data: notifications,
    });
  } catch (error) {
    console.error('Error creating admin notifications:', error);
  }
}

/**
 * Generate notification title based on action and entity
 */
function getNotificationTitle(activityData: ActivityData): string {
  const { action, entityType } = activityData;
  
  const actionMap: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    APPROVE: 'Approved',
    REJECT: 'Rejected',
    CANCEL: 'Cancelled',
    EXPORT: 'Exported',
    IMPORT: 'Imported',
    LOGIN: 'Logged In',
    LOGOUT: 'Logged Out',
  };

  const entityMap: Record<string, string> = {
    BOOKING: 'Booking',
    INVOICE: 'Invoice',
    RECEIPT: 'Receipt',
    CUSTOMER: 'Customer',
    SUPPLIER: 'Supplier',
    USER: 'User',
    ACCOUNT: 'Account',
    JOURNAL_ENTRY: 'Journal Entry',
    FILE: 'File',
  };

  const actionText = actionMap[action] || action;
  const entityText = entityMap[entityType] || entityType;

  return `${entityText} ${actionText}`;
}

/**
 * Middleware to track API requests automatically
 */
export const activityTrackerMiddleware = (
  entityType: string,
  getEntityId?: (req: AuthRequest) => string | undefined
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      // Track activity after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = getActionFromMethod(req.method);
        const entityId = getEntityId ? getEntityId(req) : req.params.id;

        setImmediate(() => {
          trackActivity(req, {
            action,
            entityType,
            entityId,
            description: generateDescription(req, action, entityType, data),
            changes: getChanges(req, action),
            metadata: {
              method: req.method,
              path: req.path,
              query: req.query,
              body: sanitizeBody(req.body),
            },
          });
        });
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Get action type from HTTP method
 */
function getActionFromMethod(method: string): string {
  const methodMap: Record<string, string> = {
    GET: 'VIEW',
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  };

  return methodMap[method] || method;
}

/**
 * Generate human-readable description
 */
function generateDescription(
  req: AuthRequest,
  action: string,
  entityType: string,
  responseData: any
): string {
  const userName = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Unknown';
  const entityName = entityType.toLowerCase();
  
  switch (action) {
    case 'CREATE':
      return `${userName} created a new ${entityName}`;
    case 'UPDATE':
      return `${userName} updated ${entityName} details`;
    case 'DELETE':
      return `${userName} deleted a ${entityName}`;
    case 'VIEW':
      return `${userName} viewed ${entityName} details`;
    default:
      return `${userName} performed ${action} on ${entityName}`;
  }
}

/**
 * Extract changes from request
 */
function getChanges(req: AuthRequest, action: string): any {
  if (action === 'UPDATE' && req.body) {
    return {
      before: req.params.id ? { id: req.params.id } : null,
      after: sanitizeBody(req.body),
    };
  }
  
  if (action === 'CREATE' && req.body) {
    return {
      created: sanitizeBody(req.body),
    };
  }

  return null;
}

/**
 * Remove sensitive data from body
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
}

/**
 * Track login activity
 */
export const trackLogin = async (
  userId: string,
  email: string,
  ipAddress: string,
  userAgent: string,
  success: boolean
) => {
  try {
    await prisma.activity_logs.create({
      data: {
        id: nanoid(),
        userId,
        action: success ? 'LOGIN' : 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: userId,
        description: success
          ? `User ${email} logged in successfully`
          : `Failed login attempt for ${email}`,
        ipAddress,
        userAgent,
        metadata: JSON.stringify({ success, timestamp: new Date() }),
        createdAt: new Date(),
      },
    });

    // Create notification for admin about login
    if (success) {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, role: true },
      });

      if (user) {
        await createSystemNotification({
          type: 'USER_LOGIN',
          title: 'User Login',
          message: `${user.firstName} ${user.lastName} (${user.role}) logged in`,
          actionType: 'LOGIN',
          actionBy: userId,
          entityType: 'USER',
          entityId: userId,
          metadata: { ipAddress, timestamp: new Date() },
        });
      }
    }
  } catch (error) {
    console.error('Login tracking error:', error);
  }
};

/**
 * Create system-wide notification for admins
 */
async function createSystemNotification(data: {
  type: string;
  title: string;
  message: string;
  actionType?: string;
  actionBy?: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}) {
  try {
    const adminUsers = await prisma.users.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTING'] },
        isActive: true,
        id: data.actionBy ? { not: data.actionBy } : undefined,
      },
      select: { id: true },
    });

    if (adminUsers.length === 0) return;

    const notifications = adminUsers.map((admin) => ({
      id: nanoid(),
      userId: admin.id,
      type: data.type,
      title: data.title,
      message: data.message,
      actionType: data.actionType,
      actionBy: data.actionBy,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: JSON.stringify(data.metadata || {}),
      isRead: false,
      createdAt: new Date(),
    }));

    await prisma.notifications.createMany({
      data: notifications,
    });
  } catch (error) {
    console.error('Error creating system notification:', error);
  }
}

export default {
  trackActivity,
  activityTrackerMiddleware,
  trackLogin,
};
