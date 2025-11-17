import express from 'express';
import notificationController from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';
const router = express.Router();
// All routes require authentication
router.use(authenticateToken);
/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', notificationController.getNotifications);
/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread-count', notificationController.getUnreadCount);
/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', notificationController.markAsRead);
/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', notificationController.markAllAsRead);
/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', notificationController.deleteNotification);
/**
 * @route   DELETE /api/notifications/read/all
 * @desc    Delete all read notifications
 * @access  Private
 */
router.delete('/read/all', notificationController.deleteAllRead);
/**
 * @route   GET /api/notifications/activity-logs
 * @desc    Get activity logs (admin only)
 * @access  Private (Admin)
 */
router.get('/activity-logs', notificationController.getActivityLogs);
/**
 * @route   GET /api/notifications/activity-stats
 * @desc    Get activity statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/activity-stats', notificationController.getActivityStats);
export default router;
