import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
export class AccountController {
    /**
     * Get all accounts
     */
    async getAll(req, res) {
        try {
            const accounts = await prisma.accounts.findMany({
                include: {
                    accounts: true,
                    other_accounts: true
                },
                orderBy: {
                    code: 'asc'
                }
            });
            res.json({
                success: true,
                data: accounts
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Get account by ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const account = await prisma.accounts.findUnique({
                where: { id },
                include: {
                    accounts: true,
                    other_accounts: true
                }
            });
            if (!account) {
                res.status(404).json({
                    success: false,
                    error: 'Account not found'
                });
                return;
            }
            res.json({
                success: true,
                data: account
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Create account
     */
    async create(req, res) {
        try {
            const account = await prisma.accounts.create({
                data: {
                    id: randomUUID(),
                    ...req.body,
                    updatedAt: new Date()
                }
            });
            res.status(201).json({
                success: true,
                data: account
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Update account
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const account = await prisma.accounts.update({
                where: { id },
                data: {
                    ...req.body,
                    updatedAt: new Date()
                }
            });
            res.json({
                success: true,
                data: account
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
    /**
     * Delete account
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            // Check if account has children
            const children = await prisma.accounts.findMany({
                where: { parentId: id }
            });
            if (children.length > 0) {
                res.status(400).json({
                    success: false,
                    error: 'Cannot delete account with sub-accounts'
                });
                return;
            }
            await prisma.accounts.delete({
                where: { id }
            });
            res.json({
                success: true,
                message: 'Account deleted successfully'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}
export const accountController = new AccountController();
