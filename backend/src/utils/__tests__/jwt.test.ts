import { generateTokens, generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../jwt';

describe('JWT Utils', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'STUDENT' as const,
  };

  beforeEach(() => {
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = generateTokens(mockUser);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should generate different tokens for different users', () => {
      const user1 = { ...mockUser, id: 'user1' };
      const user2 = { ...mockUser, id: 'user2' };
      
      const tokens1 = generateTokens(user1);
      const tokens2 = generateTokens(user2);
      
      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const tokens = generateTokens(mockUser);
      const decoded = verifyAccessToken(tokens.accessToken);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyAccessToken(invalidToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokens = generateTokens(mockUser);
      const decoded = verifyRefreshToken(tokens.refreshToken);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    it('should throw error for invalid refresh token', () => {
      const invalidToken = 'invalid.refresh.token';
      
      expect(() => verifyRefreshToken(invalidToken)).toThrow();
    });
  });
});
