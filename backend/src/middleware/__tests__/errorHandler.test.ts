import { Request, Response, NextFunction } from 'express';
import { errorHandler, AppError } from '../errorHandler';
import { Prisma } from '@prisma/client';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('errorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      url: '/test',
      method: 'GET',
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('should handle AppError correctly', async () => {
    const error = new AppError('Test error', 400);
    
    await errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Test error',
      },
    });
  });

  it('should handle CORS errors', async () => {
    const error = new Error('Not allowed by CORS');
    
    await errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'CORS policy violation',
      },
    });
  });

  it('should handle generic errors with 500 status', async () => {
    const error = new Error('Generic error');
    
    await errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Internal Server Error',
      },
    });
  });

  it('should include stack trace in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Test error');
    error.stack = 'Error stack trace';
    
    await errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Internal Server Error',
        stack: 'Error stack trace',
      },
    });

    process.env.NODE_ENV = originalEnv;
  });
});
