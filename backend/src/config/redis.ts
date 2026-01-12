import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      // Don't reconnect if Redis is not available
      // Return false to stop reconnection attempts
      if (retries > 0) {
        return false; // Stop trying after first attempt fails
      }
      return 1000; // Wait 1 second before first retry
    },
  },
  // Don't connect automatically - we'll connect manually
  // This prevents automatic reconnection attempts
});

let isRedisConnected = false;
let errorLogged = false; // Flag to prevent spam logging
let connectionAttempted = false; // Flag to prevent multiple connection attempts

redisClient.on('error', (err) => {
  // Only log the error once to prevent spam
  if (!errorLogged) {
    logger.warn('⚠️  Redis not available (Redis is optional), continuing without caching');
    logger.warn('To enable Redis, install Memurai: https://www.memurai.com/');
    errorLogged = true;
  }
  isRedisConnected = false;
});

redisClient.on('connect', () => {
  logger.info('✅ Redis Client Connected');
  isRedisConnected = true;
  errorLogged = false; // Reset flag on successful connection
});

export const connectRedis = async () => {
  // Prevent multiple connection attempts
  if (connectionAttempted && !isRedisConnected) {
    return;
  }
  
  connectionAttempted = true;
  
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      isRedisConnected = true;
    }
  } catch (error: any) {
    // Error handler will log the message, so we don't need to log here
    isRedisConnected = false;
  }
};

export const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};

export const getRedisClient = () => {
  return isRedisConnected ? redisClient : null;
};

export default redisClient;

