import { Prisma } from '@prisma/client';
import { AppError } from './AppError';
import { logger } from './logger';
import prisma from '../config/database';

/**
 * Check if error is a Prisma connection error
 */
export const isPrismaConnectionError = (error: any): boolean => {
  if (!error) return false;
  
  const connectionErrorCodes = ['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017'];
  const connectionErrorMessages = [
    'Can\'t reach database server',
    'Connection closed',
    'Connection timeout',
    'Connection refused',
    'ECONNREFUSED',
    'ENOTFOUND',
  ];
  
  if (error.code && connectionErrorCodes.includes(error.code)) {
    return true;
  }
  
  if (error.message) {
    const message = String(error.message);
    return connectionErrorMessages.some(msg => message.includes(msg));
  }
  
  return false;
};

/**
 * Handle Prisma errors and attempt reconnection if needed
 */
export const handlePrismaError = async (error: unknown): Promise<never> => {
  if (isPrismaConnectionError(error)) {
    logger.error('Database connection error detected:', {
      code: error.code,
      message: error.message,
    });
    
    // Attempt to reconnect
    try {
      await prisma.$disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database reconnected after error');
      
      // Throw a user-friendly error
      throw new AppError('Database connection lost. Please try again.', 503);
    } catch (reconnectError) {
      logger.error('❌ Failed to reconnect database:', reconnectError);
      throw new AppError('Database service temporarily unavailable', 503);
    }
  }
  
  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.warn('Prisma validation error:', error.message);
    throw new AppError('Invalid request data', 400);
  }
  
  // Handle Prisma known request errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn('Prisma known request error:', {
      code: error.code,
      message: error.message,
    });
    
    // Handle specific error codes
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = (error.meta as { target?: string[] })?.target;
        throw new AppError(
          `Duplicate entry${target ? ` on ${target}` : ''}`,
          409
        );
      case 'P2025':
        // Record not found
        throw new AppError('Record not found', 404);
      case 'P2003':
        // Foreign key constraint violation
        throw new AppError('Invalid reference', 400);
      default:
        throw new AppError('Database operation failed', 500);
    }
  }
  
  // Re-throw if it's already an AppError
  if (error instanceof AppError) {
    throw error;
  }
  
  // For other errors, log and throw generic error
  logger.error('Unexpected database error:', error);
  throw new AppError('An unexpected error occurred', 500);
};

/**
 * Wrapper for async database operations with error handling
 */
export const withDbErrorHandling = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    await handlePrismaError(error);
    throw error; // This should never be reached, but TypeScript needs it
  }
};






