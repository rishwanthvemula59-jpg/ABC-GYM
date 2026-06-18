import app from './src/app.js';
import http from 'http';
import logger from './src/utils/logger.js';
import { initializeSocket } from './src/config/socket.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

initializeSocket(server);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});