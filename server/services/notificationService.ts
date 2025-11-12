import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma';

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionType?: string;
  actionBy?: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}

export interface NotificationFilters {
  userId?: string;
  isRead?: boolean;
  type?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class NotificationService {
  /**
   * Create a single notification
   */
  async createNotification(data: CreateNotificationData) {
    try {
      return await prisma.notifications.create({
        data: {
          id: nanoid(),
          userId: data.userId,
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
        },
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(userIds: string[], data: Omit<CreateNotificationData, 'userId'>) {
    try {
      const notifications = userIds.map((userId) => ({
        id: nanoid(),
        userId,
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

      return await prisma.notifications.createMany({
        data: notifications,
      });
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(filters: NotificationFilters) {
    try {
      const where: any = {};

      if (filters.userId) where.userId = filters.userId;
      if (filters.isRead !== undefined) where.isRead = filters.isRead;
      if (filters.type) where.type = filters.type;
      if (filters.entityType) where.entityType = filters.entityType;
      
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const [notifications, total] = await Promise.all([
        prisma.notifications.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 50,
          skip: filters.offset || 0,
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
          },
        }),
        prisma.notifications.count({ where }),
      ]);

      // Parse metadata
      const parsedNotifications = notifications.map((notification: any) => ({
        ...notification,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : {},
      }));

      return {
        notifications: parsedNotifications,
        total,
        unread: filters.isRead === undefined
          ? await this.getUnreadCount(filters.userId!)
          : undefined,
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.notifications.count({
        where: {
          userId,
          isRead: false,
        },
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      return await prisma.notifications.updateMany({
        where: {
          id: notificationId,
          userId, // Ensure user owns the notification
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    try {
      return await prisma.notifications.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      return await prisma.notifications.deleteMany({
        where: {
          id: notificationId,
          userId, // Ensure user owns the notification
        },
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(userId: string) {
    try {
      return await prisma.notifications.deleteMany({
        where: {
          userId,
          isRead: true,
        },
      });
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
  }

  /**
   * Get recent activity logs
   */
  async getActivityLogs(filters: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {};

      if (filters.userId) where.userId = filters.userId;
      if (filters.entityType) where.entityType = filters.entityType;
      if (filters.entityId) where.entityId = filters.entityId;
      if (filters.action) where.action = filters.action;

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const [activities, total] = await Promise.all([
        prisma.activity_logs.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.limit || 50,
          skip: filters.offset || 0,
          include: {
            users_activity_logs_userIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                avatar: true,
              },
            },
            users_activity_logs_targetUserIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.activity_logs.count({ where }),
      ]);

      // Parse JSON fields
      const parsedActivities = activities.map((activity: any) => ({
        ...activity,
        changes: activity.changes ? JSON.parse(activity.changes) : null,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : {},
      }));

      return {
        activities: parsedActivities,
        total,
      };
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(userId?: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: any = {
        createdAt: { gte: startDate },
      };

      if (userId) where.userId = userId;

      const stats = await prisma.activity_logs.groupBy({
        by: ['action', 'entityType'],
        where,
        _count: true,
      });

      return stats.map((stat: any) => ({
        action: stat.action,
        entityType: stat.entityType,
        count: stat._count,
      }));
    } catch (error) {
      console.error('Error getting activity stats:', error);
      throw error;
    }
  }

  /**
   * Create notification for booking actions
   */
  async notifyBookingAction(
    action: 'CREATED' | 'UPDATED' | 'DELETED' | 'APPROVED' | 'CANCELLED',
    bookingId: string,
    bookingNumber: string,
    performedBy: { id: string; firstName: string; lastName: string }
  ) {
    try {
      const admins = await prisma.users.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTING'] },
          isActive: true,
          id: { not: performedBy.id },
        },
        select: { id: true },
      });

      const actionMap = {
        CREATED: 'created',
        UPDATED: 'updated',
        DELETED: 'deleted',
        APPROVED: 'approved',
        CANCELLED: 'cancelled',
      };

      await this.createBulkNotifications(
        admins.map((a) => a.id),
        {
          type: `BOOKING_${action}`,
          title: `Booking ${actionMap[action]}`,
          message: `${performedBy.firstName} ${performedBy.lastName} ${actionMap[action]} booking #${bookingNumber}`,
          actionType: action,
          actionBy: performedBy.id,
          entityType: 'BOOKING',
          entityId: bookingId,
          metadata: {
            bookingNumber,
            userName: `${performedBy.firstName} ${performedBy.lastName}`,
          },
        }
      );
    } catch (error) {
      console.error('Error notifying booking action:', error);
    }
  }

  /**
   * Create notification for invoice actions
   */
  async notifyInvoiceAction(
    action: 'CREATED' | 'UPDATED' | 'PAID' | 'CANCELLED',
    invoiceId: string,
    invoiceNumber: string,
    performedBy: { id: string; firstName: string; lastName: string }
  ) {
    try {
      const admins = await prisma.users.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTING'] },
          isActive: true,
          id: { not: performedBy.id },
        },
        select: { id: true },
      });

      const actionMap = {
        CREATED: 'created',
        UPDATED: 'updated',
        PAID: 'marked as paid',
        CANCELLED: 'cancelled',
      };

      await this.createBulkNotifications(
        admins.map((a) => a.id),
        {
          type: `INVOICE_${action}`,
          title: `Invoice ${actionMap[action]}`,
          message: `${performedBy.firstName} ${performedBy.lastName} ${actionMap[action]} invoice #${invoiceNumber}`,
          actionType: action,
          actionBy: performedBy.id,
          entityType: 'INVOICE',
          entityId: invoiceId,
          metadata: {
            invoiceNumber,
            userName: `${performedBy.firstName} ${performedBy.lastName}`,
          },
        }
      );
    } catch (error) {
      console.error('Error notifying invoice action:', error);
    }
  }
}

export default new NotificationService();
