import { prisma } from '../lib/prisma';
export const bankAccountService = {
    async create(input) {
        // Check if account number already exists
        const existing = await prisma.bank_accounts.findUnique({
            where: { accountNumber: input.accountNumber }
        });
        if (existing) {
            throw new Error('Account number already exists');
        }
        const bankAccount = await prisma.bank_accounts.create({
            data: {
                id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                accountNumber: input.accountNumber,
                accountName: input.accountName,
                bankName: input.bankName,
                currency: input.currency || 'AED',
                balance: input.balance || 0,
                accountType: input.accountType || 'CURRENT',
                branch: input.branch,
                swiftCode: input.swiftCode,
                iban: input.iban,
                notes: input.notes,
                isActive: input.isActive !== undefined ? input.isActive : true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        return bankAccount;
    },
    async getAll(filters) {
        const where = {};
        if (filters) {
            if (filters.bankName)
                where.bankName = { contains: filters.bankName, mode: 'insensitive' };
            if (filters.currency)
                where.currency = filters.currency;
            if (filters.accountType)
                where.accountType = filters.accountType;
            if (filters.isActive !== undefined)
                where.isActive = filters.isActive;
        }
        const bankAccounts = await prisma.bank_accounts.findMany({
            where,
            include: {
                _count: {
                    select: { payments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return bankAccounts;
    },
    async getById(id) {
        const bankAccount = await prisma.bank_accounts.findUnique({
            where: { id },
            include: {
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 10
                },
                _count: {
                    select: { payments: true }
                }
            }
        });
        if (!bankAccount) {
            throw new Error('Bank account not found');
        }
        return bankAccount;
    },
    async update(id, input) {
        // Check if account exists
        await this.getById(id);
        // If updating account number, check for duplicates
        if (input.accountNumber) {
            const existing = await prisma.bank_accounts.findFirst({
                where: {
                    accountNumber: input.accountNumber,
                    NOT: { id }
                }
            });
            if (existing) {
                throw new Error('Account number already exists');
            }
        }
        const bankAccount = await prisma.bank_accounts.update({
            where: { id },
            data: {
                ...input,
                updatedAt: new Date()
            }
        });
        return bankAccount;
    },
    async delete(id) {
        const bankAccount = await this.getById(id);
        // Check if bank account has payments
        const paymentsCount = await prisma.payments.count({
            where: { bankAccountId: id }
        });
        if (paymentsCount > 0) {
            throw new Error('Cannot delete bank account with existing payments. Please delete or reassign payments first.');
        }
        await prisma.bank_accounts.delete({
            where: { id }
        });
        return { message: 'Bank account deleted successfully' };
    },
    async updateBalance(id, amount, operation) {
        const bankAccount = await prisma.bank_accounts.update({
            where: { id },
            data: {
                balance: operation === 'add'
                    ? { increment: amount }
                    : { decrement: amount },
                updatedAt: new Date()
            }
        });
        return bankAccount;
    },
    async getStatistics(filters) {
        const where = {};
        if (filters) {
            if (filters.bankName)
                where.bankName = { contains: filters.bankName, mode: 'insensitive' };
            if (filters.currency)
                where.currency = filters.currency;
            if (filters.accountType)
                where.accountType = filters.accountType;
            if (filters.isActive !== undefined)
                where.isActive = filters.isActive;
        }
        const [totalAccounts, totalBalance, byCurrency, byType] = await Promise.all([
            prisma.bank_accounts.count({ where }),
            prisma.bank_accounts.aggregate({
                where,
                _sum: { balance: true }
            }),
            prisma.bank_accounts.groupBy({
                by: ['currency'],
                where,
                _sum: { balance: true },
                _count: true
            }),
            prisma.bank_accounts.groupBy({
                by: ['accountType'],
                where,
                _sum: { balance: true },
                _count: true
            })
        ]);
        return {
            totalAccounts,
            totalBalance: totalBalance._sum.balance || 0,
            byCurrency,
            byAccountType: byType
        };
    }
};
