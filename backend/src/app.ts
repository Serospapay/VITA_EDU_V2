import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import path from 'path';

import { stream } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { rateLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './middleware/sanitize';
import prisma from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import courseRoutes from './routes/course.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import lessonRoutes from './routes/lesson.routes';
import assignmentRoutes from './routes/assignment.routes';
import submissionRoutes from './routes/submission.routes';
import quizRoutes from './routes/quiz.routes';
import categoryRoutes from './routes/category.routes';
import notificationRoutes from './routes/notification.routes';
import messageRoutes from './routes/message.routes';
import fileRoutes from './routes/file.routes';

const app: Application = express();

// ===== Swagger Configuration =====
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LMS API Documentation',
      version: '1.0.0',
      description: 'Learning Management System API',
      contact: {
        name: 'LMS Support',
        email: 'support@lms.local',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// ===== Middleware =====

// Security
app.use(helmet());

// CORS - Allow requests ONLY from localhost (strict local mode)
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Allow ONLY localhost and 127.0.0.1
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      
      // Allow configured CORS origin if it's localhost
      const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;
      if (corsOrigin && (corsOrigin.includes('localhost') || corsOrigin.includes('127.0.0.1'))) {
        if (origin === corsOrigin) {
          return callback(null, true);
        }
      }
      
      // Reject all other origins (local network and public IPs)
      callback(null, false);
    },
    credentials: true,
  })
);

// Compression
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Sanitization - очищення вхідних даних від потенційно небезпечного контенту
app.use(sanitizeInput);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', { stream }));
} else {
  app.use(morgan('combined', { stream }));
}

// Rate limiting
app.use('/api', rateLimiter);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== Routes =====

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check with database connectivity
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      },
    });
  } catch (error) {
    // Try to reconnect
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'reconnected',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        },
      });
    } catch (reconnectError) {
      res.status(503).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        error: reconnectError instanceof Error ? reconnectError.message : 'Unknown error',
      });
    }
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);

// 404 Handler
app.use(notFound);

// Error Handler (must be last)
app.use(errorHandler);

export default app;







