import { files } from '@prisma/client';
import { randomUUID } from 'crypto';
import { generateFileNumber } from '../utils/calculations';
import { prisma } from '../lib/prisma';

export interface CreateFileInput {
  bookingId: string;
  createdById: string;
}

export class FileService {
  /**
   * Create file from booking
   */
  async createFile(input: CreateFileInput): Promise<files> {
    const booking = await prisma.bookings.findUnique({
      where: { id: input.bookingId },
      include: {
        customers: true,
        employees_bookings_bookingAgentIdToemployees: true,
        employees_bookings_customerServiceIdToemployees: true
      }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: input.createdById }
    });

    if (!user) {
      const createdUser = await prisma.users.create({
        data: {
          id: input.createdById,
          username: 'system_user',
          email: 'system@example.com',
          password: 'temp_password',
          firstName: 'System',
          lastName: 'User',
          role: 'admin',
          updatedAt: new Date()
        }
      });
    }

    // Create the file
    const file = await prisma.files.create({
      data: {
        id: randomUUID(),
        fileNumber: generateFileNumber('FILE', Date.now()),
        bookingId: input.bookingId,
        customerId: booking.customerId,
        status: 'pending',
        createdById: input.createdById,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Get company settings for PDF generation
    const companySettings = await prisma.company_settings.findFirst();
    
    if (!companySettings) {
      throw new Error('Company settings not found');
    }

    return file;
  }

  /**
   * Get file by ID
   */
  async getFileById(id: string) {
    return await prisma.files.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            customers: true
          }
        },
        users: true
      }
    });
  }

  /**
   * Get all files with filters
   */
  async getFiles(filters: {
    status?: string;
    customerId?: string;
    serviceType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return await prisma.files.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.startDate && filters.endDate && {
          generatedDate: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        })
      },
      include: {
        customers: true,
        bookings: true
      },
      orderBy: {
        generatedDate: 'desc'
      }
    });
  }

  /**
   * Update file status
   */
  async updateFileStatus(id: string, status: string): Promise<files> {
    return await prisma.files.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * Delete file
   */
  async deleteFile(id: string) {
    return await prisma.files.delete({
      where: { id }
    });
  }
}

export const fileService = new FileService();

