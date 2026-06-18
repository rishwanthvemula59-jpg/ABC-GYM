import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './middleware/logging.js';
import { authMiddleware } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import attendanceRoutes from './routes/attendance.js';
import messageRoutes from './routes/messages.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();

app.use(helmet());
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()) || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];
// When CORS_ORIGINS contains '*', reflect any requesting origin (needed because credentials:true rejects literal '*')
const corsOriginSetting = corsOrigins.includes('*')
  ? (origin, callback) => callback(null, true)
  : corsOrigins;

app.use(cors({
  origin: corsOriginSetting,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000, // Increased for local testing/kiosks
  message: 'Too many requests'
});

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
// Route-level auth is handled inside route files to allow opt-in dev bypasses
app.use('/api/members', memberRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

export default app;