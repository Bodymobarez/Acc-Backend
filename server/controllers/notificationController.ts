import { Request, Response } from 'express';
import notificationService from '../services/notificationService';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

class NotificationController {
  /**
   * Get user notifications
   */
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Temporarily disabled - return empty notifications
      res.json({
        notifications: [],
        total: 0,
        limit: 50,
        offset: 0
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Temporarily disabled
      res.json({ count: 0 });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Temporarily disabled
      res.json({ success: true });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Temporarily disabled
      res.json({ success: true });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Temporarily disabled
      res.json({ success: true });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Temporarily disabled
      res.json({ success: true });
    } catch (error) {
      console.error('Delete all read error:', error);
      res.status(500).json({ error: 'Failed to delete all read notifications' });
    }
  }

  /**
   * Get activity logs (admin only)
   */
  async getActivityLogs(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user is admin
      if (!['ADMIN', 'SUPER_ADMIN', 'ACCOUNTING'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Temporarily disabled
      res.json({
        logs: [],
        total: 0,
        limit: 100,
        offset: 0
      });
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({ error: 'Failed to get activity logs' });
    }
  }

  /**
   * Get activity statistics (admin only)
   */
  async getActivityStats(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if user is admin
      if (!['ADMIN', 'SUPER_ADMIN', 'ACCOUNTING'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Temporarily disabled
      res.json({
        stats: {
          totalActivities: 0,
          byType: {},
          byEntityType: {},
          byUser: [],
          recentActivities: []
        }
      });
    } catch (error) {
      console.error('Get activity stats error:', error);
      res.status(500).json({ error: 'Failed to get activity stats' });
    }
  }
}

export default new NotificationController();
