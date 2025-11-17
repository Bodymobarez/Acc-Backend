import { Hono } from 'hono';
import { authenticate } from '../middleware-hono/auth';
import { prisma } from '../lib/prisma';

const notifications = new Hono();
notifications.use('*', authenticate);

notifications.get('/', async (c) => {
  try {
    const user = c.get('user');
    
    const list = await prisma.notifications.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    const unreadCount = await prisma.notifications.count({
      where: { userId: user.id, isRead: false }
    });
    
    return c.json({ success: true, data: list, unreadCount });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

notifications.get('/unread', async (c) => {
  try {
    const user = c.get('user');
    
    const list = await prisma.notifications.findMany({
      where: { userId: user.id, isRead: false },
      orderBy: { createdAt: 'desc' }
    });
    
    return c.json({ success: true, data: list });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

notifications.put('/:id/read', async (c) => {
  try {
    const user = c.get('user');
    
    const notification = await prisma.notifications.update({
      where: { id: c.req.param('id'), userId: user.id },
      data: { isRead: true, readAt: new Date() }
    });
    
    return c.json({ success: true, data: notification });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

notifications.put('/mark-all-read', async (c) => {
  try {
    const user = c.get('user');
    
    await prisma.notifications.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    
    return c.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

notifications.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    
    await prisma.notifications.delete({
      where: { id: c.req.param('id'), userId: user.id }
    });
    
    return c.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default notifications;
