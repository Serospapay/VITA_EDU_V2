import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { handlePrismaError, isPrismaConnectionError } from '../utils/dbErrorHandler';
import { AppError } from '../utils/AppError';

// Re-export AppError for backward compatibility
export { AppError };

export const errorHandler = async (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle Prisma errors first
  if (isPrismaConnectionError(err) || 
      err instanceof Prisma.PrismaClientKnownRequestError ||
      err instanceof Prisma.PrismaClientValidationError) {
    try {
      await handlePrismaError(err);
    } catch (prismaError) {
      // handlePrismaError throws AppError, so we catch and use it
      if (prismaError instanceof AppError) {
        statusCode = prismaError.statusCode;
        message = prismaError.message;
      } else {
        statusCode = 503;
        message = 'Database service temporarily unavailable';
      }
    }
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // CORS errors are not critical - log as warning, not error
  if (err.message === 'Not allowed by CORS') {
    logger.debug('CORS rejection:', {
      origin: _req.headers.origin,
      message: err.message,
    });
    res.status(403).json({
      success: false,
      error: {
        message: 'CORS policy violation',
      },
    });
    return;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      url: _req.url,
      method: _req.method,
    });
  } else {
    logger.warn('Client Error:', { 
      message: err.message,
      statusCode,
      url: _req.url,
    });
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

















