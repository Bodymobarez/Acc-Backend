import express from 'express';
import { accountController } from '../controllers/accountController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all accounts
router.get('/', accountController.getAll.bind(accountController));

// Get account by ID
router.get('/:id', accountController.getById.bind(accountController));

// Create account
router.post('/', accountController.create.bind(accountController));

// Update account
router.put('/:id', accountController.update.bind(accountController));

// Delete account
router.delete('/:id', accountController.delete.bind(accountController));

export default router;
