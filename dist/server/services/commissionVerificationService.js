import { prisma } from '../lib/prisma';
/**
 * Commission Verification Service
 * Verifies user-booking relationships and commission calculations
 */
export class CommissionVerificationService {
    /**
     * Verify booking-user relationships
     * Checks if booking is properly linked to creator, agents, and employees
     */
    async verifyBookingUserRelationships(bookingId) {
        const issues = [];
        // Fetch booking with all user relations
        const booking = await prisma.bookings.findUnique({
            where: { id: bookingId },
            include: {
                users: true, // Creator
                employees_bookings_bookingAgentIdToemployees: {
                    include: {
                        users: true
                    }
                },
                employees_bookings_customerServiceIdToemployees: {
                    include: {
                        users: true
                    }
                },
                customers: true,
                suppliers: true
            }
        });
        if (!booking) {
            return {
                valid: false,
                booking: null,
                creator: null,
                bookingAgent: null,
                customerServiceAgent: null,
                relationships: {
                    hasCreator: false,
                    hasBookingAgent: false,
                    hasCustomerService: false,
                    creatorIsUser: false,
                    agentIsEmployee: false,
                    csIsEmployee: false
                },
                issues: ['Booking not found']
            };
        }
        const creator = booking.users;
        const bookingAgent = booking.employees_bookings_bookingAgentIdToemployees;
        const customerServiceAgent = booking.employees_bookings_customerServiceIdToemployees;
        // Verify creator relationship
        if (!creator) {
            issues.push('Booking has no creator user');
        }
        // Verify booking agent relationship
        if (booking.bookingAgentId && !bookingAgent) {
            issues.push('Booking has bookingAgentId but employee not found');
        }
        // Verify customer service agent relationship
        if (booking.customerServiceId && !customerServiceAgent) {
            issues.push('Booking has customerServiceId but employee not found');
        }
        // Verify employee-user links
        if (bookingAgent && !bookingAgent.users) {
            issues.push('Booking agent employee has no linked user');
        }
        if (customerServiceAgent && !customerServiceAgent.users) {
            issues.push('Customer service employee has no linked user');
        }
        return {
            valid: issues.length === 0,
            booking,
            creator,
            bookingAgent,
            customerServiceAgent,
            relationships: {
                hasCreator: !!creator,
                hasBookingAgent: !!bookingAgent,
                hasCustomerService: !!customerServiceAgent,
                creatorIsUser: !!creator,
                agentIsEmployee: !!(bookingAgent && bookingAgent.users),
                csIsEmployee: !!(customerServiceAgent && customerServiceAgent.users)
            },
            issues
        };
    }
    /**
     * Verify commission calculations
     * Recalculates commissions and compares with stored values
     */
    async verifyCommissionCalculations(bookingId) {
        const issues = [];
        const booking = await prisma.bookings.findUnique({
            where: { id: bookingId },
            include: {
                employees_bookings_bookingAgentIdToemployees: true,
                employees_bookings_customerServiceIdToemployees: true
            }
        });
        if (!booking) {
            throw new Error('Booking not found');
        }
        // Recalculate gross profit
        const grossProfit = (booking.netBeforeVAT || booking.saleInAED) - booking.costInAED;
        // Get commission rates
        const agentCommissionRate = booking.agentCommissionRate || 0;
        const csCommissionRate = booking.csCommissionRate || 0;
        // Recalculate commissions
        const calculatedAgentCommission = (grossProfit * agentCommissionRate) / 100;
        const calculatedCsCommission = (grossProfit * csCommissionRate) / 100;
        const calculatedTotalCommission = calculatedAgentCommission + calculatedCsCommission;
        const calculatedProfitAfterCommission = grossProfit - calculatedTotalCommission;
        // Recalculate VAT on profit after commissions
        const calculatedVatAmount = booking.vatApplicable
            ? (calculatedProfitAfterCommission * 5) / 100
            : 0;
        // Recalculate net profit
        const calculatedNetProfit = calculatedProfitAfterCommission - calculatedVatAmount;
        // Compare with stored values
        const epsilon = 0.01; // Allow 1 cent difference for rounding
        const stored = {
            grossProfit: booking.grossProfit || 0,
            agentCommissionRate: booking.agentCommissionRate || 0,
            agentCommissionAmount: booking.agentCommissionAmount || 0,
            csCommissionRate: booking.csCommissionRate || 0,
            csCommissionAmount: booking.csCommissionAmount || 0,
            totalCommission: booking.totalCommission || 0,
            profitAfterCommission: grossProfit - (booking.totalCommission || 0),
            vatAmount: booking.vatAmount || 0,
            netProfit: booking.netProfit || 0
        };
        const calculated = {
            grossProfit: parseFloat(grossProfit.toFixed(2)),
            agentCommissionRate,
            agentCommissionAmount: parseFloat(calculatedAgentCommission.toFixed(2)),
            csCommissionRate,
            csCommissionAmount: parseFloat(calculatedCsCommission.toFixed(2)),
            totalCommission: parseFloat(calculatedTotalCommission.toFixed(2)),
            profitAfterCommission: parseFloat(calculatedProfitAfterCommission.toFixed(2)),
            vatAmount: parseFloat(calculatedVatAmount.toFixed(2)),
            netProfit: parseFloat(calculatedNetProfit.toFixed(2))
        };
        const differences = {
            agentCommission: Math.abs(stored.agentCommissionAmount - calculated.agentCommissionAmount),
            csCommission: Math.abs(stored.csCommissionAmount - calculated.csCommissionAmount),
            totalCommission: Math.abs(stored.totalCommission - calculated.totalCommission),
            vatAmount: Math.abs(stored.vatAmount - calculated.vatAmount),
            netProfit: Math.abs(stored.netProfit - calculated.netProfit)
        };
        // Check for discrepancies
        if (differences.agentCommission > epsilon) {
            issues.push(`Agent commission mismatch: Stored ${stored.agentCommissionAmount}, ` +
                `Calculated ${calculated.agentCommissionAmount} (diff: ${differences.agentCommission})`);
        }
        if (differences.csCommission > epsilon) {
            issues.push(`CS commission mismatch: Stored ${stored.csCommissionAmount}, ` +
                `Calculated ${calculated.csCommissionAmount} (diff: ${differences.csCommission})`);
        }
        if (differences.totalCommission > epsilon) {
            issues.push(`Total commission mismatch: Stored ${stored.totalCommission}, ` +
                `Calculated ${calculated.totalCommission} (diff: ${differences.totalCommission})`);
        }
        if (differences.vatAmount > epsilon) {
            issues.push(`VAT amount mismatch: Stored ${stored.vatAmount}, ` +
                `Calculated ${calculated.vatAmount} (diff: ${differences.vatAmount})`);
        }
        if (differences.netProfit > epsilon) {
            issues.push(`Net profit mismatch: Stored ${stored.netProfit}, ` +
                `Calculated ${calculated.netProfit} (diff: ${differences.netProfit})`);
        }
        return {
            valid: issues.length === 0,
            booking,
            stored,
            calculated,
            differences,
            issues
        };
    }
    /**
     * Get employee commission summary
     * Shows all bookings and commissions for a specific employee
     */
    async getEmployeeCommissionSummary(employeeId) {
        // Get employee with user info
        const employee = await prisma.employees.findUnique({
            where: { id: employeeId },
            include: {
                users: true,
                bookings_bookings_bookingAgentIdToemployees: {
                    include: {
                        customers: true
                    },
                    where: {
                        status: { not: 'CANCELLED' }
                    }
                },
                bookings_bookings_customerServiceIdToemployees: {
                    include: {
                        customers: true
                    },
                    where: {
                        status: { not: 'CANCELLED' }
                    }
                }
            }
        });
        if (!employee) {
            throw new Error('Employee not found');
        }
        const asBookingAgent = employee.bookings_bookings_bookingAgentIdToemployees;
        const asCustomerService = employee.bookings_bookings_customerServiceIdToemployees;
        const agentTotalCommission = asBookingAgent.reduce((sum, b) => sum + (b.agentCommissionAmount || 0), 0);
        const csTotalCommission = asCustomerService.reduce((sum, b) => sum + (b.csCommissionAmount || 0), 0);
        return {
            employee,
            user: employee.users,
            asBookingAgent: {
                bookings: asBookingAgent,
                totalCommission: parseFloat(agentTotalCommission.toFixed(2)),
                count: asBookingAgent.length
            },
            asCustomerService: {
                bookings: asCustomerService,
                totalCommission: parseFloat(csTotalCommission.toFixed(2)),
                count: asCustomerService.length
            },
            totalEarned: parseFloat((agentTotalCommission + csTotalCommission).toFixed(2))
        };
    }
    /**
     * Verify commission rates match employee default rates
     * Checks if booking commission rates were correctly pulled from employee profiles
     */
    async verifyCommissionRates(bookingId) {
        const issues = [];
        const booking = await prisma.bookings.findUnique({
            where: { id: bookingId },
            include: {
                employees_bookings_bookingAgentIdToemployees: true,
                employees_bookings_customerServiceIdToemployees: true
            }
        });
        if (!booking) {
            throw new Error('Booking not found');
        }
        const agentEmployee = booking.employees_bookings_bookingAgentIdToemployees;
        const csEmployee = booking.employees_bookings_customerServiceIdToemployees;
        const agentDefaultRate = agentEmployee?.defaultCommissionRate || null;
        const csDefaultRate = csEmployee?.defaultCommissionRate || null;
        const agentBookingRate = booking.agentCommissionRate || 0;
        const csBookingRate = booking.csCommissionRate || 0;
        const agentMatches = agentDefaultRate === null || agentDefaultRate === agentBookingRate;
        const csMatches = csDefaultRate === null || csDefaultRate === csBookingRate;
        if (!agentMatches && agentEmployee) {
            issues.push(`Agent commission rate mismatch: Employee default ${agentDefaultRate}%, ` +
                `Booking rate ${agentBookingRate}%`);
        }
        if (!csMatches && csEmployee) {
            issues.push(`CS commission rate mismatch: Employee default ${csDefaultRate}%, ` +
                `Booking rate ${csBookingRate}%`);
        }
        return {
            valid: issues.length === 0,
            booking,
            agentRateCheck: {
                employeeDefaultRate: agentDefaultRate,
                bookingRate: agentBookingRate,
                matches: agentMatches
            },
            csRateCheck: {
                employeeDefaultRate: csDefaultRate,
                bookingRate: csBookingRate,
                matches: csMatches
            },
            issues
        };
    }
    /**
     * Get all commission issues in the system
     * Scans all bookings for calculation errors
     */
    async findAllCommissionIssues() {
        const bookings = await prisma.bookings.findMany({
            where: {
                status: { not: 'CANCELLED' }
            },
            include: {
                employees_bookings_bookingAgentIdToemployees: true,
                employees_bookings_customerServiceIdToemployees: true
            }
        });
        const bookingsWithIssues = [];
        for (const booking of bookings) {
            const problems = [];
            // Recalculate and verify
            const grossProfit = (booking.netBeforeVAT || booking.saleInAED) - booking.costInAED;
            const agentRate = booking.agentCommissionRate || 0;
            const csRate = booking.csCommissionRate || 0;
            const calculatedAgentComm = (grossProfit * agentRate) / 100;
            const calculatedCsComm = (grossProfit * csRate) / 100;
            const calculatedTotal = calculatedAgentComm + calculatedCsComm;
            const epsilon = 0.01;
            if (Math.abs((booking.agentCommissionAmount || 0) - calculatedAgentComm) > epsilon) {
                problems.push('Agent commission calculation error');
            }
            if (Math.abs((booking.csCommissionAmount || 0) - calculatedCsComm) > epsilon) {
                problems.push('CS commission calculation error');
            }
            if (Math.abs((booking.totalCommission || 0) - calculatedTotal) > epsilon) {
                problems.push('Total commission calculation error');
            }
            if (problems.length > 0) {
                bookingsWithIssues.push({
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    problems
                });
            }
        }
        return {
            totalBookings: bookings.length,
            bookingsWithIssues: bookingsWithIssues.length,
            issues: bookingsWithIssues
        };
    }
}
export const commissionVerificationService = new CommissionVerificationService();
