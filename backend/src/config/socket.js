import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js';
import logger from '../utils/logger.js';
import { verifyToken } from '../utils/cryptoUtils.js';
import dotenv from 'dotenv';

dotenv.config();

let io;

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  if (redis) {
    const pubClient = redis;
    const subClient = redis.duplicate();

    (async () => {
      try {
        await subClient.connect();
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.io initialized with Redis adapter');
      } catch (err) {
        logger.error('❌ Socket.io Redis adapter init failed, falling back to memory adapter:', err);
      }
    })();
  } else {
    logger.info('✅ Socket.io initialized with standard in-memory adapter');
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.gymId = decoded.gymId;
      next();
    } catch (err) {
      next(new Error('Auth error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`✅ User ${socket.userId} connected`);
    socket.join(`gym_${socket.gymId}`);
    socket.join(`user_${socket.userId}`);

    socket.on('disconnect', () => {
      logger.info(`✅ User disconnected`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}