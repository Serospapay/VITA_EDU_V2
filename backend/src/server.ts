import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (backend/.env) or parent root (.env)
const envPath = path.join(__dirname, '../.env');
const rootEnvPath = path.join(__dirname, '../../.env');

// Try to load from backend/.env first, then from root/.env
dotenv.config({ path: envPath });
dotenv.config({ path: rootEnvPath, override: false }); // Don't override if already loaded

import { createServer } from 'http';
import app from './app';
import { logger } from './utils/logger';
import { connectRedis } from './config/redis';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './config/database';
import { initializeSocket } from './socket';

const PORT = Number(process.env.PORT) || 5000;
const MAX_RESTART_ATTEMPTS = 5;
let restartAttempts = 0;
let httpServer: any = null;
let isShuttingDown = false;

// Database health check interval
const DB_HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
let dbHealthCheckInterval: NodeJS.Timeout | null = null;

// Global error handlers - MUST be set before anything else
process.on('uncaughtException', (error: Error) => {
  logger.error('💥 UNCAUGHT EXCEPTION!', {
    error: error.message,
    stack: error.stack,
    name: error.name,
  });
  
  // Don't restart for operational errors
  if (error.name === 'AppError' || error.message.includes('CORS')) {
    logger.warn('Operational error, not restarting server');
    return;
  }
  
  // Give time for logger to write
  setTimeout(() => {
    if (!isShuttingDown) {
      restartServer('uncaughtException');
    } else {
      process.exit(1);
    }
  }, 2000);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('💥 UNHANDLED REJECTION!', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  
  // Don't restart for database connection errors (handled separately)
  if (reason instanceof Error && (
    reason.message.includes('P1001') ||
    reason.message.includes('P1002') ||
    reason.message.includes('P1003') ||
    reason.message.includes('P1000')
  )) {
    logger.warn('Database connection error, will attempt reconnection');
    return;
  }
  
  // Give time for logger to write
  setTimeout(() => {
    if (!isShuttingDown) {
      restartServer('unhandledRejection');
    } else {
      process.exit(1);
    }
  }, 2000);
});

// Handle process warnings
process.on('warning', (warning) => {
  logger.warn('⚠️ Process Warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
});

// Restart server function
async function restartServer(reason: string) {
  if (isShuttingDown) return;
  
  restartAttempts++;
  if (restartAttempts > MAX_RESTART_ATTEMPTS) {
    logger.error(`❌ Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Exiting.`);
    process.exit(1);
  }
  
  logger.warn(`🔄 Restarting server (attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS}) due to: ${reason}`);
  
  try {
    // Cleanup
    if (httpServer) {
      httpServer.close();
    }
    if (dbHealthCheckInterval) {
      clearInterval(dbHealthCheckInterval);
    }
    
    // Wait before restart
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Restart
    await startServer();
    restartAttempts = 0; // Reset on successful restart
  } catch (error) {
    logger.error('Failed to restart server:', error);
    setTimeout(() => restartServer(reason), 5000);
  }
}

// Start database health monitoring
function startDatabaseHealthCheck() {
  if (dbHealthCheckInterval) {
    clearInterval(dbHealthCheckInterval);
  }
  
  dbHealthCheckInterval = setInterval(async () => {
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      logger.warn('⚠️ Database health check failed, attempting reconnection...');
      try {
        await connectDatabase(3, 2000);
        logger.info('✅ Database reconnected via health check');
      } catch (error) {
        logger.error('❌ Failed to reconnect database during health check:', error);
      }
    }
  }, DB_HEALTH_CHECK_INTERVAL);
}

async function startServer() {
  try {
    // Connect to database (required)
    logger.info('🔌 Connecting to database...');
    await connectDatabase();
    
    // Try to connect to Redis (optional)
    await connectRedis();

    // Create HTTP server
    httpServer = createServer(app);

    // Initialize Socket.io
    initializeSocket(httpServer);
    logger.info('✅ WebSocket server initialized');

    // Start server - listen ONLY on localhost (strict local mode)
    const HOST = process.env.HOST || 'localhost';
    const server = httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📖 API Docs: http://${HOST}:${PORT}/api-docs`);
      logger.info(`🔒 Local mode: Only accessible from this computer`);
      
      // Start database health monitoring
      startDatabaseHealthCheck();
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      isShuttingDown = true;
      logger.info(`${signal} received, shutting down gracefully`);
      
      if (dbHealthCheckInterval) {
        clearInterval(dbHealthCheckInterval);
      }
      
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await disconnectDatabase();
          logger.info('Database disconnected');
        } catch (error) {
          logger.error('Error during database disconnection:', error);
        }
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`❌ Port ${PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`❌ Port ${PORT} is already in use`);
          process.exit(1);
          break;
        default:
          logger.error('Server error:', error);
          if (!isShuttingDown) {
            restartServer('server error');
          }
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    
    // If database connection failed, try to restart
    if (error instanceof Error && (
      error.message.includes('DATABASE_URL') ||
      error.message.includes('P1001') ||
      error.message.includes('P1002') ||
      error.message.includes('P1003') ||
      error.message.includes('P1000')
    )) {
      logger.warn('Database connection failed, will retry...');
      setTimeout(() => restartServer('database connection failed'), 5000);
    } else {
      // For other errors, exit or restart based on attempts
      if (restartAttempts < MAX_RESTART_ATTEMPTS) {
        setTimeout(() => restartServer('startup error'), 5000);
      } else {
        process.exit(1);
      }
    }
  }
}

startServer();







