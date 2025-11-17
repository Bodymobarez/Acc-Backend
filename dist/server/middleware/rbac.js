import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
/**
 * Role-Based Access Control (RBAC) Middleware
 * Filters data based on user assignments to customers/suppliers
 */
/**
 * Get all customer IDs assigned to a user
 */
export async function getUserAssignedCustomerIds(userId) {
    try {
        const assignments = await prisma.customer_assignments.findMany({
            where: {
                userId,
                isActive: true
            },
            select: {
                customerId: true
            }
        });
        return assignments.map(a => a.customerId);
    }
    catch (error) {
        console.error('Error fetching user customer assignments:', error);
        return [];
    }
}
/**
 * Get all supplier IDs that the user can access through their customer assignments
 */
export async function getUserAccessibleSupplierIds(userId) {
    try {
        const customerIds = await getUserAssignedCustomerIds(userId);
        if (customerIds.length === 0) {
            return [];
        }
        // Get suppliers from bookings of assigned customers
        const bookings = await prisma.bookings.findMany({
            where: {
                customerId: { in: customerIds }
            },
            select: {
                supplierId: true
            },
            distinct: ['supplierId']
        });
        return [...new Set(bookings.map(b => b.supplierId))];
    }
    catch (error) {
        console.error('Error fetching user accessible suppliers:', error);
        return [];
    }
}
/**
 * Get all booking IDs accessible to a user
 */
export async function getUserAccessibleBookingIds(userId) {
    try {
        const customerIds = await getUserAssignedCustomerIds(userId);
        if (customerIds.length === 0) {
            return [];
        }
        const bookings = await prisma.bookings.findMany({
            where: {
                customerId: { in: customerIds }
            },
            select: {
                id: true
            }
        });
        return bookings.map(b => b.id);
    }
    catch (error) {
        console.error('Error fetching user accessible bookings:', error);
        return [];
    }
}
/**
 * Get all invoice IDs accessible to a user
 */
export async function getUserAccessibleInvoiceIds(userId) {
    try {
        const bookingIds = await getUserAccessibleBookingIds(userId);
        if (bookingIds.length === 0) {
            return [];
        }
        const invoices = await prisma.invoices.findMany({
            where: {
                bookingId: { in: bookingIds }
            },
            select: {
                id: true
            }
        });
        return invoices.map(i => i.id);
    }
    catch (error) {
        console.error('Error fetching user accessible invoices:', error);
        return [];
    }
}
/**
 * Check if user is ADMIN, ACCOUNTANT, or FINANCIAL_CONTROLLER (users with full access)
 */
export function isAdminUser(user) {
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ACCOUNTANT' || user?.role === 'FINANCIAL_CONTROLLER';
}
/**
 * Middleware: Apply customer filter to request
 * Adds accessible customer IDs to req for non-admin users
 */
export const applyCustomerFilter = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Admin users have full access - no filtering
        if (isAdminUser(req.user)) {
            req.customerFilter = null; // null means no filter (all access)
            next();
            return;
        }
        // Get assigned customer IDs
        const customerIds = await getUserAssignedCustomerIds(req.user.id);
        if (customerIds.length === 0) {
            // User has no assignments - return empty filter
            req.customerFilter = { id: { in: [] } }; // Use 'id' for Customer model
            console.log(`User ${req.user.email} has no customer assignments`);
        }
        else {
            req.customerFilter = { id: { in: customerIds } }; // Use 'id' for Customer model
            console.log(`User ${req.user.email} has access to ${customerIds.length} customers`);
        }
        next();
    }
    catch (error) {
        console.error('Error applying customer filter:', error);
        res.status(500).json({ error: 'Error applying access control' });
    }
};
/**
 * Middleware: Apply booking filter to request
 * Adds accessible booking IDs to req for non-admin users
 */
export const applyBookingFilter = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Admin users have full access
        if (isAdminUser(req.user)) {
            req.bookingFilter = null;
            next();
            return;
        }
        // Get assigned customer IDs
        const customerIds = await getUserAssignedCustomerIds(req.user.id);
        if (customerIds.length === 0) {
            req.bookingFilter = { id: { in: [] } };
            console.log(`User ${req.user.email} has no accessible bookings`);
        }
        else {
            req.bookingFilter = { customerId: { in: customerIds } };
            console.log(`User ${req.user.email} can access bookings for ${customerIds.length} customers`);
        }
        next();
    }
    catch (error) {
        console.error('Error applying booking filter:', error);
        res.status(500).json({ error: 'Error applying access control' });
    }
};
/**
 * Middleware: Apply invoice filter to request
 */
export const applyInvoiceFilter = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Admin users have full access
        if (isAdminUser(req.user)) {
            req.invoiceFilter = null;
            next();
            return;
        }
        // Get accessible booking IDs through customer assignments
        const customerIds = await getUserAssignedCustomerIds(req.user.id);
        if (customerIds.length === 0) {
            req.invoiceFilter = { id: { in: [] } };
            console.log(`User ${req.user.email} has no accessible invoices`);
        }
        else {
            // Filter invoices by bookings that belong to assigned customers
            req.invoiceFilter = {
                booking: {
                    customerId: { in: customerIds }
                }
            };
            console.log(`User ${req.user.email} can access invoices for ${customerIds.length} customers`);
        }
        next();
    }
    catch (error) {
        console.error('Error applying invoice filter:', error);
        res.status(500).json({ error: 'Error applying access control' });
    }
};
/**
 * Middleware: Check if user can access specific customer
 */
export const canAccessCustomer = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Admin users have full access
        if (isAdminUser(req.user)) {
            next();
            return;
        }
        const customerId = req.params.id || req.body.customerId;
        if (!customerId) {
            res.status(400).json({ error: 'Customer ID required' });
            return;
        }
        const assignedCustomerIds = await getUserAssignedCustomerIds(req.user.id);
        if (!assignedCustomerIds.includes(customerId)) {
            console.log(`Access denied: User ${req.user.email} cannot access customer ${customerId}`);
            res.status(403).json({ error: 'Access denied to this customer' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Error checking customer access:', error);
        res.status(500).json({ error: 'Error checking access' });
    }
};
/**
 * Middleware: Check if user can access specific booking
 */
export const canAccessBooking = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Admin users have full access
        if (isAdminUser(req.user)) {
            next();
            return;
        }
        const bookingId = req.params.id || req.body.bookingId;
        if (!bookingId) {
            res.status(400).json({ error: 'Booking ID required' });
            return;
        }
        // Get booking and check if customer is assigned to user
        const booking = await prisma.bookings.findUnique({
            where: { id: bookingId },
            select: { customerId: true }
        });
        if (!booking) {
            res.status(404).json({ error: 'Booking not found' });
            return;
        }
        const assignedCustomerIds = await getUserAssignedCustomerIds(req.user.id);
        if (!assignedCustomerIds.includes(booking.customerId)) {
            console.log(`Access denied: User ${req.user.email} cannot access booking ${bookingId}`);
            res.status(403).json({ error: 'Access denied to this booking' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Error checking booking access:', error);
        res.status(500).json({ error: 'Error checking access' });
    }
};
/**
 * Middleware: Check if user can access specific invoice
 */
export const canAccessInvoice = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        // Admin users have full access
        if (isAdminUser(req.user)) {
            next();
            return;
        }
        const invoiceId = req.params.id || req.body.invoiceId;
        if (!invoiceId) {
            res.status(400).json({ error: 'Invoice ID required' });
            return;
        }
        // Get invoice and check through booking customer
        const invoice = await prisma.invoices.findUnique({
            where: { id: invoiceId },
            include: {
                bookings: {
                    select: { customerId: true }
                }
            }
        });
        if (!invoice) {
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }
        const assignedCustomerIds = await getUserAssignedCustomerIds(req.user.id);
        if (!assignedCustomerIds.includes(invoice.bookings.customerId)) {
            console.log(`Access denied: User ${req.user.email} cannot access invoice ${invoiceId}`);
            res.status(403).json({ error: 'Access denied to this invoice' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Error checking invoice access:', error);
        res.status(500).json({ error: 'Error checking access' });
    }
};
/**
 * Helper: Get user assignment info
 */
export async function getUserAssignmentInfo(userId) {
    try {
        const assignments = await prisma.customer_assignments.findMany({
            where: {
                userId,
                isActive: true
            },
            include: {
                customers: {
                    select: {
                        id: true,
                        companyName: true,
                        customerCode: true
                    }
                }
            }
        });
        return {
            totalAssignments: assignments.length,
            customers: assignments.map(a => ({
                id: a.customers.id,
                name: a.customers.companyName,
                code: a.customers.customerCode,
                role: a.assignedRole,
                assignedDate: a.assignedDate
            }))
        };
    }
    catch (error) {
        console.error('Error fetching user assignment info:', error);
        return {
            totalAssignments: 0,
            customers: []
        };
    }
}
/**
 * Create or update customer assignment
 */
export async function assignCustomerToUser(customerId, userId, assignedRole = 'SALES', commissionRates) {
    try {
        const assignment = await prisma.customer_assignments.upsert({
            where: {
                customerId_userId_assignedRole: {
                    customerId,
                    userId,
                    assignedRole
                }
            },
            update: {
                isActive: true,
                updatedAt: new Date(),
                ...commissionRates
            },
            create: {
                id: randomUUID(),
                customerId,
                userId,
                assignedRole,
                isActive: true,
                updatedAt: new Date(),
                ...commissionRates
            }
        });
        console.log(`✅ Assigned customer ${customerId} to user ${userId} (${assignedRole})`);
        return assignment;
    }
    catch (error) {
        console.error('Error assigning customer to user:', error);
        throw error;
    }
}
/**
 * Remove customer assignment from user
 */
export async function unassignCustomerFromUser(customerId, userId, assignedRole = 'SALES') {
    try {
        await prisma.customer_assignments.update({
            where: {
                customerId_userId_assignedRole: {
                    customerId,
                    userId,
                    assignedRole
                }
            },
            data: {
                isActive: false
            }
        });
        console.log(`✅ Unassigned customer ${customerId} from user ${userId} (${assignedRole})`);
    }
    catch (error) {
        console.error('Error unassigning customer from user:', error);
        throw error;
    }
}
