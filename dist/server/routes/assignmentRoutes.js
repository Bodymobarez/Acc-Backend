import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { assignCustomerToUser, unassignCustomerFromUser, getUserAssignmentInfo } from '../middleware/rbac';
import { prisma } from '../index';
import { randomUUID } from 'crypto';
const router = Router();
// All routes require authentication
router.use(authenticate);
/**
 * Get all customer assignments (default route)
 */
router.get('/', async (req, res) => {
    try {
        const assignments = await prisma.customer_assignments.findMany({
            where: {
                isActive: true
            },
            include: {
                customers: {
                    select: {
                        id: true,
                        customerCode: true,
                        firstName: true,
                        lastName: true,
                        companyName: true,
                        email: true,
                        phone: true
                    }
                },
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
                assignedDate: 'desc'
            }
        });
        // Transform the data to match frontend expectations
        const transformedAssignments = assignments.map(assignment => ({
            ...assignment,
            customer: assignment.customers,
            user: assignment.users
        }));
        res.json({
            success: true,
            data: transformedAssignments
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
 * Get all customer assignments
 * Admin only
 */
router.get('/customers', requirePermission('manageUsers'), async (req, res) => {
    try {
        const assignments = await prisma.customer_assignments.findMany({
            where: {
                isActive: true
            },
            include: {
                customers: {
                    select: {
                        id: true,
                        customerCode: true,
                        companyName: true,
                        email: true,
                        phone: true
                    }
                },
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
                assignedDate: 'desc'
            }
        });
        res.json({
            success: true,
            data: assignments
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
 * Get assignments for a specific user
 */
router.get('/users/:userId/customers', async (req, res) => {
    try {
        const { userId } = req.params;
        // Non-admin users can only view their own assignments
        if (req.user?.role !== 'ADMIN' && req.user?.id !== userId) {
            res.status(403).json({
                success: false,
                error: 'Access denied'
            });
            return;
        }
        const info = await getUserAssignmentInfo(userId);
        res.json({
            success: true,
            data: info
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
 * Get current user's assignments
 */
router.get('/my-assignments', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const info = await getUserAssignmentInfo(req.user.id);
        res.json({
            success: true,
            data: info
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
 * Create new customer assignment
 */
router.post('/', requirePermission('createCustomer'), validate([
    body('customerId').notEmpty().withMessage('Customer ID is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('assignedRole').optional().isString(),
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }),
    body('flightCommission').optional().isFloat({ min: 0, max: 100 }),
    body('hotelCommission').optional().isFloat({ min: 0, max: 100 }),
    body('visaCommission').optional().isFloat({ min: 0, max: 100 }),
    body('transferCommission').optional().isFloat({ min: 0, max: 100 }),
    body('cruiseCommission').optional().isFloat({ min: 0, max: 100 }),
    body('rentalCarCommission').optional().isFloat({ min: 0, max: 100 }),
    body('trainCommission').optional().isFloat({ min: 0, max: 100 }),
    body('activityCommission').optional().isFloat({ min: 0, max: 100 })
]), async (req, res) => {
    try {
        const { customerId, userId, assignedRole = 'SALES', commissionRate, flightCommission, hotelCommission, visaCommission, transferCommission, cruiseCommission, rentalCarCommission, trainCommission, activityCommission } = req.body;
        if (!customerId || !userId) {
            res.status(400).json({
                success: false,
                error: 'Customer ID and User ID are required'
            });
            return;
        }
        // Check if assignment already exists
        const existing = await prisma.customer_assignments.findFirst({
            where: {
                customerId,
                userId,
                assignedRole,
                isActive: true
            }
        });
        if (existing) {
            // Update existing assignment
            const updated = await prisma.customer_assignments.update({
                where: { id: existing.id },
                data: {
                    commissionRate: commissionRate || null,
                    flightCommission: flightCommission || null,
                    hotelCommission: hotelCommission || null,
                    visaCommission: visaCommission || null,
                    transferCommission: transferCommission || null,
                    cruiseCommission: cruiseCommission || null,
                    rentalCarCommission: rentalCarCommission || null,
                    trainCommission: trainCommission || null,
                    activityCommission: activityCommission || null,
                    updatedAt: new Date()
                },
                include: {
                    customers: true,
                    users: true
                }
            });
            res.json({
                success: true,
                data: updated,
                message: 'Customer assignment updated successfully'
            });
        }
        else {
            // Create new assignment
            const assignment = await prisma.customer_assignments.create({
                data: {
                    id: randomUUID(),
                    customerId,
                    userId,
                    assignedRole,
                    commissionRate,
                    flightCommission,
                    hotelCommission,
                    visaCommission,
                    transferCommission,
                    cruiseCommission,
                    rentalCarCommission,
                    trainCommission,
                    activityCommission,
                    isActive: true,
                    updatedAt: new Date()
                },
                include: {
                    customers: true,
                    users: true
                }
            });
            res.status(201).json({
                success: true,
                data: assignment,
                message: 'Customer assignment created successfully'
            });
        }
    }
    catch (error) {
        console.error('Error in assignment creation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * Delete customer assignment
 */
router.delete('/:assignmentId', async (req, res) => {
    try {
        const { assignmentId } = req.params;
        await prisma.customer_assignments.delete({
            where: { id: assignmentId }
        });
        res.json({
            success: true,
            message: 'Assignment deleted successfully'
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
 * Assign customer to user
 * Admin only
 */
router.post('/assign', requirePermission('manageUsers'), validate([
    body('customerId').notEmpty().withMessage('Customer ID is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('assignedRole').optional().isString(),
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }),
    body('flightCommission').optional().isFloat({ min: 0, max: 100 }),
    body('hotelCommission').optional().isFloat({ min: 0, max: 100 }),
    body('visaCommission').optional().isFloat({ min: 0, max: 100 }),
    body('transferCommission').optional().isFloat({ min: 0, max: 100 }),
    body('cruiseCommission').optional().isFloat({ min: 0, max: 100 })
]), async (req, res) => {
    try {
        const { customerId, userId, assignedRole = 'SALES', ...commissionRates } = req.body;
        const assignment = await assignCustomerToUser(customerId, userId, assignedRole, commissionRates);
        res.status(201).json({
            success: true,
            data: assignment,
            message: 'Customer assigned successfully'
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
 * Update customer assignment (e.g., commission rates)
 * Admin only
 */
router.put('/:assignmentId', requirePermission('manageUsers'), async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const updateData = req.body;
        const assignment = await prisma.customer_assignments.update({
            where: { id: assignmentId },
            data: {
                ...(updateData.assignedRole && { assignedRole: updateData.assignedRole }),
                ...(updateData.commissionRate !== undefined && { commissionRate: updateData.commissionRate }),
                ...(updateData.flightCommission !== undefined && { flightCommission: updateData.flightCommission }),
                ...(updateData.hotelCommission !== undefined && { hotelCommission: updateData.hotelCommission }),
                ...(updateData.visaCommission !== undefined && { visaCommission: updateData.visaCommission }),
                ...(updateData.transferCommission !== undefined && { transferCommission: updateData.transferCommission }),
                ...(updateData.cruiseCommission !== undefined && { cruiseCommission: updateData.cruiseCommission }),
                ...(updateData.notes !== undefined && { notes: updateData.notes }),
                updatedAt: new Date()
            },
            include: {
                customers: true,
                users: true
            }
        });
        res.json({
            success: true,
            data: assignment,
            message: 'Assignment updated successfully'
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
 * Unassign customer from user
 * Admin only
 */
router.post('/unassign', requirePermission('manageUsers'), validate([
    body('customerId').notEmpty(),
    body('userId').notEmpty(),
    body('assignedRole').optional().isString()
]), async (req, res) => {
    try {
        const { customerId, userId, assignedRole = 'SALES' } = req.body;
        await unassignCustomerFromUser(customerId, userId, assignedRole);
        res.json({
            success: true,
            message: 'Customer unassigned successfully'
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
 * Bulk assign customers to user
 * Admin only
 */
router.post('/bulk-assign', requirePermission('manageUsers'), validate([
    body('customerIds').isArray().notEmpty(),
    body('userId').notEmpty(),
    body('assignedRole').optional().isString()
]), async (req, res) => {
    try {
        const { customerIds, userId, assignedRole = 'SALES' } = req.body;
        const assignments = await Promise.all(customerIds.map((customerId) => assignCustomerToUser(customerId, userId, assignedRole)));
        res.json({
            success: true,
            data: assignments,
            message: `${assignments.length} customers assigned successfully`
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
 * Get assignment statistics
 * Admin only
 */
router.get('/statistics', requirePermission('manageUsers'), async (req, res) => {
    try {
        const [totalAssignments, activeAssignments, assignmentsByRole, topUsers] = await Promise.all([
            prisma.customer_assignments.count(),
            prisma.customer_assignments.count({ where: { isActive: true } }),
            prisma.customer_assignments.groupBy({
                by: ['assignedRole'],
                where: { isActive: true },
                _count: true
            }),
            prisma.customer_assignments.groupBy({
                by: ['userId'],
                where: { isActive: true },
                _count: true,
                orderBy: {
                    _count: {
                        userId: 'desc'
                    }
                },
                take: 10
            })
        ]);
        res.json({
            success: true,
            data: {
                totalAssignments,
                activeAssignments,
                assignmentsByRole,
                topUsers
            }
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
