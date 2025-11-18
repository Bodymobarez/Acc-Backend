import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { cashRegisterController } from '../controllers/cashRegisterController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Cash register routes
router.post('/', cashRegisterController.create);
router.get('/', cashRegisterController.getAll);
router.get('/:id', cashRegisterController.getById);
router.put('/:id', cashRegisterController.update);
router.put('/:id/balance', cashRegisterController.updateBalance);
router.delete('/:id', cashRegisterController.delete);

export default router;
