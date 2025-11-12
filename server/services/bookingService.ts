import { bookings } from '@prisma/client';
import { randomUUID } from 'crypto';
import { calculateVAT, calculateCommissions, calculateVATOnProfit, convertToAED, generateBookingNumber } from '../utils/calculations';
import { accountingService } from './accountingService';
import { prisma } from '../lib/prisma';

export interface CreateBookingInput {
  customerId: string;
  supplierId: string;
  serviceType: string;
  bookingAgentId?: string;
  customerServiceId?: string;
  agentCommissionRate?: number;
  csCommissionRate?: number;
  costAmount: number;
  costCurrency: string;
  saleAmount: number;
  saleCurrency: string;
  isUAEBooking: boolean;
  vatApplicable: boolean;
  serviceDetails: any;
  travelDate?: Date;
  returnDate?: Date;
  notes?: string;
  internalNotes?: string;
  createdById: string;
  additionalSuppliers?: Array<{
    supplierId: string;
    serviceType: string;
    costAmount: number;
    costCurrency: string;
    saleAmount?: number;
    saleCurrency?: string;
    description?: string;
  }>;
}

export interface UpdateCommissionsInput {
  agentCommissionRate?: number;
  csCommissionRate?: number;
}

export class BookingService {
  /**
   * Helper function to save additional suppliers
   */
  private async saveAdditionalSuppliers(bookingId: string, additionalSuppliers: any[]) {
    if (!additionalSuppliers || additionalSuppliers.length === 0) {
      return;
    }
    
    console.log(`\n📋 Adding ${additionalSuppliers.length} additional suppliers...`);
    for (const supplier of additionalSuppliers) {
      const costRate = await this.getExchangeRate(supplier.costCurrency);
      const costInAED = convertToAED(supplier.costAmount, costRate);
      
      const saleRate = await this.getExchangeRate(supplier.saleCurrency || 'AED');
      const saleInAED = convertToAED(supplier.saleAmount || 0, saleRate);
      
      await prisma.booking_suppliers.create({
        data: {
          id: randomUUID(),
          bookingId,
          supplierId: supplier.supplierId,
          serviceType: supplier.serviceType,
          costAmount: supplier.costAmount,
          costCurrency: supplier.costCurrency,
          costInAED,
          saleAmount: supplier.saleAmount || 0,
          saleCurrency: supplier.saleCurrency || 'AED',
          saleInAED,
          description: supplier.description,
          updatedAt: new Date()
        }
      });
    }
    console.log('✅ Additional suppliers saved successfully');
  }

  /**
   * Create a new booking
   */
  async createBooking(input: CreateBookingInput): Promise<bookings> {
    // If service type is FLIGHT and airline name is provided, save it to database
    if (input.serviceType === 'FLIGHT' && input.serviceDetails && typeof input.serviceDetails === 'object') {
      const serviceDetails = input.serviceDetails as any;
      if (serviceDetails.airline && typeof serviceDetails.airline === 'string') {
        try {
          // Check if airline exists
          let airline = await (prisma as any).airlines.findUnique({
            where: { name: serviceDetails.airline.trim() }
          });
          
          // If not found, create it
          if (!airline) {
            airline = await (prisma as any).airlines.create({
              data: {
                id: randomUUID(),
                name: serviceDetails.airline.trim(),
                isActive: true,
                updatedAt: new Date()
              }
            });
            console.log(`✈️  New airline created: ${airline.name}`);
          }
        } catch (error) {
          console.error('Error saving airline:', error);
          // Continue even if airline save fails
        }
      }
    }
    
    // Get exchange rates
    const costRate = await this.getExchangeRate(input.costCurrency);
    const saleRate = await this.getExchangeRate(input.saleCurrency);
    
    // Convert to AED
    const costInAED = convertToAED(input.costAmount, costRate);
    const saleInAED = convertToAED(input.saleAmount, saleRate);
    
    // Calculate initial values
    const vatCalc = input.vatApplicable
      ? calculateVAT(saleInAED, costInAED, input.isUAEBooking, 5.0, input.serviceType)
      : {
          isUAEBooking: input.isUAEBooking,
          saleAmount: saleInAED,
          costAmount: costInAED,
          netBeforeVAT: saleInAED,
          vatAmount: 0,
          totalWithVAT: saleInAED,
          grossProfit: saleInAED - costInAED,
          netProfit: saleInAED - costInAED
        };
    
    // Get commission rates - use provided rates or fall back to employee defaults
    let agentCommissionRate = input.agentCommissionRate || 0;
    let csCommissionRate = input.csCommissionRate || 0;
    
    // If no rates provided, get from employee profiles
    if (!agentCommissionRate && input.bookingAgentId) {
      const bookingAgent = await prisma.employees.findUnique({
        where: { id: input.bookingAgentId }
      });
      agentCommissionRate = bookingAgent?.defaultCommissionRate || 0;
    }
    
    if (!csCommissionRate && input.customerServiceId) {
      const customerService = await prisma.employees.findUnique({
        where: { id: input.customerServiceId }
      });
      csCommissionRate = customerService?.defaultCommissionRate || 0;
    }
    
    // CORRECT CALCULATION FLOW:
    // For UAE Bookings: Commission calculated from profit AFTER VAT deduction
    // For Non-UAE: Commission calculated from gross profit BEFORE VAT
    // SPECIAL CASE FOR FLIGHT: VAT is only 5% on net profit, not extracted from total
    let commissionBase: number;
    let finalVatAmount: number;
    let finalNetProfit: number;
    
    if (input.isUAEBooking && input.vatApplicable) {
      // Check if this is a FLIGHT booking
      if (input.serviceType === 'FLIGHT') {
        // FLIGHT: VAT is only 5% on net profit (after commissions)
        commissionBase = vatCalc.grossProfit; // Use full profit for commission
        const commissionCalc = calculateCommissions(
          commissionBase,
          agentCommissionRate,
          csCommissionRate
        );
        
        // VAT is 5% of net profit (after commissions)
        finalVatAmount = calculateVATOnProfit(commissionCalc.profitAfterCommission);
        finalNetProfit = commissionCalc.profitAfterCommission - finalVatAmount;
        
        console.log('✈️  FLIGHT Booking - VAT 5% on net profit ONLY (not extracted from total)');
        console.log('  Sale Amount:', saleInAED);
        console.log('  Cost Amount:', costInAED);
        console.log('  Gross Profit:', vatCalc.grossProfit);
        console.log('  Commission Base:', commissionBase);
        console.log('  Agent Commission:', commissionCalc.agentCommissionAmount);
        console.log('  Sales Commission:', commissionCalc.csCommissionAmount);
        console.log('  Total Commission:', commissionCalc.totalCommission);
        console.log('  Profit After Commission:', commissionCalc.profitAfterCommission);
        console.log('  VAT Amount (5% of net profit):', finalVatAmount);
        console.log('  Net Profit:', finalNetProfit);
        
        // Generate booking number
        const lastBooking = await prisma.bookings.findFirst({
          orderBy: { createdAt: 'desc' }
        });
        const nextSequence = lastBooking ? 
          parseInt(lastBooking.bookingNumber.split('-').pop() || '0') + 1 : 1;
        const bookingNumber = generateBookingNumber('BKG', nextSequence);
        
        // Create booking for FLIGHT
        const booking = await prisma.bookings.create({
          data: {
            id: randomUUID(),
            bookingNumber,
            customerId: input.customerId,
            supplierId: input.supplierId,
            serviceType: input.serviceType as any,
            bookingAgentId: input.bookingAgentId,
            customerServiceId: input.customerServiceId,
            costAmount: input.costAmount,
            costCurrency: input.costCurrency,
            costInAED,
            saleAmount: input.saleAmount,
            saleCurrency: input.saleCurrency,
            saleInAED,
            isUAEBooking: input.isUAEBooking,
            vatApplicable: input.vatApplicable,
            netBeforeVAT: saleInAED,
            vatAmount: finalVatAmount,
            totalWithVAT: saleInAED,
            grossProfit: vatCalc.grossProfit,
            netProfit: finalNetProfit,
            agentCommissionRate,
            agentCommissionAmount: commissionCalc.agentCommissionAmount,
            csCommissionRate,
            csCommissionAmount: commissionCalc.csCommissionAmount,
            totalCommission: commissionCalc.totalCommission,
            serviceDetails: JSON.stringify(input.serviceDetails),
            travelDate: input.travelDate,
            returnDate: input.returnDate,
            notes: input.notes,
            internalNotes: input.internalNotes,
            createdById: input.createdById,
            status: 'CONFIRMED',
            updatedAt: new Date()
          } as any,
          include: {
            customers: true,
            suppliers: true,
            users: true
          }
        });
        
        // Create accounting journal entries for FLIGHT booking
        await accountingService.createBookingJournalEntry(booking);
        if (booking.agentCommissionAmount && booking.agentCommissionAmount > 0) {
          await accountingService.createCommissionJournalEntry(booking, 'AGENT');
        }
        if (booking.csCommissionAmount && booking.csCommissionAmount > 0) {
          await accountingService.createCommissionJournalEntry(booking, 'CS');
        }
        
        // Save additional suppliers if provided
        await this.saveAdditionalSuppliers(booking.id, input.additionalSuppliers || []);
        
        return booking;
      } else {
        // Non-FLIGHT UAE Booking: VAT already extracted, commission from profit after VAT
        commissionBase = vatCalc.grossProfit; // Profit after VAT deduction
        const commissionCalc = calculateCommissions(
          commissionBase,
          agentCommissionRate,
          csCommissionRate
        );
        finalVatAmount = vatCalc.vatAmount;
        finalNetProfit = commissionCalc.profitAfterCommission;
      
        console.log('✅ Non-FLIGHT UAE Booking - Commission from profit AFTER VAT deduction');
        console.log('  Net Before VAT:', vatCalc.netBeforeVAT);
        console.log('  VAT Amount:', finalVatAmount);
        console.log('  Gross Profit (after VAT):', vatCalc.grossProfit);
        console.log('  Commission Base:', commissionBase);
        console.log('  Agent Commission:', commissionCalc.agentCommissionAmount);
        console.log('  Sales Commission:', commissionCalc.csCommissionAmount);
        console.log('  Total Commission:', commissionCalc.totalCommission);
        console.log('  Net Profit:', finalNetProfit);
        
        // Generate booking number
        const lastBooking = await prisma.bookings.findFirst({
          orderBy: { createdAt: 'desc' }
        });
        const nextSequence = lastBooking ? 
          parseInt(lastBooking.bookingNumber.split('-').pop() || '0') + 1 : 1;
        const bookingNumber = generateBookingNumber('BKG', nextSequence);
      
        // Create booking for non-FLIGHT UAE
        const booking = await prisma.bookings.create({
          data: {
            id: randomUUID(),
            bookingNumber,
            customerId: input.customerId,
            supplierId: input.supplierId,
            serviceType: input.serviceType as any,
            bookingAgentId: input.bookingAgentId,
            customerServiceId: input.customerServiceId,
            costAmount: input.costAmount,
            costCurrency: input.costCurrency,
            costInAED,
            saleAmount: input.saleAmount,
            saleCurrency: input.saleCurrency,
            saleInAED,
            isUAEBooking: input.isUAEBooking,
            vatApplicable: input.vatApplicable,
            netBeforeVAT: vatCalc.netBeforeVAT,
            vatAmount: finalVatAmount,
            totalWithVAT: saleInAED,
            grossProfit: vatCalc.grossProfit,
            netProfit: finalNetProfit,
            agentCommissionRate,
            agentCommissionAmount: commissionCalc.agentCommissionAmount,
            csCommissionRate,
            csCommissionAmount: commissionCalc.csCommissionAmount,
            totalCommission: commissionCalc.totalCommission,
            serviceDetails: JSON.stringify(input.serviceDetails),
            travelDate: input.travelDate,
            returnDate: input.returnDate,
            notes: input.notes,
            internalNotes: input.internalNotes,
            createdById: input.createdById,
            status: 'CONFIRMED',
            updatedAt: new Date()
          } as any,
          include: {
            customers: true,
            suppliers: true,
            users: true
          }
        });
        
        // Create accounting journal entries for non-FLIGHT UAE booking
        await accountingService.createBookingJournalEntry(booking);
        if (booking.agentCommissionAmount && booking.agentCommissionAmount > 0) {
          await accountingService.createCommissionJournalEntry(booking, 'AGENT');
        }
        if (booking.csCommissionAmount && booking.csCommissionAmount > 0) {
          await accountingService.createCommissionJournalEntry(booking, 'CS');
        }
        
        // Save additional suppliers if provided
        await this.saveAdditionalSuppliers(booking.id, input.additionalSuppliers || []);
        
        return booking;
      }
    } else {
      // Non-UAE or No VAT: Commission from gross profit, then VAT on remaining profit
      commissionBase = vatCalc.grossProfit; // Gross profit before any deductions
      const commissionCalc = calculateCommissions(
        commissionBase,
        agentCommissionRate,
        csCommissionRate
      );
      
      // VAT calculated on profit AFTER commission deduction (only if VAT applicable)
      finalVatAmount = input.vatApplicable 
        ? calculateVATOnProfit(commissionCalc.profitAfterCommission)
        : 0;
      
      finalNetProfit = commissionCalc.profitAfterCommission - finalVatAmount;
      
      console.log('✅ Non-UAE Booking - Commission from gross profit BEFORE VAT');
      console.log('  Gross Profit:', vatCalc.grossProfit);
      console.log('  Commission Base:', commissionBase);
      console.log('  Agent Commission:', commissionCalc.agentCommissionAmount);
      console.log('  Sales Commission:', commissionCalc.csCommissionAmount);
      console.log('  Total Commission:', commissionCalc.totalCommission);
      console.log('  Profit After Commission:', commissionCalc.profitAfterCommission);
      console.log('  VAT Amount:', finalVatAmount);
      console.log('  Net Profit:', finalNetProfit);
      
      // Generate booking number
      const lastBooking = await prisma.bookings.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      const nextSequence = lastBooking ? 
        parseInt(lastBooking.bookingNumber.split('-').pop() || '0') + 1 : 1;
      const bookingNumber = generateBookingNumber('BKG', nextSequence);
      
      // Create booking
      const booking = await prisma.bookings.create({
        data: {
          id: randomUUID(),
          bookingNumber,
          customerId: input.customerId,
          supplierId: input.supplierId,
          serviceType: input.serviceType as any,
          bookingAgentId: input.bookingAgentId,
          customerServiceId: input.customerServiceId,
          costAmount: input.costAmount,
          costCurrency: input.costCurrency,
          costInAED,
          saleAmount: input.saleAmount,
          saleCurrency: input.saleCurrency,
          saleInAED,
          isUAEBooking: input.isUAEBooking,
          vatApplicable: input.vatApplicable,
          netBeforeVAT: saleInAED,
          vatAmount: finalVatAmount,
          totalWithVAT: saleInAED + finalVatAmount,
          grossProfit: vatCalc.grossProfit,
          netProfit: finalNetProfit,
          agentCommissionRate,
          agentCommissionAmount: commissionCalc.agentCommissionAmount,
          csCommissionRate,
          csCommissionAmount: commissionCalc.csCommissionAmount,
          totalCommission: commissionCalc.totalCommission,
          serviceDetails: JSON.stringify(input.serviceDetails),
          travelDate: input.travelDate,
          returnDate: input.returnDate,
          notes: input.notes,
          internalNotes: input.internalNotes,
          createdById: input.createdById,
          status: 'CONFIRMED',
          updatedAt: new Date()
        } as any,
        include: {
          customers: true,
          suppliers: true,
          users: true
        }
      });
      
      // Create accounting journal entries
      await accountingService.createBookingJournalEntry(booking);
      if (booking.agentCommissionAmount && booking.agentCommissionAmount > 0) {
        await accountingService.createCommissionJournalEntry(booking, 'AGENT');
      }
      if (booking.csCommissionAmount && booking.csCommissionAmount > 0) {
        await accountingService.createCommissionJournalEntry(booking, 'CS');
      }
      
      // Save additional suppliers if provided
      await this.saveAdditionalSuppliers(booking.id, input.additionalSuppliers || []);
      
      return booking;
    }
  }
  
  /**
   * Update booking commissions (typically by accountant during review)
   */
  async updateCommissions(
    bookingId: string,
    input: UpdateCommissionsInput
  ): Promise<bookings> {
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId }
    });
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // CORRECT CALCULATION FLOW:
    // For UAE Bookings: Commission calculated from profit AFTER VAT deduction
    // For Non-UAE: Commission calculated from gross profit BEFORE VAT
    let commissionBase: number;
    let finalVatAmount: number;
    let finalNetProfit: number;
    let commissionCalc: any;
    
    if (booking.isUAEBooking && booking.vatApplicable) {
      // UAE Booking: Commission from profit AFTER VAT deduction
      // VAT is already extracted from sale amount, so commission is from gross profit (which is after VAT)
      commissionBase = booking.grossProfit || 0; // This is profit after VAT extraction
      commissionCalc = calculateCommissions(
        commissionBase,
        input.agentCommissionRate || 0,
        input.csCommissionRate || 0
      );
      finalVatAmount = booking.vatAmount || 0; // Keep existing VAT amount
      finalNetProfit = commissionCalc.profitAfterCommission;
      
      console.log('✅ UAE Booking - Commission from profit AFTER VAT deduction');
      console.log('  Gross Profit (after VAT):', booking.grossProfit);
      console.log('  Commission Base:', commissionBase);
      console.log('  New Total Commission:', commissionCalc.totalCommission);
      console.log('  Net Profit:', finalNetProfit);
    } else {
      // Non-UAE: Commission from gross profit BEFORE VAT
      const grossProfit = booking.grossProfit || 0;
      commissionBase = grossProfit;
      commissionCalc = calculateCommissions(
        commissionBase,
        input.agentCommissionRate || 0,
        input.csCommissionRate || 0
      );
      
      // VAT calculated on profit AFTER commission deduction (only if VAT applicable)
      finalVatAmount = booking.vatApplicable
        ? calculateVATOnProfit(commissionCalc.profitAfterCommission)
        : 0;
      
      finalNetProfit = commissionCalc.profitAfterCommission - finalVatAmount;
      
      console.log('✅ Non-UAE Booking - Commission from gross profit BEFORE VAT');
      console.log('  Gross Profit:', grossProfit);
      console.log('  Commission Base:', commissionBase);
      console.log('  New Total Commission:', commissionCalc.totalCommission);
      console.log('  Profit After Commission:', commissionCalc.profitAfterCommission);
      console.log('  VAT Amount:', finalVatAmount);
      console.log('  Net Profit:', finalNetProfit);
    }
    
    // Update booking
    const updated = await prisma.bookings.update({
      where: { id: bookingId },
      data: {
        agentCommissionRate: input.agentCommissionRate,
        agentCommissionAmount: commissionCalc.agentCommissionAmount,
        csCommissionRate: input.csCommissionRate,
        csCommissionAmount: commissionCalc.csCommissionAmount,
        totalCommission: commissionCalc.totalCommission,
        vatAmount: finalVatAmount,  // Update VAT amount
        netProfit: finalNetProfit,  // Update net profit
        status: 'PENDING_REVIEW',
        updatedAt: new Date()
      },
      include: {
        customers: true,
        suppliers: true,
      }
    });
    
    return updated;
  }
  
  /**
   * Approve booking (change status to confirmed)
   */
  async approveBooking(bookingId: string): Promise<bookings> {
    return await prisma.bookings.update({
      where: { id: bookingId },
      data: { 
        status: 'CONFIRMED',
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Get exchange rate for currency (defaults to 1 if not found or if AED)
   */
  private async getExchangeRate(currencyCode: string): Promise<number> {
    if (currencyCode === 'AED') return 1;
    
    const currency = await prisma.currencies.findUnique({
      where: { code: currencyCode }
    });
    
    return currency?.exchangeRateToAED || 1;
  }
  
  /**
   * Get all bookings with filters and RBAC
   */
  async getBookings(
    filters: {
      status?: string;
      serviceType?: string;
      customerId?: string;
      supplierId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    rbacFilter?: any | null
  ) {
    // Build where clause with user filters + RBAC filter
    const where: any = {
      ...(filters.status && { status: filters.status }),
      ...(filters.serviceType && { serviceType: filters.serviceType as any }),
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.startDate && filters.endDate && {
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      })
    };
    
    // Apply RBAC filter if not admin (null means admin with full access)
    if (rbacFilter !== null) {
      Object.assign(where, rbacFilter);
    }
    
    const bookings = await prisma.bookings.findMany({
      where,
      include: {
        customers: true,
        suppliers: true,
        booking_suppliers: {
          include: {
            suppliers: true
          }
        },
        employees_bookings_bookingAgentIdToemployees: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        employees_bookings_customerServiceIdToemployees: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        users: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Debug: Log the first booking to verify structure
    if (bookings.length > 0) {
      console.log('\n═══════════════════════════════════════');
      console.log('📦 SAMPLE BOOKING DATA (First Record):');
      console.log('═══════════════════════════════════════');
      const sample = bookings[0];
      console.log('ID:', sample.id);
      console.log('Booking Number:', sample.bookingNumber);
      console.log('\n💰 FINANCIAL DATA:');
      console.log('  Sale in AED:', sample.saleInAED);
      console.log('  Cost in AED:', sample.costInAED);
      console.log('  Gross Profit:', sample.grossProfit);
      console.log('  Net Profit:', sample.netProfit);
      console.log('\n👔 AGENT DATA:');
      console.log('  Booking Agent ID:', sample.bookingAgentId);
      console.log('  Booking Agent:', sample.employees_bookings_bookingAgentIdToemployees);
      console.log('  Agent Commission Rate:', sample.agentCommissionRate);
      console.log('  Agent Commission Amount:', sample.agentCommissionAmount);
      console.log('\n💼 SALES AGENT DATA:');
      console.log('  Customer Service ID:', sample.customerServiceId);
      console.log('  Customer Service:', sample.employees_bookings_customerServiceIdToemployees);
      console.log('  CS Commission Rate:', sample.csCommissionRate);
      console.log('  CS Commission Amount:', sample.csCommissionAmount);
      console.log('═══════════════════════════════════════\n');
    }
    
    return bookings;
  }
  
  /**
   * Get booking by ID
   */
  async getBookingById(id: string) {
    return await prisma.bookings.findUnique({
      where: { id },
      include: {
        customers: true,
        suppliers: true,
        booking_suppliers: {
          include: {
            suppliers: true
          }
        },
        employees_bookings_bookingAgentIdToemployees: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        employees_bookings_customerServiceIdToemployees: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        users: true,
        invoices: true,
        files: true
      }
    });
  }
  
  /**
   * Update booking
   */
  async updateBooking(id: string, data: Partial<CreateBookingInput>) {
    try {
      console.log(`🔄 Updating booking ${id}:`, data);
      console.log(`📊 Commission Rates Received:`, {
        agentCommissionRate: data.agentCommissionRate,
        csCommissionRate: data.csCommissionRate,
        agentCommissionType: data.agentCommissionType,
        salesCommissionType: data.salesCommissionType
      });
    
    // Prepare update data
    const updateData: any = { ...data };
    
    // Convert serviceDetails to JSON string if it's an object
    if (data.serviceDetails && typeof data.serviceDetails === 'object') {
      updateData.serviceDetails = JSON.stringify(data.serviceDetails);
      console.log('🏨 Hotel details being saved:', data.serviceDetails.hotelName);
    }
    
    // Handle multi-supplier updates
    if (data.additionalSuppliers && Array.isArray(data.additionalSuppliers)) {
      console.log('📦 Updating multi-supplier data:', data.additionalSuppliers.length, 'suppliers');
      
      // Delete existing suppliers
      await prisma.booking_suppliers.deleteMany({
        where: { bookingId: id }
      });
      
      // Create new supplier entries with original currencies
      for (const supplier of data.additionalSuppliers) {
        if (!supplier.supplierId) continue; // Skip empty suppliers
        
        const costRate = await this.getExchangeRate(supplier.costCurrency || 'AED');
        const costInAED = convertToAED(supplier.costAmount || 0, costRate);
        
        const saleRate = await this.getExchangeRate(supplier.saleCurrency || 'AED');
        const saleInAED = convertToAED(supplier.saleAmount || 0, saleRate);
        
        await prisma.booking_suppliers.create({
          data: {
            id: randomUUID(),
            bookingId: id,
            supplierId: supplier.supplierId,
            serviceType: supplier.serviceType || data.serviceType || 'FLIGHT',
            costAmount: supplier.costAmount || 0,
            costCurrency: supplier.costCurrency || 'AED', // Keep original currency
            costInAED,
            saleAmount: supplier.saleAmount || 0,
            saleCurrency: supplier.saleCurrency || 'AED', // Keep original currency
            saleInAED,
            description: supplier.description || '',
            updatedAt: new Date()
          }
        });
        
        console.log(`  ✅ Added supplier ${supplier.supplierId} with ${supplier.costAmount} ${supplier.costCurrency}`);
      }
    }
    
    // If amounts, currencies, or commission rates changed, recalculate
    if (data.costAmount || data.saleAmount || data.costCurrency || data.saleCurrency || 
        data.agentCommissionRate !== undefined || data.csCommissionRate !== undefined) {
      const existing = await this.getBookingById(id);
      if (!existing) throw new Error('Booking not found');
      
      const costCurrency = data.costCurrency || existing.costCurrency;
      const saleCurrency = data.saleCurrency || existing.saleCurrency;
      const costAmount = data.costAmount || existing.costAmount;
      const saleAmount = data.saleAmount || existing.saleAmount;
      
      const costRate = await this.getExchangeRate(costCurrency);
      const saleRate = await this.getExchangeRate(saleCurrency);
      
      const costInAED = convertToAED(costAmount, costRate);
      const saleInAED = convertToAED(saleAmount, saleRate);
      
      const isUAEBooking = data.isUAEBooking !== undefined ? data.isUAEBooking : existing.isUAEBooking;
      const vatApplicable = data.vatApplicable !== undefined ? data.vatApplicable : existing.vatApplicable;
      
      const vatCalc = vatApplicable
        ? calculateVAT(saleInAED, costInAED, isUAEBooking)
        : {
            isUAEBooking,
            saleAmount: saleInAED,
            costAmount: costInAED,
            netBeforeVAT: saleInAED,
            vatAmount: 0,
            totalWithVAT: saleInAED,
            grossProfit: saleInAED - costInAED,
            netProfit: saleInAED - costInAED
          };
      
      // Get commission rates - use new rates if provided, otherwise keep existing
      const agentCommissionRate = data.agentCommissionRate !== undefined ? data.agentCommissionRate : (existing.agentCommissionRate || 0);
      const csCommissionRate = data.csCommissionRate !== undefined ? data.csCommissionRate : (existing.csCommissionRate || 0);
      
      console.log(`📈 Commission Rates Processing:`, {
        receivedAgentRate: data.agentCommissionRate,
        receivedCsRate: data.csCommissionRate,
        finalAgentRate: agentCommissionRate,
        finalCsRate: csCommissionRate,
        existingAgentRate: existing.agentCommissionRate,
        existingCsRate: existing.csCommissionRate
      });
      
      // Calculate commissions from gross profit
      const commissionCalc = calculateCommissions(
        vatCalc.grossProfit,
        agentCommissionRate,
        csCommissionRate
      );
      
      // Calculate VAT - DIFFERENT for UAE vs Non-UAE
      let finalVatAmount: number;
      let finalNetProfit: number;
      
      if (isUAEBooking && vatApplicable) {
        // UAE Booking: VAT already extracted from total (reverse calculation)
        // Use the VAT amount calculated by calculateVAT
        finalVatAmount = vatCalc.vatAmount;  // ✅ Correct: 356.19 for 7480.02
        // Net Profit = Gross Profit - Total Commission (VAT already deducted)
        finalNetProfit = commissionCalc.profitAfterCommission;
      } else if (!isUAEBooking && vatApplicable) {
        // Non-UAE with VAT: VAT is 5% on profit after commissions
        finalVatAmount = calculateVATOnProfit(commissionCalc.profitAfterCommission);
        // Net Profit = Profit After Commission - VAT
        finalNetProfit = commissionCalc.profitAfterCommission - finalVatAmount;
      } else {
        // No VAT
        finalVatAmount = 0;
        finalNetProfit = commissionCalc.profitAfterCommission;
      }
      
      return await prisma.bookings.update({
        where: { id },
        data: {
          costInAED,
          saleInAED,
          netBeforeVAT: isUAEBooking ? vatCalc.netBeforeVAT : saleInAED,
          vatAmount: finalVatAmount,
          totalWithVAT: isUAEBooking ? saleInAED : saleInAED + finalVatAmount,
          grossProfit: vatCalc.grossProfit,
          netProfit: finalNetProfit,
          agentCommissionAmount: commissionCalc.agentCommissionAmount,
          csCommissionAmount: commissionCalc.csCommissionAmount,
          totalCommission: commissionCalc.totalCommission,
          // Save commission rates if provided
          ...(data.agentCommissionRate !== undefined && { agentCommissionRate: data.agentCommissionRate }),
          ...(data.csCommissionRate !== undefined && { csCommissionRate: data.csCommissionRate }),
          ...(updateData.customerId && { customerId: updateData.customerId }),
          ...(updateData.supplierId && { supplierId: updateData.supplierId }),
          ...(updateData.costAmount !== undefined && { costAmount: updateData.costAmount }),
          ...(updateData.costCurrency && { costCurrency: updateData.costCurrency }),
          ...(updateData.saleAmount !== undefined && { saleAmount: updateData.saleAmount }),
          ...(updateData.saleCurrency && { saleCurrency: updateData.saleCurrency }),
          ...(updateData.isUAEBooking !== undefined && { isUAEBooking: updateData.isUAEBooking }),
          ...(updateData.vatApplicable !== undefined && { vatApplicable: updateData.vatApplicable }),
          ...(updateData.serviceDetails && { serviceDetails: updateData.serviceDetails }),
          ...(updateData.serviceType && { serviceType: updateData.serviceType }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
          ...(updateData.travelDate && { travelDate: updateData.travelDate }),
          ...(updateData.returnDate && { returnDate: updateData.returnDate }),
          ...(updateData.bookingAgentId !== undefined && { bookingAgentId: updateData.bookingAgentId }),
          ...(updateData.customerServiceId !== undefined && { customerServiceId: updateData.customerServiceId }),
          ...(data.bookingStatus && { status: data.bookingStatus }),
          updatedAt: new Date()
        }
      });
    }
    
    console.log('📦 Simple update with data:', updateData);
    
    // Ensure commission rates and status are saved even for simple updates
    const finalUpdateData: any = { ...updateData };
    if (data.agentCommissionRate !== undefined) {
      finalUpdateData.agentCommissionRate = data.agentCommissionRate;
    }
    if (data.csCommissionRate !== undefined) {
      finalUpdateData.csCommissionRate = data.csCommissionRate;
    }
    // Remove bookingStatus and use status instead
    if (data.bookingStatus) {
      finalUpdateData.status = data.bookingStatus;
      delete finalUpdateData.bookingStatus;
    }
    
    const updated = await prisma.bookings.update({
      where: { id },
      data: {
        ...finalUpdateData,
        updatedAt: new Date()
      } as any
    });
    console.log('✅ Booking updated successfully:', updated.status);
    console.log('💾 ServiceDetails saved:', updated.serviceDetails?.substring(0, 100));
    console.log('🎯 Final Commission Rates Saved:', {
      agentCommissionRate: updated.agentCommissionRate,
      csCommissionRate: updated.csCommissionRate
    });
    return updated;
    } catch (error) {
      console.error('❌ Error updating booking:', error);
      throw error;
    }
  }
  
  /**
   * Delete booking
   */
  async deleteBooking(id: string) {
    return await prisma.bookings.delete({  where: { id }
    });
  }

  /**
   * Add supplier to booking
   */
  async addBookingSupplier(
    bookingId: string,
    supplierId: string,
    serviceType: string,
    costAmount: number,
    costCurrency: string,
    description?: string
  ) {
    const rate = await this.getExchangeRate(costCurrency);
    const costInAED = convertToAED(costAmount, rate);

    const bookingSupplier = await prisma.booking_suppliers.create({
      data: {
        id: randomUUID(),
        bookingId,
        supplierId,
        serviceType,
        costAmount,
        costCurrency,
        costInAED,
        description,
        updatedAt: new Date()
      },
      include: {
        suppliers: true
      }
    });

    // Recalculate booking totals
    await this.recalculateBookingCosts(bookingId);

    return bookingSupplier;
  }

  /**
   * Get booking suppliers
   */
  async getBookingSuppliers(bookingId: string) {
    return await prisma.booking_suppliers.findMany({
      where: { bookingId },
      include: {
        suppliers: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Remove supplier from booking
   */
  async removeBookingSupplier(id: string) {
    const bookingSupplier = await prisma.booking_suppliers.findUnique({
      where: { id }
    });

    if (!bookingSupplier) {
      throw new Error('Booking supplier not found');
    }

    await prisma.booking_suppliers.delete({
      where: { id }
    });

    // Recalculate booking totals
    await this.recalculateBookingCosts(bookingSupplier.bookingId);
  }

  /**
   * Recalculate booking costs after supplier changes
   */
  private async recalculateBookingCosts(bookingId: string) {
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        booking_suppliers: true
      }
    });

    if (!booking) return;

    // Sum all supplier costs
    const totalCostInAED = booking.booking_suppliers.reduce(
      (sum, supplier) => sum + supplier.costInAED,
      booking.costInAED // Include main supplier cost
    );

    // Recalculate profit and VAT
    const saleInAED = booking.saleInAED;
    const grossProfit = saleInAED - totalCostInAED;

    const vatCalc = booking.vatApplicable
      ? calculateVAT(saleInAED, totalCostInAED, booking.isUAEBooking)
      : {
          isUAEBooking: booking.isUAEBooking,
          saleAmount: saleInAED,
          costAmount: totalCostInAED,
          netBeforeVAT: saleInAED,
          vatAmount: 0,
          totalWithVAT: saleInAED,
          grossProfit,
          netProfit: grossProfit
        };

    // Recalculate commissions
    const commissionBase = booking.isUAEBooking && booking.vatApplicable
      ? vatCalc.grossProfit
      : grossProfit;

    const commissionCalc = calculateCommissions(
      commissionBase,
      booking.agentCommissionRate || 0,
      booking.csCommissionRate || 0
    );

    const finalVatAmount = booking.isUAEBooking && booking.vatApplicable
      ? vatCalc.vatAmount
      : (booking.vatApplicable ? calculateVATOnProfit(commissionCalc.profitAfterCommission) : 0);

    const finalNetProfit = booking.isUAEBooking && booking.vatApplicable
      ? commissionCalc.profitAfterCommission
      : commissionCalc.profitAfterCommission - finalVatAmount;

    // Update booking
    await prisma.bookings.update({
      where: { id: bookingId },
      data: {
        grossProfit,
        netBeforeVAT: vatCalc.netBeforeVAT,
        vatAmount: finalVatAmount,
        totalWithVAT: saleInAED,
        agentCommissionAmount: commissionCalc.agentCommissionAmount,
        csCommissionAmount: commissionCalc.csCommissionAmount,
        totalCommission: commissionCalc.totalCommission,
        netProfit: finalNetProfit,
        updatedAt: new Date()
      }
    });
  }
}

export const bookingService = new BookingService();

