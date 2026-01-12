/**
 * Cache utility using Redis
 * Falls back to in-memory cache if Redis is not available
 */

import { getRedisClient } from '../config/redis';
import { logger } from './logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

class CacheService {
  private memoryCache = new Map<string, { value: unknown; expires: number }>();

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    
    if (redis) {
      try {
        const value = await redis.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
      } catch (error) {
        logger.warn('Redis get error:', error);
      }
    }
    
    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value as T;
    }
    
    if (cached) {
      this.memoryCache.delete(key);
    }
    
    return null;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    const redis = getRedisClient();
    const ttl = options.ttl || 3600; // Default 1 hour
    
    if (redis) {
      try {
        await redis.setEx(key, ttl, JSON.stringify(value));
        return;
      } catch (error) {
        logger.warn('Redis set error:', error);
      }
    }
    
    // Fallback to memory cache
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
    
    // Cleanup expired entries periodically
    if (this.memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    const redis = getRedisClient();
    
    if (redis) {
      try {
        await redis.del(key);
      } catch (error) {
        logger.warn('Redis del error:', error);
      }
    }
    
    this.memoryCache.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    const redis = getRedisClient();
    
    if (redis) {
      try {
        await redis.flushAll();
      } catch (error) {
        logger.warn('Redis flush error:', error);
      }
    }
    
    this.memoryCache.clear();
  }

  /**
   * Cleanup expired memory cache entries
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}

export const cache = new CacheService();

/**
 * Cache decorator for functions
 */
export function cached(keyPrefix: string, ttl: number = 3600) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${keyPrefix}:${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      await cache.set(cacheKey, result, { ttl });
      
      return result;
    };
  };
}
