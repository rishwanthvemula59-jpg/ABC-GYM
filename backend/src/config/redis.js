import redis from 'redis';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const enabled = process.env.REDIS_ENABLED !== 'false';
let client = null;

if (enabled) {
  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('❌ Redis connection failed');
          return new Error('Redis max retries');
        }
        return Math.min(retries * 50, 500);
      }
    }
  });

  client.on('error', (err) => logger.error('❌ Redis error:', err));
  client.on('connect', () => logger.info('✅ Redis connected'));

  (async () => {
    try {
      await client.connect();
    } catch (err) {
      logger.error('❌ Redis connection failed:', err);
    }
  })();
} else {
  logger.info('ℹ️ Redis is disabled (using in-memory socket adapter)');
}

export default client;