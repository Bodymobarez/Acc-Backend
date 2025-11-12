import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  department?: string;
  salesTarget?: number;
  commissionRate?: number;
  isActive?: boolean;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  department?: string;
  salesTarget?: number;
  commissionRate?: number;
  isActive?: boolean;
  lastLogin?: Date;
}

class UserService {
  async getAllUsers() {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        department: true,
        isActive: true,
        salesTarget: true,
        commissionRate: true,
        joinedDate: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        employees: {
          select: {
            id: true,
            employeeCode: true,
            department: true,
            defaultCommissionRate: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  async getUserById(id: string) {
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        department: true,
        isActive: true,
        salesTarget: true,
        commissionRate: true,
        joinedDate: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async createUser(input: CreateUserInput) {
    
    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Check if username or email already exists
      const existingUser = await tx.users.findFirst({
        where: {
          OR: [
            { username: input.username.toLowerCase() },
            { email: input.email.toLowerCase() },
          ],
        },
      });

      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Generate employee code - get all employee codes and find max number
      const allEmployees = await tx.employees.findMany({
        select: { employeeCode: true }
      });
      
      let nextNumber = 1;
      if (allEmployees && allEmployees.length > 0) {
        // Extract all numbers and find the maximum
        const numbers = allEmployees
          .map(emp => {
            const match = emp.employeeCode?.match(/EMP-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(num => num > 0);
        
        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1;
        }
      }
      
      const employeeCode = `EMP-${String(nextNumber).padStart(3, '0')}`;

      // Create user with employee profile
      const now = new Date();
      const user = await tx.users.create({
        data: {
          id: randomUUID(),
          username: input.username.toLowerCase(),
          email: input.email.toLowerCase(),
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: input.role,
          department: input.department,
          salesTarget: input.salesTarget || 0,
          commissionRate: input.commissionRate || 0,
          isActive: input.isActive !== undefined ? input.isActive : true,
          createdAt: now,
          updatedAt: now,
          employees: {
            create: {
              id: randomUUID(),
              employeeCode,
              department: input.department || 'BOOKING',
              defaultCommissionRate: input.commissionRate || 0,
              isActive: true,
              createdAt: now,
              updatedAt: now
            } as any
          }
        } as any,
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          department: true,
          isActive: true,
          salesTarget: true,
          commissionRate: true,
          joinedDate: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          employees: {
            select: {
              id: true,
              employeeCode: true,
              department: true,
              defaultCommissionRate: true,
              isActive: true
            }
          }
        },
      });

      return user;
    });
  }

  async updateUser(id: string, input: UpdateUserInput) {
    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id },
      include: { employees: true }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // If updating username or email, check for conflicts
    if (input.username || input.email) {
      const conflict = await prisma.users.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                input.username ? { username: input.username.toLowerCase() } : {},
                input.email ? { email: input.email.toLowerCase() } : {},
              ].filter(obj => Object.keys(obj).length > 0),
            },
          ],
        },
      });

      if (conflict) {
        throw new Error('Username or email already exists');
      }
    }

    // Prepare update data
    const updateData: any = {
      ...input,
      updatedAt: new Date(),
    };

    // Hash password if provided
    if (input.password) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    // Lowercase username and email
    if (input.username) {
      updateData.username = input.username.toLowerCase();
    }
    if (input.email) {
      updateData.email = input.email.toLowerCase();
    }

    // Update employee profile if commissionRate or department changed
    if (existingUser.employees && (input.commissionRate !== undefined || input.department !== undefined)) {
      await prisma.employees.update({
        where: { id: existingUser.employees.id },
        data: {
          ...(input.department && { department: input.department }),
          ...(input.commissionRate !== undefined && { defaultCommissionRate: input.commissionRate }),
        },
      });
    }

    const user = await prisma.users.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        department: true,
        isActive: true,
        salesTarget: true,
        commissionRate: true,
        joinedDate: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        employees: {
          select: {
            id: true,
            employeeCode: true,
            department: true,
            defaultCommissionRate: true,
            isActive: true
          }
        }
      },
    });

    return user;
  }

  async deleteUser(id: string) {
    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    await prisma.users.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async toggleUserStatus(id: string) {
    const user = await prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await prisma.users.update({
      where: { id },
      data: {
        isActive: !user.isActive,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        department: true,
        isActive: true,
        salesTarget: true,
        commissionRate: true,
        joinedDate: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async updateLastLogin(id: string) {
    await prisma.users.update({
      where: { id },
      data: {
        lastLogin: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getUserStats() {
    const total = await prisma.users.count();
    const active = await prisma.users.count({
      where: { isActive: true },
    });
    const inactive = await prisma.users.count({
      where: { isActive: false },
    });

    // Count by role categories
    const management = await prisma.users.count({
      where: {
        role: {
          in: ['ADMIN', 'CEO', 'MANAGER'],
        },
      },
    });

    const finance = await prisma.users.count({
      where: {
        role: {
          in: ['ACCOUNTANT', 'FINANCIAL_CONTROLLER', 'AUDITOR'],
        },
      },
    });

    const sales = await prisma.users.count({
      where: {
        role: {
          in: ['SALES_MANAGER', 'SALES_AGENT', 'BUSINESS_DEV'],
        },
      },
    });

    const operations = await prisma.users.count({
      where: {
        role: {
          in: ['BOOKING_AGENT', 'CUSTOMER_SERVICE', 'OPERATIONS_MANAGER'],
        },
      },
    });

    return {
      total,
      active,
      inactive,
      management,
      finance,
      sales,
      operations,
    };
  }
}

export const userService = new UserService();
