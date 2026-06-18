import express from 'express';
import * as attendanceController from '../controllers/attendanceController.js';
import { validate, validateQuery } from '../middleware/validation.js';
import * as attendanceValidator from '../validators/attendanceValidator.js';
import { authMiddleware, requireGym } from '../middleware/auth.js';

const router = express.Router();

router.post('/checkin', validate(attendanceValidator.checkinSchema), attendanceController.qrCheckin);
router.post('/:gymId/mark-present', authMiddleware, requireGym, validate(attendanceValidator.markPresentSchema), attendanceController.markPresent);
const isDev = process.env.NODE_ENV === 'development';
const allowDevPublic = process.env.ALLOW_DEV_PUBLIC_ATTENDANCE === 'true';
// Only bypass auth/gym checks when explicitly allowed via ALLOW_DEV_PUBLIC_ATTENDANCE in development.
const todayMiddlewares = (isDev && allowDevPublic) ? [] : [authMiddleware, requireGym];

router.get('/:gymId/today', ...todayMiddlewares, attendanceController.getTodayAttendance);

export default router;