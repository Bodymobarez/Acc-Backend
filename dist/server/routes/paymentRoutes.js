import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { paymentController } from '../controllers/paymentController';
const router = Router();
// All routes require authentication
router.use(authenticate);
// Payment routes
router.post('/', paymentController.create);
router.get('/', paymentController.getAll);
router.get('/statistics', paymentController.getStatistics);
router.get('/generate-number', paymentController.generateNumber);
router.get('/:id', paymentController.getById);
router.put('/:id', paymentController.update);
router.delete('/:id', paymentController.delete);
export default router;
