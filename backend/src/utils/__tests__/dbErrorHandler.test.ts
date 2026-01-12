import { isPrismaConnectionError } from '../dbErrorHandler';
import { Prisma } from '@prisma/client';

describe('dbErrorHandler', () => {
  describe('isPrismaConnectionError', () => {
    it('should detect Prisma connection error by code', () => {
      const error = { code: 'P1001', message: 'Connection timeout' };
      
      expect(isPrismaConnectionError(error)).toBe(true);
    });

    it('should detect Prisma connection error by message', () => {
      const error = { message: 'Can\'t reach database server' };
      
      expect(isPrismaConnectionError(error)).toBe(true);
    });

    it('should detect ECONNREFUSED error', () => {
      const error = { message: 'ECONNREFUSED' };
      
      expect(isPrismaConnectionError(error)).toBe(true);
    });

    it('should return false for non-connection errors', () => {
      const error = { code: 'P2002', message: 'Unique constraint violation' };
      
      expect(isPrismaConnectionError(error)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isPrismaConnectionError(null)).toBe(false);
      expect(isPrismaConnectionError(undefined)).toBe(false);
    });

    it('should detect all connection error codes', () => {
      const codes = ['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017'];
      
      codes.forEach(code => {
        const error = { code, message: 'Test' };
        expect(isPrismaConnectionError(error)).toBe(true);
      });
    });
  });
});
