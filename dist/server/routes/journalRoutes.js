import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, requirePermission } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { randomUUID } from 'crypto';
const router = Router();
// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};
// @route   GET /api/journal-entries
// @desc    Get all journal entries with filters
// @access  Private (Accountant/Admin)
router.get('/', authenticate, requirePermission('viewFinancialReports'), async (req, res) => {
    try {
        const { status, transactionType, startDate, endDate, debitAccountId, creditAccountId } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (transactionType)
            where.transactionType = transactionType;
        if (debitAccountId)
            where.debitAccountId = debitAccountId;
        if (creditAccountId)
            where.creditAccountId = creditAccountId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        const entries = await prisma.journal_entries.findMany({
            where,
            include: {
                accounts_journal_entries_debitAccountIdToaccounts: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        nameAr: true,
                        type: true
                    }
                },
                accounts_journal_entries_creditAccountIdToaccounts: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        nameAr: true,
                        type: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
        res.json({
            success: true,
            data: entries
        });
    }
    catch (error) {
        console.error('Error fetching journal entries:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch journal entries'
        });
    }
});
// @route   GET /api/journal-entries/:id
// @desc    Get journal entry by ID
// @access  Private (Accountant/Admin)
router.get('/:id', authenticate, requirePermission('viewFinancialReports'), [param('id').notEmpty().withMessage('Entry ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await prisma.journal_entries.findUnique({
            where: { id },
            include: {
                accounts_journal_entries_debitAccountIdToaccounts: true,
                accounts_journal_entries_creditAccountIdToaccounts: true
            }
        });
        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Journal entry not found'
            });
        }
        res.json({
            success: true,
            data: entry
        });
    }
    catch (error) {
        console.error('Error fetching journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch journal entry'
        });
    }
});
// @route   POST /api/journal-entries
// @desc    Create new journal entry
// @access  Private (Accountant/Admin)
router.post('/', authenticate, requirePermission('managePermissions'), // High-level permission for accounting
[
    body('description').notEmpty().withMessage('Description is required'),
    body('debitAccountId').notEmpty().withMessage('Debit account is required'),
    body('creditAccountId').notEmpty().withMessage('Credit account is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('date').optional().isISO8601().withMessage('Invalid date format'),
    body('transactionType').optional().isString(),
    body('reference').optional().isString(),
    body('bookingId').optional().isString(),
    body('invoiceId').optional().isString()
], handleValidationErrors, async (req, res) => {
    try {
        const { description, debitAccountId, creditAccountId, amount, date, transactionType, reference, bookingId, invoiceId, notes } = req.body;
        // Validate accounts exist
        const [debitAccount, creditAccount] = await Promise.all([
            prisma.accounts.findUnique({ where: { id: debitAccountId } }),
            prisma.accounts.findUnique({ where: { id: creditAccountId } })
        ]);
        if (!debitAccount) {
            return res.status(400).json({
                success: false,
                error: 'Debit account not found'
            });
        }
        if (!creditAccount) {
            return res.status(400).json({
                success: false,
                error: 'Credit account not found'
            });
        }
        // Generate entry number
        const lastEntry = await prisma.journal_entries.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        let nextNumber = 1;
        if (lastEntry && lastEntry.entryNumber) {
            const match = lastEntry.entryNumber.match(/JE-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        const entryNumber = `JE-${String(nextNumber).padStart(6, '0')}`;
        // Create journal entry
        const entry = await prisma.journal_entries.create({
            data: {
                id: randomUUID(),
                entryNumber,
                description,
                debitAccountId,
                creditAccountId,
                amount,
                date: date ? new Date(date) : new Date(),
                transactionType,
                reference,
                bookingId,
                invoiceId,
                notes,
                status: 'DRAFT',
                createdBy: req.user?.id,
                updatedAt: new Date()
            },
            include: {
                accounts_journal_entries_debitAccountIdToaccounts: true,
                accounts_journal_entries_creditAccountIdToaccounts: true
            }
        });
        res.status(201).json({
            success: true,
            data: entry,
            message: 'Journal entry created successfully'
        });
    }
    catch (error) {
        console.error('Error creating journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create journal entry'
        });
    }
});
// @route   PUT /api/journal-entries/:id
// @desc    Update journal entry
// @access  Private (Accountant/Admin)
router.put('/:id', authenticate, requirePermission('managePermissions'), [param('id').notEmpty().withMessage('Entry ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        // Check if entry exists
        const existingEntry = await prisma.journal_entries.findUnique({
            where: { id }
        });
        if (!existingEntry) {
            return res.status(404).json({
                success: false,
                error: 'Journal entry not found'
            });
        }
        // Prevent updating posted entries
        if (existingEntry.status === 'POSTED') {
            return res.status(400).json({
                success: false,
                error: 'Cannot update posted journal entry'
            });
        }
        const entry = await prisma.journal_entries.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date()
            },
            include: {
                accounts_journal_entries_debitAccountIdToaccounts: true,
                accounts_journal_entries_creditAccountIdToaccounts: true
            }
        });
        res.json({
            success: true,
            data: entry,
            message: 'Journal entry updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update journal entry'
        });
    }
});
// @route   POST /api/journal-entries/:id/post
// @desc    Post journal entry (make it permanent)
// @access  Private (Accountant/Admin)
router.post('/:id/post', authenticate, requirePermission('managePermissions'), [param('id').notEmpty().withMessage('Entry ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await prisma.journal_entries.findUnique({
            where: { id },
            include: {
                accounts_journal_entries_debitAccountIdToaccounts: true,
                accounts_journal_entries_creditAccountIdToaccounts: true
            }
        });
        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Journal entry not found'
            });
        }
        if (entry.status === 'POSTED') {
            return res.status(400).json({
                success: false,
                error: 'Journal entry already posted'
            });
        }
        // Update account balances
        await prisma.$transaction([
            // Update debit account
            prisma.accounts.update({
                where: { id: entry.debitAccountId },
                data: {
                    debitBalance: {
                        increment: entry.amount
                    },
                    balance: {
                        increment: entry.amount
                    },
                    updatedAt: new Date()
                }
            }),
            // Update credit account
            prisma.accounts.update({
                where: { id: entry.creditAccountId },
                data: {
                    creditBalance: {
                        increment: entry.amount
                    },
                    balance: {
                        decrement: entry.amount
                    },
                    updatedAt: new Date()
                }
            }),
            // Update entry status
            prisma.journal_entries.update({
                where: { id },
                data: {
                    status: 'POSTED',
                    postedDate: new Date(),
                    updatedAt: new Date()
                }
            })
        ]);
        const updatedEntry = await prisma.journal_entries.findUnique({
            where: { id },
            include: {
                accounts_journal_entries_debitAccountIdToaccounts: true,
                accounts_journal_entries_creditAccountIdToaccounts: true
            }
        });
        res.json({
            success: true,
            data: updatedEntry,
            message: 'Journal entry posted successfully'
        });
    }
    catch (error) {
        console.error('Error posting journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to post journal entry'
        });
    }
});
// @route   DELETE /api/journal-entries/:id
// @desc    Delete journal entry (draft only)
// @access  Private (Accountant/Admin)
router.delete('/:id', authenticate, requirePermission('managePermissions'), [param('id').notEmpty().withMessage('Entry ID is required')], handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await prisma.journal_entries.findUnique({
            where: { id }
        });
        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Journal entry not found'
            });
        }
        if (entry.status === 'POSTED') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete posted journal entry. Please reverse it instead.'
            });
        }
        await prisma.journal_entries.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Journal entry deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete journal entry'
        });
    }
});
export default router;
