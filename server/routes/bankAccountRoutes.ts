import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { bankAccountController } from '../controllers/bankAccountController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Bank account routes
router.post('/', bankAccountController.create);
router.get('/', bankAccountController.getAll);
router.get('/statistics', bankAccountController.getStatistics);
router.get('/:id', bankAccountController.getById);
router.put('/:id', bankAccountController.update);
router.put('/:id/balance', bankAccountController.updateBalance);
router.delete('/:id', bankAccountController.delete);

export default router;
