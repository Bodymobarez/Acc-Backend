import { prisma } from '../lib/prisma';

export interface CashRegisterFilters {
  currency?: string;
  isActive?: boolean;
}

export const cashRegisterService = {
  async create(data: any) {
    // Check if cash register with same name already exists
    const existing = await prisma.cash_registers.findFirst({
      where: {
        name: data.name,
        currency: data.currency
      }
    });

    if (existing) {
      throw new Error('Cash register with this name and currency already exists');
    }

    const cashRegister = await prisma.cash_registers.create({
      data: {
        id: require('crypto').randomUUID(),
        name: data.name,
        location: data.location || null,
        currency: data.currency || 'AED',
        balance: data.balance || 0,
        notes: data.notes || null,
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return cashRegister;
  },

  async getAll(filters: CashRegisterFilters = {}) {
    const where: any = {};

    if (filters.currency) {
      where.currency = filters.currency;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const cashRegisters = await prisma.cash_registers.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return cashRegisters;
  },

  async getById(id: string) {
    const cashRegister = await prisma.cash_registers.findUnique({
      where: { id }
    });

    if (!cashRegister) {
      throw new Error('Cash register not found');
    }

    return cashRegister;
  },

  async update(id: string, data: any) {
    // Check if updating to existing name/currency combination
    if (data.name || data.currency) {
      const existing = await prisma.cash_registers.findFirst({
        where: {
          name: data.name,
          currency: data.currency,
          id: { not: id }
        }
      });

      if (existing) {
        throw new Error('Cash register with this name and currency already exists');
      }
    }

    const cashRegister = await prisma.cash_registers.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.currency && { currency: data.currency }),
        ...(data.balance !== undefined && { balance: data.balance }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date()
      }
    });

    return cashRegister;
  },

  async delete(id: string) {
    // Check if cash register exists
    const cashRegister = await prisma.cash_registers.findUnique({
      where: { id }
    });

    if (!cashRegister) {
      throw new Error('Cash register not found');
    }

    // TODO: Check if cash register has existing transactions
    // For now, allow deletion

    await prisma.cash_registers.delete({
      where: { id }
    });

    return { message: 'Cash register deleted successfully' };
  },

  async updateBalance(id: string, amount: number, operation: 'add' | 'subtract') {
    const cashRegister = await prisma.cash_registers.findUnique({
      where: { id }
    });

    if (!cashRegister) {
      throw new Error('Cash register not found');
    }

    const newBalance = operation === 'add' 
      ? cashRegister.balance + amount 
      : cashRegister.balance - amount;

    const updated = await prisma.cash_registers.update({
      where: { id },
      data: { 
        balance: newBalance,
        updatedAt: new Date()
      }
    });

    return updated;
  }
};
