import { Router } from 'express';
import { settingsController } from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Company Settings Routes
router.get('/company', settingsController.getCompanySettings);
router.put('/company/:id', settingsController.updateCompanySettings);

// System Settings Routes
router.get('/system', settingsController.getAllSystemSettings);
router.get('/system/:key', settingsController.getSystemSetting);
router.post('/system', settingsController.upsertSystemSetting);
router.put('/system/:key', settingsController.upsertSystemSetting);
router.delete('/system/:key', settingsController.deleteSystemSetting);

// Print Settings Routes
router.get('/print', settingsController.getPrintSettings);
router.put('/print', settingsController.updatePrintSettings);

export default router;
