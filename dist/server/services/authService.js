import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { getDefaultPermissions } from '../utils/permissions';
import { trackLogin } from '../middleware/activityTracker';
import { prisma } from '../lib/prisma';
export class AuthService {
    /**
     * Login user
     */
    async login(input) {
        if (!input.username || !input.password) {
            console.error('❌ Login failed: Missing credentials');
            throw new Error('Username and password are required');
        }
        console.log('🔑 Login attempt for username:', input.username);
        const user = await prisma.users.findUnique({
            where: { username: input.username.toLowerCase() },
            include: {
                employees: true
            }
        });
        if (!user) {
            console.error('❌ Login failed: User not found -', input.username);
            throw new Error('Invalid username or password');
        }
        if (!user.isActive) {
            console.error('❌ Login failed: Account inactive -', input.username);
            throw new Error('Account is inactive');
        }
        const isPasswordValid = await bcrypt.compare(input.password, user.password);
        if (!isPasswordValid) {
            console.error('❌ Login failed: Invalid password -', input.username);
            throw new Error('Invalid username or password');
        }
        // Update last login
        await prisma.users.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });
        // Track login activity
        try {
            await trackLogin(user.id, user.email, 'unknown', 'unknown', true);
        }
        catch (error) {
            console.error('Failed to track login:', error);
            // Don't throw, login should succeed even if tracking fails
        }
        // Get user permissions - use default if empty
        let userPermissions;
        try {
            const permissionsString = user.permissions;
            const parsedPermissions = typeof permissionsString === 'string'
                ? JSON.parse(permissionsString)
                : permissionsString;
            // If permissions are empty or invalid, use default permissions for role
            if (!parsedPermissions || Object.keys(parsedPermissions).length === 0) {
                console.log(`User ${user.email} has empty permissions, using defaults for role: ${user.role}`);
                userPermissions = getDefaultPermissions(user.role);
                // Update user in database with default permissions
                await prisma.users.update({
                    where: { id: user.id },
                    data: { permissions: JSON.stringify(userPermissions) }
                });
            }
            else {
                userPermissions = parsedPermissions;
            }
        }
        catch (error) {
            console.log(`Error parsing permissions for ${user.email}, using defaults for role: ${user.role}`);
            userPermissions = getDefaultPermissions(user.role);
            // Update user in database with default permissions
            await prisma.users.update({
                where: { id: user.id },
                data: { permissions: JSON.stringify(userPermissions) }
            });
        }
        // Generate token
        const authenticatedUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            permissions: userPermissions
        };
        const token = generateToken(authenticatedUser);
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token
        };
    }
    /**
     * Register new user
     */
    async register(input) {
        // Check if username already exists
        const existingUsername = await prisma.users.findUnique({
            where: { username: input.username.toLowerCase() }
        });
        if (existingUsername) {
            throw new Error('Username already registered');
        }
        // Check if email already exists
        const existingEmail = await prisma.users.findUnique({
            where: { email: input.email.toLowerCase() }
        });
        if (existingEmail) {
            throw new Error('Email already registered');
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 10);
        // Get default permissions for role
        const permissions = getDefaultPermissions(input.role);
        // Create user
        const user = await prisma.users.create({
            data: {
                username: input.username.toLowerCase(),
                email: input.email.toLowerCase(),
                password: hashedPassword,
                firstName: input.firstName,
                lastName: input.lastName,
                role: input.role,
                permissions: permissions
            }
        });
        // Generate token
        const authenticatedUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            permissions: permissions
        };
        const token = generateToken(authenticatedUser);
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token
        };
    }
    /**
     * Get current user profile
     */
    async getProfile(userId) {
        const user = await prisma.users.findUnique({
            where: { id: userId },
            include: {
                employees: true
            }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    /**
     * Update user profile
     */
    async updateProfile(userId, data) {
        const user = await prisma.users.update({
            where: { id: userId },
            data
        });
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    /**
     * Change password
     */
    async changePassword(userId, oldPassword, newPassword) {
        const user = await prisma.users.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.users.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
    }
}
export const authService = new AuthService();
