import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

// Create Redis store if available
let store: any = undefined;
const redis = getRedisClient();

if (redis) {
  try {
    // Use Redis for distributed rate limiting
    const RedisStore = require('rate-limit-redis').default;
    store = new RedisStore({
      client: redis,
      prefix: 'rl:',
    });
    logger.info('✅ Using Redis for rate limiting');
  } catch (error) {
    logger.warn('⚠️ Redis store for rate limiting not available, using memory store');
  }
}

export const rateLimiter = rateLimit({
  store,
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limit for auth routes
export const authRateLimiter = rateLimit({
  store,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  skipSuccessfulRequests: true,
});
