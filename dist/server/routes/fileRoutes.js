import { Router } from 'express';
import { body } from 'express-validator';
import { fileController } from '../controllers/fileController';
import { requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
const router = Router();
// All routes require authentication
// TODO: Re-enable auth in production
// router.use(authenticate);
// Create file
router.post('/', requirePermission('createFile'), validate([
    body('bookingId').notEmpty()
]), fileController.create.bind(fileController));
// Get all files
router.get('/', requirePermission('viewFiles'), fileController.getAll.bind(fileController));
// Get file by ID
router.get('/:id', requirePermission('viewFiles'), fileController.getById.bind(fileController));
// Update file status
router.put('/:id/status', requirePermission('editFile'), validate([
    body('status').isIn(['ACTIVE', 'ARCHIVED', 'CANCELLED'])
]), fileController.updateStatus.bind(fileController));
// Generate PDF
router.post('/:id/generate-pdf', requirePermission('generateFile'), fileController.generatePDF.bind(fileController));
// Download PDF
router.get('/:id/download', requirePermission('viewFiles'), fileController.downloadPDF.bind(fileController));
// Delete file
router.delete('/:id', requirePermission('deleteFile'), fileController.delete.bind(fileController));
export default router;
