import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';

export const airlineController = {
  // Get all airlines
  async getAll(req: Request, res: Response) {
    try {
      const airlines = await (prisma as any).airlines.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });

      res.json({ success: true, data: airlines });
    } catch (error: any) {
      console.error('Error fetching airlines:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch airlines',
        details: error.message 
      });
    }
  },

  // Create new airline
  async create(req: Request, res: Response) {
    try {
      const { name, code, country } = req.body;

      // Check if airline already exists
      const existing = await (prisma as any).airlines.findUnique({
        where: { name }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Airline already exists'
        });
      }

      const airline = await (prisma as any).airlines.create({
        data: {
          id: randomUUID(),
          name,
          code: code || null,
          country: country || null,
          isActive: true,
          updatedAt: new Date()
        }
      });

      res.status(201).json({ success: true, data: airline });
    } catch (error: any) {
      console.error('Error creating airline:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create airline',
        details: error.message 
      });
    }
  },

  // Get or create airline (used when saving booking)
  async getOrCreate(req: Request, res: Response) {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Airline name is required'
        });
      }

      // Try to find existing airline
      let airline = await (prisma as any).airlines.findUnique({
        where: { name: name.trim() }
      });

      // If not found, create it
      if (!airline) {
        airline = await (prisma as any).airlines.create({
          data: {
            id: randomUUID(),
            name: name.trim(),
            isActive: true,
            updatedAt: new Date()
          }
        });
      }

      res.json({ success: true, data: airline });
    } catch (error: any) {
      console.error('Error in getOrCreate airline:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process airline',
        details: error.message 
      });
    }
  }
};
