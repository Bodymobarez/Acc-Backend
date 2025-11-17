import { Router } from 'express';
import { body } from 'express-validator';
import { airlineController } from '../controllers/airlineController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
const router = Router();
// All routes require authentication
router.use(authenticate);
// Get all airlines
router.get('/', airlineController.getAll.bind(airlineController));
// Create new airline
router.post('/', validate([
    body('name').notEmpty().withMessage('Airline name is required')
]), airlineController.create.bind(airlineController));
// Get or create airline (used when saving booking)
router.post('/get-or-create', validate([
    body('name').notEmpty().withMessage('Airline name is required')
]), airlineController.getOrCreate.bind(airlineController));
export default router;
