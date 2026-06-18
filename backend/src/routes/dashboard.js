import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authMiddleware, requireGym } from '../middleware/auth.js';


const router = express.Router();
const isDev = process.env.NODE_ENV === 'development';
const allowDevPublic = process.env.ALLOW_DEV_PUBLIC_ATTENDANCE === 'true';
const dashboardMiddlewares = (isDev && allowDevPublic) ? [] : [authMiddleware, requireGym];

router.get('/:gymId', ...dashboardMiddlewares, dashboardController.getDashboardData);

export default router;
