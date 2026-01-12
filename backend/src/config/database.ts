import dotenv from 'dotenv';
import path from 'path';

// Завантажити .env ПЕРЕД створенням PrismaClient
// Try to load from backend/.env first, then from root/.env
const envPath = path.join(__dirname, '../.env');
const rootEnvPath = path.join(__dirname, '../../.env');

dotenv.config({ path: envPath });
dotenv.config({ path: rootEnvPath, override: false }); // Don't override if already loaded

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Query: ' + e.query);
    logger.debug('Duration: ' + e.duration + 'ms');
  });
}

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', e);
});

// Database reconnection state
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 2000; // 2 seconds

// Exponential backoff retry function
const reconnectWithBackoff = async (attempt: number): Promise<boolean> => {
  const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, attempt), 30000); // Max 30 seconds
  logger.info(`🔄 Attempting database reconnect (attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`; // Test connection
    reconnectAttempts = 0;
    isReconnecting = false;
    logger.info('✅ Database reconnected successfully');
    return true;
  } catch (error) {
    logger.warn(`❌ Reconnection attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : error);
    return false;
  }
};

// Handle database connection loss and reconnect
prisma.$on('error', async (e: any) => {
  logger.error('Prisma Error:', {
    code: e.code,
    message: e.message,
    meta: e.meta,
  });
  
  // Check if it's a connection error
  if (e.code === 'P1001' || e.code === 'P1002' || e.code === 'P1003' || e.code === 'P1000') {
    if (isReconnecting) {
      logger.debug('Reconnection already in progress, skipping...');
      return;
    }
    
    isReconnecting = true;
    logger.warn('🔄 Database connection lost, attempting to reconnect...');
    
    // Attempt to reconnect with exponential backoff
    for (let attempt = 0; attempt < MAX_RECONNECT_ATTEMPTS; attempt++) {
      const success = await reconnectWithBackoff(attempt);
      if (success) {
        return;
      }
    }
    
    logger.error('❌ Failed to reconnect to database after maximum attempts. Server may need restart.');
    isReconnecting = false;
    reconnectAttempts = 0;
  }
});

// Health check function for database
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn('Database health check failed:', error instanceof Error ? error.message : error);
    return false;
  }
};

// Test database connection with retry logic
export const connectDatabase = async (retries = 5, delay = 2000): Promise<boolean> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Check if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        const errorMsg = 'DATABASE_URL is not set in environment variables. Please check your .env file.';
        logger.error('❌ ' + errorMsg);
        throw new Error(errorMsg);
      }

      if (attempt > 0) {
        logger.info(`🔌 Attempting to connect to database (attempt ${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      } else {
        logger.info('🔌 Attempting to connect to database...');
      }
      
      const urlMatch = process.env.DATABASE_URL?.match(/postgresql:\/\/[^:]+:[^@]+@[^\/]+/);
      logger.debug('Database URL format: ' + (urlMatch ? 'Valid format' : 'Check format'));
      
      await prisma.$connect();
      logger.info('✅ Database connected successfully');
      
      // Test query
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connection verified');
      
      return true;
    } catch (error: any) {
      logger.error(`❌ Database connection failed (attempt ${attempt + 1}/${retries})`);
      logger.error(`Error code: ${error.code || 'UNKNOWN'}`);
      
      // Parse DATABASE_URL for better error messages (without showing password)
      const dbUrl = process.env.DATABASE_URL || '';
      const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
      
      // Provide helpful error messages
      if (error.code === 'ECONNREFUSED') {
        logger.error('❌ Connection refused. Is PostgreSQL running?');
        logger.error('💡 Check if PostgreSQL service is started');
      } else if (error.code === 'ENOTFOUND') {
        logger.error('❌ Database host not found. Check DATABASE_URL hostname');
        if (urlMatch) logger.error(`   Host: ${urlMatch[3]}`);
      } else if (error.code === 'P1001') {
        logger.error('❌ Cannot reach database server. Is PostgreSQL running on the specified port?');
        if (urlMatch) logger.error(`   Host: ${urlMatch[3]}, Port: ${urlMatch[4]}`);
      } else if (error.code === 'P1000') {
        logger.error('❌ Authentication failed. Check database username and password in DATABASE_URL');
        if (urlMatch) {
          logger.error(`   Username: ${urlMatch[1]}`);
          logger.error(`   Database: ${urlMatch[5]}`);
          logger.error('   💡 Verify password is correct and user exists in PostgreSQL');
        }
      } else if (error.code === 'P1003') {
        logger.error('❌ Database does not exist. Create it first or check DATABASE_URL');
        if (urlMatch) {
          logger.error(`   Database name: ${urlMatch[5]}`);
          logger.error('   💡 Create database with: CREATE DATABASE ' + urlMatch[5] + ';');
        }
      } else if (error.message?.includes('Authentication failed')) {
        logger.error('❌ Authentication failed');
        if (urlMatch) {
          logger.error(`   Username: ${urlMatch[1]}`);
          logger.error(`   Database: ${urlMatch[5]}`);
          logger.error('   💡 Possible issues:');
          logger.error('      - Wrong password');
          logger.error('      - User does not exist');
          logger.error('      - Database does not exist');
          logger.error('   💡 To create database:');
          logger.error(`      psql -U postgres -c "CREATE DATABASE ${urlMatch[5]};"`);
        }
      }
      
      // If this is the last attempt, throw the error
      if (attempt === retries - 1) {
        logger.error('Error details:', error.message || error);
        logger.error('DATABASE_URL format check:', dbUrl ? 'Set (check format: postgresql://user:pass@host:port/db)' : 'NOT SET');
        throw error;
      }
    }
  }
  
  return false;
};

// Disconnect database
export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('✅ Database disconnected');
  } catch (error) {
    logger.error('❌ Error disconnecting from database:', error);
    throw error;
  }
};

export default prisma;





