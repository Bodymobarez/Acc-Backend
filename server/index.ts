import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Get the directory name - compatible with both ESM and CommonJS
const getDirectoryPath = () => {
  // Check if running in CommonJS mode (bundled by esbuild/NFT)
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // Fallback for other environments
  return process.cwd();
};

const dirPath = getDirectoryPath();

// Load environment variables FIRST before any other imports
dotenv.config({ path: path.join(dirPath, '../.env') });

import { prisma } from './lib/prisma';
import { startCurrencyUpdateCron, stopCurrencyUpdateCron } from './jobs/currencyUpdateCron';

// Import routes
import authRoutes from './routes/authRoutes';
import bookingRoutes from './routes/bookingRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import fileRoutes from './routes/fileRoutes';
import userRoutes from './routes/userRoutes';
import settingsRoutes from './routes/settingsRoutes';
import customerRoutes from './routes/customerRoutes';
import supplierRoutes from './routes/supplierRoutes';
import accountRoutes from './routes/accountRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import employeeRoutes from './routes/employeeRoutes';
import placesRoutes from './routes/placesRoutes';
import receiptRoutes from './routes/receiptRoutes';
import currencyRoutes from './routes/currencyRoutes';
import journalRoutes from './routes/journalRoutes';
import systemSettingsRoutes from './routes/systemSettingsRoutes';
import relationshipRoutes from './routes/relationshipRoutes';
import commissionRoutes from './routes/commissionRoutes';
import customerAssignmentRoutes from './routes/customerAssignmentRoutes';
import locationRoutes from './routes/locationRoutes';
import airlineRoutes from './routes/airlineRoutes';
import migrationRoutes from './routes/migrationRoutes';
import reportRoutes from './routes/reportRoutes';
import advancedReportRoutes from './routes/advancedReportRoutes';
import notificationRoutes from './routes/notifications';
import employeeCommissionRoutes from './routes/employeeCommissionRoutes';
import generalLedgerRoutes from './routes/generalLedgerRoutes';
import paymentRoutes from './routes/paymentRoutes';
import bankAccountRoutes from './routes/bankAccountRoutes';

// Initialize Express app
const app: Express = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Export prisma for backward compatibility
export { prisma };

// Middleware
// CORS configuration - Allow all origins for maximum compatibility
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set security headers including CSP
app.use((req: Request, res: Response, next) => {
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    // Netlify handles SSL, so we trust x-forwarded-proto header
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: http://localhost:* ws://localhost:*; upgrade-insecure-requests;"
  );
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// Handle preflight requests
app.options('*', (req: Request, res: Response) => {
  res.status(200).end();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Health check (for platforms routing through /api/*)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// DB Health check - verifies Prisma can connect to the database
app.get('/api/health/db', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    // a simple roundtrip to DB; works for Postgres
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;
    res.json({
      status: 'ok',
      db: 'connected',
      durationMs: duration,
      prisma: {
        datasourceUrl: !!process.env.DATABASE_URL,
      }
    });
  } catch (error: any) {
    console.error('❌ DB health check failed:', error);
    res.status(500).json({
      status: 'error',
      db: 'disconnected',
      message: error?.message || 'Unknown error'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/journal-entries', journalRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/customer-assignments', customerAssignmentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/airlines', airlineRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/reports/old', reportRoutes);
app.use('/api/reports/employee-commissions', employeeCommissionRoutes);
app.use('/api/reports/general-ledger', generalLedgerRoutes);
app.use('/api/reports', advancedReportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);

// Serve static files from dist folder (for production)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(dirPath, '../dist');
  console.log('📁 Serving static files from:', distPath);
  
  // Serve static assets
  app.use(express.static(distPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req: Request, res: Response) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        error: 'API route not found'
      });
    }
    
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API route not found'
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize application
async function initialize() {
  try {
    // Start server first, then try database connection in background
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Local: http://localhost:${port}`);
      console.log(`🌐 Network: http://0.0.0.0:${port}`);
      console.log(`❤️  Health check: http://localhost:${port}/health`);
    });
    
    // Try database connection with retry in background
    console.log('⏳ Attempting database connection...');
    let retries = 5;
    let connected = false;
    
    while (retries > 0 && !connected) {
      try {
        await prisma.$connect();
        connected = true;
        console.log('✅ Database connected successfully');
        // Start currency update cron job only after DB is connected
        startCurrencyUpdateCron();
      } catch (error) {
        retries--;
        if (retries > 0) {
          console.log(`⚠️  Database connection failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.error('❌ Database connection failed after all retries');
          console.error('⚠️  Server is running but database operations will fail');
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    // Don't exit, let server run even if DB fails
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopCurrencyUpdateCron();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopCurrencyUpdateCron();
  await prisma.$disconnect();
  process.exit(0);
});

// Start the application only when not running on Vercel/Netlify serverless
if (!process.env.VERCEL && !process.env.NETLIFY) {
  initialize();
}

// Export for serverless environments
export { app };
export default app;

