import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import prisma from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin
        if (!origin) return callback(null, true);
        
        // Allow ONLY localhost and 127.0.0.1 (strict local mode)
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
        
        // Allow configured origin if it's localhost
        const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;
        if (corsOrigin && (corsOrigin.includes('localhost') || corsOrigin.includes('127.0.0.1'))) {
          if (origin === corsOrigin) {
            return callback(null, true);
          }
        }
        
        // Reject all other origins (local network and public IPs)
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = verifyAccessToken(token);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join course rooms
    socket.on('join:course', (courseId: string) => {
      socket.join(`course:${courseId}`);
      logger.info(`User ${socket.userId} joined course ${courseId}`);
    });

    // Leave course room
    socket.on('leave:course', (courseId: string) => {
      socket.leave(`course:${courseId}`);
      logger.info(`User ${socket.userId} left course ${courseId}`);
    });

    // Send course chat message
    socket.on('course:message:send', async (data: {
      courseId: string;
      content: string;
    }) => {
      try {
        // Verify user has access to this course
        let course;
        try {
          course = await prisma.course.findUnique({
            where: { id: data.courseId },
            select: { teacherId: true },
          });
        } catch (dbError: any) {
          // Handle database connection errors
          if (dbError.code === 'P1001' || dbError.code === 'P1002' || dbError.code === 'P1003') {
            logger.error('Database connection error in socket handler:', dbError);
            socket.emit('error', { message: 'Database connection lost. Please try again.' });
            return;
          }
          throw dbError;
        }

        if (!course) {
          socket.emit('error', { message: 'Course not found' });
          return;
        }

        const isTeacher = course.teacherId === socket.userId;
        let isEnrolled;
        try {
          isEnrolled = await prisma.enrollment.findUnique({
            where: {
              userId_courseId: {
                userId: socket.userId!,
                courseId: data.courseId,
              },
            },
          });
        } catch (dbError: any) {
          if (dbError.code === 'P1001' || dbError.code === 'P1002' || dbError.code === 'P1003') {
            logger.error('Database connection error in socket handler:', dbError);
            socket.emit('error', { message: 'Database connection lost. Please try again.' });
            return;
          }
          throw dbError;
        }

        if (!isTeacher && !isEnrolled) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Get sender info
        let sender;
        try {
          sender = await prisma.user.findUnique({
            where: { id: socket.userId! },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
            },
          });
        } catch (dbError: any) {
          if (dbError.code === 'P1001' || dbError.code === 'P1002' || dbError.code === 'P1003') {
            logger.error('Database connection error in socket handler:', dbError);
            socket.emit('error', { message: 'Database connection lost. Please try again.' });
            return;
          }
          throw dbError;
        }

        if (!sender) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Save message to database
        let message;
        try {
          message = await prisma.message.create({
            data: {
              content: data.content.trim(),
              senderId: socket.userId!,
              courseId: data.courseId,
              isRead: false,
            },
          });
        } catch (dbError: any) {
          if (dbError.code === 'P1001' || dbError.code === 'P1002' || dbError.code === 'P1003') {
            logger.error('Database connection error in socket handler:', dbError);
            socket.emit('error', { message: 'Database connection lost. Please try again.' });
            return;
          }
          throw dbError;
        }

        // Emit to all users in course room
        const messageData = {
          ...message,
          sender,
        };

        io.to(`course:${data.courseId}`).emit('course:message:received', messageData);

        // Confirm to sender
        socket.emit('course:message:sent', messageData);
      } catch (error) {
        logger.error('Error sending course message:', error);
        socket.emit('error', { 
          message: error instanceof Error && error.message.includes('P1001') 
            ? 'Database connection lost. Please try again.' 
            : 'Failed to send message' 
        });
      }
    });

    // Send private message (legacy, for backward compatibility)
    socket.on('message:send', async (data: {
      receiverId: string;
      content: string;
    }) => {
      try {
        // Here you would save the message to database
        // For now, just emit to receiver
        io.to(`user:${data.receiverId}`).emit('message:received', {
          senderId: socket.userId,
          content: data.content,
          timestamp: new Date(),
        });

        // Confirm to sender
        socket.emit('message:sent', {
          receiverId: data.receiverId,
          content: data.content,
          timestamp: new Date(),
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', (receiverId: string) => {
      io.to(`user:${receiverId}`).emit('typing:user', {
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (receiverId: string) => {
      io.to(`user:${receiverId}`).emit('typing:user', {
        userId: socket.userId,
        isTyping: false,
      });
    });

    // Course announcements (teacher only)
    socket.on('announcement:send', (data: {
      courseId: string;
      title: string;
      content: string;
    }) => {
      if (socket.userRole === 'TEACHER' || socket.userRole === 'ADMIN') {
        io.to(`course:${data.courseId}`).emit('announcement:received', {
          title: data.title,
          content: data.content,
          timestamp: new Date(),
        });
      }
    });

    // Notifications
    socket.on('notification:send', (data: {
      userId: string;
      title: string;
      message: string;
    }) => {
      io.to(`user:${data.userId}`).emit('notification:received', {
        title: data.title,
        message: data.message,
        timestamp: new Date(),
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

export default initializeSocket;








