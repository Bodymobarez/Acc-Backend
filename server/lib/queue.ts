import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

// ==================== Redis Connection ====================

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// ==================== Queue Definitions ====================

export const emailQueue = new Queue('email', { connection });
export const reportQueue = new Queue('reports', { connection });
export const invoiceQueue = new Queue('invoices', { connection });
export const currencyQueue = new Queue('currency', { connection });
export const notificationQueue = new Queue('notifications', { connection });

// ==================== Job Schedulers ====================
// Note: QueueScheduler is deprecated in BullMQ v3+
// Scheduling functionality is now built into Queue itself

// ==================== Job Types ====================

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface ReportJobData {
  type: 'sales' | 'financial' | 'commission' | 'custom';
  userId: string;
  filters: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    supplierId?: string;
  };
  format: 'pdf' | 'excel' | 'csv';
}

export interface InvoiceJobData {
  invoiceId: string;
  action: 'generate-pdf' | 'send-email' | 'mark-paid';
}

export interface CurrencyJobData {
  baseCurrency?: string;
  targetCurrencies?: string[];
}

export interface NotificationJobData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  link?: string;
}

// ==================== Job Utilities ====================

export const jobs = {
  // ========== Email Jobs ==========
  
  async sendEmail(data: EmailJobData) {
    await emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
    console.log('📧 Email job queued:', data.to);
  },

  // ========== Report Jobs ==========
  
  async generateReport(data: ReportJobData) {
    await reportQueue.add('generate-report', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      priority: data.type === 'financial' ? 1 : 5, // Financial reports have higher priority
    });
    console.log('📊 Report job queued:', data.type);
  },

  // ========== Invoice Jobs ==========
  
  async generateInvoicePDF(invoiceId: string) {
    await invoiceQueue.add('generate-pdf', { 
      invoiceId, 
      action: 'generate-pdf' 
    } as InvoiceJobData);
    console.log('📄 Invoice PDF job queued:', invoiceId);
  },

  async sendInvoiceEmail(invoiceId: string) {
    await invoiceQueue.add('send-email', { 
      invoiceId, 
      action: 'send-email' 
    } as InvoiceJobData);
    console.log('✉️  Invoice email job queued:', invoiceId);
  },

  // ========== Currency Jobs ==========
  
  async updateCurrencyRates() {
    await currencyQueue.add('update-rates', {} as CurrencyJobData, {
      repeat: {
        pattern: '0 0 * * *', // Every day at midnight
      },
    });
    console.log('💱 Currency update job scheduled');
  },

  // ========== Notification Jobs ==========
  
  async sendNotification(data: NotificationJobData) {
    await notificationQueue.add('send-notification', data);
    console.log('🔔 Notification job queued:', data.userId);
  },

  async sendBulkNotifications(notifications: NotificationJobData[]) {
    const jobs = notifications.map((data, index) => ({
      name: 'send-notification',
      data,
      opts: { delay: index * 100 }, // Stagger by 100ms
    }));
    
    await notificationQueue.addBulk(jobs);
    console.log(`🔔 ${notifications.length} notification jobs queued`);
  },
};

// ==================== Queue Status ====================

export const queueStatus = {
  async getStats(queueName: 'email' | 'reports' | 'invoices' | 'currency' | 'notifications') {
    const queueMap = {
      email: emailQueue,
      reports: reportQueue,
      invoices: invoiceQueue,
      currency: currencyQueue,
      notifications: notificationQueue,
    };

    const queue = queueMap[queueName];
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  },

  async getAllStats() {
    const [email, reports, invoices, currency, notifications] = await Promise.all([
      queueStatus.getStats('email'),
      queueStatus.getStats('reports'),
      queueStatus.getStats('invoices'),
      queueStatus.getStats('currency'),
      queueStatus.getStats('notifications'),
    ]);

    return {
      email,
      reports,
      invoices,
      currency,
      notifications,
    };
  },
};

// ==================== Job Cleanup ====================

export const cleanup = {
  async cleanOldJobs(queueName: 'email' | 'reports' | 'invoices' | 'currency' | 'notifications') {
    const queueMap = {
      email: emailQueue,
      reports: reportQueue,
      invoices: invoiceQueue,
      currency: currencyQueue,
      notifications: notificationQueue,
    };

    const queue = queueMap[queueName];
    
    // Remove completed jobs older than 7 days
    await queue.clean(7 * 24 * 60 * 60 * 1000, 1000, 'completed');
    
    // Remove failed jobs older than 30 days
    await queue.clean(30 * 24 * 60 * 60 * 1000, 1000, 'failed');
    
    console.log(`🧹 Cleaned old jobs from ${queueName} queue`);
  },

  async cleanAllQueues() {
    await Promise.all([
      cleanup.cleanOldJobs('email'),
      cleanup.cleanOldJobs('reports'),
      cleanup.cleanOldJobs('invoices'),
      cleanup.cleanOldJobs('currency'),
      cleanup.cleanOldJobs('notifications'),
    ]);
    console.log('🧹 All queues cleaned');
  },
};

// ==================== Export ====================

export { connection };
