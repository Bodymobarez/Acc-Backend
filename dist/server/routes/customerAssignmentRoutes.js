import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, requirePermission } from '../middleware/auth';
import { randomUUID } from 'crypto';
const router = Router();
// All routes require authentication
router.use(authenticate);
// GET /api/customer-assignments - Get all customer assignments
router.get('/', requirePermission('viewCustomers'), async (req, res) => {
    try {
        const { customerId, status } = req.query;
        // Build where clause
        const where = {};
        // Filter by customerId if provided
        if (customerId) {
            where.customerId = customerId;
        }
        // Filter by status if provided, default to active
        if (status === 'active' || !status) {
            where.isActive = true;
        }
        else if (status === 'inactive') {
            where.isActive = false;
        }
        // If status is 'all', don't add isActive filter
        console.log('🔍 Customer assignments query:', { customerId, status, where });
        const assignments = await prisma.customer_assignments.findMany({
            where,
            include: {
                customers: {
                    select: {
                        id: true,
                        customerCode: true,
                        companyName: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                users: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                }
            }
        });
        console.log('📥 Found assignments:', assignments.length);
        res.json(assignments);
    }
    catch (error) {
        console.error('Error fetching customer assignments:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch customer assignments'
        });
    }
});
// POST /api/customer-assignments - Create new customer assignment
router.post('/', requirePermission('createCustomer'), async (req, res) => {
    try {
        const { customerId, userId, assignedRole = 'SALES', commissionRate, flightCommission, hotelCommission, visaCommission, transferCommission, cruiseCommission, rentalCarCommission, trainCommission, activityCommission, notes } = req.body;
        console.log(`${new Date().toISOString()} - POST /api/customer-assignments`);
        console.log('Body:', JSON.stringify(req.body));
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
                    notes: notes || null,
                    updatedAt: new Date()
                },
                include: {
                    customers: true,
                    users: true
                }
            });
            res.json({
                success: true,
                data: updated
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
                    commissionRate: commissionRate || null,
                    flightCommission: flightCommission || null,
                    hotelCommission: hotelCommission || null,
                    visaCommission: visaCommission || null,
                    transferCommission: transferCommission || null,
                    cruiseCommission: cruiseCommission || null,
                    rentalCarCommission: rentalCarCommission || null,
                    trainCommission: trainCommission || null,
                    activityCommission: activityCommission || null,
                    notes: notes || null,
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
                data: assignment
            });
        }
    }
    catch (error) {
        console.error('Error creating customer assignment:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create customer assignment'
        });
    }
});
// DELETE /api/customer-assignments/:id - Delete customer assignment
router.delete('/:id', requirePermission('deleteCustomer'), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.customer_assignments.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date()
            }
        });
        res.json({
            success: true,
            message: 'Customer assignment deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting customer assignment:', error);
        if (error.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: 'Customer assignment not found'
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete customer assignment'
        });
    }
});
export default router;
