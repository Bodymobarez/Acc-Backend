import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
const router = Router();
// All routes require authentication
router.use(authenticate);
/**
 * Get all employees
 */
router.get('/', async (req, res) => {
    try {
        const employees = await prisma.employees.findMany({
            where: {
                isActive: true
            },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: employees
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Get employee by ID
 */
router.get('/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const employee = await prisma.employees.findUnique({
            where: { id: employeeId },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            }
        });
        if (!employee) {
            res.status(404).json({
                success: false,
                error: 'Employee not found'
            });
            return;
        }
        res.json({
            success: true,
            data: employee
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Update employee
 */
router.put('/:employeeId', validate([
    body('defaultCommissionRate').optional().isFloat({ min: 0, max: 100 }),
    body('customCommissionRates').optional().isString(),
    body('department').optional().isString(),
    body('isActive').optional().isBoolean()
]), async (req, res) => {
    try {
        const { employeeId } = req.params;
        const updateData = req.body;
        const employee = await prisma.employees.update({
            where: { id: employeeId },
            data: {
                ...(updateData.defaultCommissionRate !== undefined && { defaultCommissionRate: updateData.defaultCommissionRate }),
                ...(updateData.customCommissionRates !== undefined && { customCommissionRates: updateData.customCommissionRates }),
                ...(updateData.department !== undefined && { department: updateData.department }),
                ...(updateData.isActive !== undefined && { isActive: updateData.isActive })
            },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: employee,
            message: 'Employee updated successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Create employee profile
 */
router.post('/', requirePermission('manageUsers'), validate([
    body('userId').notEmpty().withMessage('User ID is required'),
    body('employeeCode').notEmpty().withMessage('Employee code is required'),
    body('department').optional().isString(),
    body('defaultCommissionRate').optional().isFloat({ min: 0, max: 100 })
]), async (req, res) => {
    try {
        const { userId, employeeCode, department = 'BOOKING', defaultCommissionRate = 0 } = req.body;
        const employee = await prisma.employees.create({
            data: {
                id: randomUUID(),
                userId,
                employeeCode,
                department,
                defaultCommissionRate,
                isActive: true,
                updatedAt: new Date()
            },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: employee,
            message: 'Employee profile created successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Delete employee profile
 */
router.delete('/:employeeId', requirePermission('manageUsers'), async (req, res) => {
    try {
        const { employeeId } = req.params;
        await prisma.employees.delete({
            where: { id: employeeId }
        });
        res.json({
            success: true,
            message: 'Employee profile deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
export default router;
