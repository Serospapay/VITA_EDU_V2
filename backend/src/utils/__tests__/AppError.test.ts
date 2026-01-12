import { AppError } from '../AppError';

describe('AppError', () => {
  it('should create an AppError with message and statusCode', () => {
    const error = new AppError('Test error', 400);
    
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('should have correct stack trace', () => {
    const error = new AppError('Test error', 500);
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });

  it('should work with different status codes', () => {
    const error404 = new AppError('Not found', 404);
    const error500 = new AppError('Server error', 500);
    const error401 = new AppError('Unauthorized', 401);
    
    expect(error404.statusCode).toBe(404);
    expect(error500.statusCode).toBe(500);
    expect(error401.statusCode).toBe(401);
  });
});
