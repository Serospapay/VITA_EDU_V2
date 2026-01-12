// Test setup file
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables (fallback to .env if .env.test doesn't exist)
const testEnvPath = path.resolve(__dirname, '../../.env.test');
const envPath = path.resolve(__dirname, '../../.env');

try {
  dotenv.config({ path: testEnvPath });
} catch {
  dotenv.config({ path: envPath });
}

// Set default test environment variables if not set
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-testing-only';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
