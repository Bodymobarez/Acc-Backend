import { users } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { getDefaultPermissions } from '../utils/permissions';
import { AuthenticatedUser } from '../types';
import { trackLogin } from '../middleware/activityTracker';
import { prisma } from '../lib/prisma';

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export class AuthService {
  /**
   * Login user
   */
  async login(input: LoginInput): Promise<{ user: users; token: string }> {
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
    } catch (error) {
      console.error('Failed to track login:', error);
      // Don't throw, login should succeed even if tracking fails
    }
        
    // Get user permissions - use default if empty
    let userPermissions: Record<string, boolean>;
    try {
      const permissionsString = user.permissions as string;
      const parsedPermissions = typeof permissionsString === 'string' 
        ? JSON.parse(permissionsString) 
        : permissionsString;
          
      // If permissions are empty or invalid, use default permissions for role
      if (!parsedPermissions || Object.keys(parsedPermissions).length === 0) {
        console.log(`User ${user.email} has empty permissions, using defaults for role: ${user.role}`);
        userPermissions = getDefaultPermissions(user.role as any) as unknown as Record<string, boolean>;
            
        // Update user in database with default permissions
        await prisma.users.update({
          where: { id: user.id },
          data: { permissions: JSON.stringify(userPermissions) }
        });
      } else {
        userPermissions = parsedPermissions;
      }
    } catch (error) {
      console.log(`Error parsing permissions for ${user.email}, using defaults for role: ${user.role}`);
      userPermissions = getDefaultPermissions(user.role as any) as unknown as Record<string, boolean>;
          
      // Update user in database with default permissions
      await prisma.users.update({
        where: { id: user.id },
        data: { permissions: JSON.stringify(userPermissions) }
      });
    }
    
    // Generate token
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: userPermissions
    };
    
    const token = generateToken(authenticatedUser);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword as any,
      token
    };
  }
  
  /**
   * Register new user
   */
  async register(input: RegisterInput): Promise<{ user: users; token: string }> {
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
    const permissions = getDefaultPermissions(input.role as any);
    
    // Create user
    const user = await prisma.users.create({
      data: {
        username: input.username.toLowerCase(),
        email: input.email.toLowerCase(),
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role as any,
        permissions: permissions as any
      } as any
    });
    
    // Generate token
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: permissions as any
    };
    
    const token = generateToken(authenticatedUser);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword as any,
      token
    };
  }
  
  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<any> {
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
  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<any> {
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
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
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

