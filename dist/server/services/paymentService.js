import { prisma } from '../lib/prisma';
export const paymentService = {
    async generatePaymentNumber() {
        const lastPayment = await prisma.payments.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { paymentNumber: true }
        });
        if (!lastPayment) {
            return 'PAY-2025-0001';
        }
        const lastNumber = parseInt(lastPayment.paymentNumber.split('-')[2]);
        const newNumber = lastNumber + 1;
        const year = new Date().getFullYear();
        return `PAY-${year}-${newNumber.toString().padStart(4, '0')}`;
    },
    async create(input) {
        const paymentNumber = await this.generatePaymentNumber();
        const payment = await prisma.payments.create({
            data: {
                id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                paymentNumber,
                supplierId: input.supplierId,
                amount: input.amount,
                paymentMethod: input.paymentMethod,
                bankAccountId: input.bankAccountId,
                checkNumber: input.checkNumber,
                reference: input.reference,
                category: input.category,
                paymentDate: input.paymentDate || new Date(),
                notes: input.notes,
                status: input.status || 'COMPLETED',
                createdById: input.createdById,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                supplier: true,
                bankAccount: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        // Update bank account balance if applicable
        if (input.bankAccountId && input.paymentMethod === 'BANK') {
            await prisma.bank_accounts.update({
                where: { id: input.bankAccountId },
                data: {
                    balance: {
                        decrement: input.amount
                    }
                }
            });
        }
        return payment;
    },
    async getAll(filters) {
        const where = {};
        if (filters) {
            if (filters.supplierId)
                where.supplierId = filters.supplierId;
            if (filters.category)
                where.category = filters.category;
            if (filters.paymentMethod)
                where.paymentMethod = filters.paymentMethod;
            if (filters.status)
                where.status = filters.status;
            if (filters.startDate || filters.endDate) {
                where.paymentDate = {};
                if (filters.startDate)
                    where.paymentDate.gte = filters.startDate;
                if (filters.endDate)
                    where.paymentDate.lte = filters.endDate;
            }
            if (filters.minAmount || filters.maxAmount) {
                where.amount = {};
                if (filters.minAmount)
                    where.amount.gte = filters.minAmount;
                if (filters.maxAmount)
                    where.amount.lte = filters.maxAmount;
            }
        }
        const payments = await prisma.payments.findMany({
            where,
            include: {
                supplier: true,
                bankAccount: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return payments;
    },
    async getById(id) {
        const payment = await prisma.payments.findUnique({
            where: { id },
            include: {
                supplier: true,
                bankAccount: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        if (!payment) {
            throw new Error('Payment not found');
        }
        return payment;
    },
    async update(id, input) {
        const existingPayment = await this.getById(id);
        // If payment method or bank account or amount changed, update bank balance
        if (existingPayment.bankAccountId && existingPayment.paymentMethod === 'BANK') {
            // Reverse the old payment
            await prisma.bank_accounts.update({
                where: { id: existingPayment.bankAccountId },
                data: {
                    balance: {
                        increment: existingPayment.amount
                    }
                }
            });
        }
        const payment = await prisma.payments.update({
            where: { id },
            data: {
                ...input,
                updatedAt: new Date()
            },
            include: {
                supplier: true,
                bankAccount: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        // Apply the new payment
        if (input.bankAccountId && input.paymentMethod === 'BANK') {
            await prisma.bank_accounts.update({
                where: { id: input.bankAccountId },
                data: {
                    balance: {
                        decrement: input.amount || existingPayment.amount
                    }
                }
            });
        }
        return payment;
    },
    async delete(id) {
        const payment = await this.getById(id);
        // Reverse bank account balance if applicable
        if (payment.bankAccountId && payment.paymentMethod === 'BANK') {
            await prisma.bank_accounts.update({
                where: { id: payment.bankAccountId },
                data: {
                    balance: {
                        increment: payment.amount
                    }
                }
            });
        }
        await prisma.payments.delete({
            where: { id }
        });
        return { message: 'Payment deleted successfully' };
    },
    async getStatistics(filters) {
        const where = {};
        if (filters) {
            if (filters.supplierId)
                where.supplierId = filters.supplierId;
            if (filters.category)
                where.category = filters.category;
            if (filters.paymentMethod)
                where.paymentMethod = filters.paymentMethod;
            if (filters.status)
                where.status = filters.status;
            if (filters.startDate || filters.endDate) {
                where.paymentDate = {};
                if (filters.startDate)
                    where.paymentDate.gte = filters.startDate;
                if (filters.endDate)
                    where.paymentDate.lte = filters.endDate;
            }
        }
        const [totalPayments, totalAmount, byMethod, byCategory] = await Promise.all([
            prisma.payments.count({ where }),
            prisma.payments.aggregate({
                where,
                _sum: { amount: true }
            }),
            prisma.payments.groupBy({
                by: ['paymentMethod'],
                where,
                _sum: { amount: true },
                _count: true
            }),
            prisma.payments.groupBy({
                by: ['category'],
                where,
                _sum: { amount: true },
                _count: true
            })
        ]);
        return {
            totalPayments,
            totalAmount: totalAmount._sum.amount || 0,
            byPaymentMethod: byMethod,
            byCategory: byCategory
        };
    }
};
