import { Redis } from '@upstash/redis';

// ==================== Redis Client ====================

export const redis = new Redis({
  url: process.env.REDIS_URL || '',
  token: process.env.REDIS_TOKEN || '',
});

// ==================== Cache Utilities ====================

export const cache = {
  /**
   * Get value from cache
   * @param key Cache key
   * @returns Parsed value or null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      
      console.log('📦 Cache HIT:', key);
      return data as T;
    } catch (error) {
      console.error('❌ Cache GET error:', error);
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (default: 1 hour)
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      console.log('💾 Cache SET:', key, `(TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ Cache SET error:', error);
    }
  },

  /**
   * Delete key from cache
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
      console.log('🗑️  Cache DEL:', key);
    } catch (error) {
      console.error('❌ Cache DEL error:', error);
    }
  },

  /**
   * Delete all keys matching pattern
   * @param pattern Key pattern (e.g., "bookings:*")
   */
  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log('🧹 Cache CLEAR:', pattern, `(${keys.length} keys)`);
      }
    } catch (error) {
      console.error('❌ Cache CLEAR error:', error);
    }
  },

  /**
   * Check if key exists
   * @param key Cache key
   * @returns Boolean
   */
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('❌ Cache EXISTS error:', error);
      return false;
    }
  },

  /**
   * Set TTL for existing key
   * @param key Cache key
   * @param ttl Time to live in seconds
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await redis.expire(key, ttl);
      console.log('⏰ Cache EXPIRE:', key, `(TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ Cache EXPIRE error:', error);
    }
  },
};

// ==================== Rate Limiting ====================

export const rateLimit = {
  /**
   * Check rate limit for IP/user
   * @param identifier IP address or user ID
   * @param max Maximum requests
   * @param windowSeconds Time window in seconds
   * @returns { allowed: boolean, remaining: number }
   */
  async check(
    identifier: string,
    max: number = 100,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const key = `ratelimit:${identifier}`;
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        // First request in window
        await redis.expire(key, windowSeconds);
      }
      
      const ttl = await redis.ttl(key);
      const resetAt = new Date(Date.now() + ttl * 1000);
      const remaining = Math.max(0, max - current);
      
      return {
        allowed: current <= max,
        remaining,
        resetAt,
      };
    } catch (error) {
      console.error('❌ Rate limit error:', error);
      // Allow request on error
      return {
        allowed: true,
        remaining: max,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }
  },
};

// ==================== Session Storage ====================

export const session = {
  /**
   * Store session data
   * @param sessionId Session ID
   * @param data Session data
   * @param ttl Time to live in seconds (default: 7 days)
   */
  async set(sessionId: string, data: any, ttl: number = 604800): Promise<void> {
    const key = `session:${sessionId}`;
    await cache.set(key, data, ttl);
  },

  /**
   * Get session data
   * @param sessionId Session ID
   * @returns Session data or null
   */
  async get<T>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`;
    return await cache.get<T>(key);
  },

  /**
   * Delete session
   * @param sessionId Session ID
   */
  async destroy(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await cache.del(key);
  },

  /**
   * Refresh session TTL
   * @param sessionId Session ID
   * @param ttl Time to live in seconds (default: 7 days)
   */
  async refresh(sessionId: string, ttl: number = 604800): Promise<void> {
    const key = `session:${sessionId}`;
    await cache.expire(key, ttl);
  },
};

// ==================== Cache Key Builders ====================

export const cacheKeys = {
  bookings: {
    all: (filters?: any) => `bookings:all:${JSON.stringify(filters || {})}`,
    byId: (id: string) => `bookings:${id}`,
    stats: () => 'bookings:stats',
  },
  
  invoices: {
    all: (filters?: any) => `invoices:all:${JSON.stringify(filters || {})}`,
    byId: (id: string) => `invoices:${id}`,
    stats: () => 'invoices:stats',
  },
  
  payments: {
    all: (filters?: any) => `payments:all:${JSON.stringify(filters || {})}`,
    byId: (id: string) => `payments:${id}`,
    stats: () => 'payments:stats',
  },
  
  customers: {
    all: () => 'customers:all',
    byId: (id: string) => `customers:${id}`,
  },
  
  suppliers: {
    all: () => 'suppliers:all',
    byId: (id: string) => `suppliers:${id}`,
  },
};

// ==================== Export ====================

export default redis;
