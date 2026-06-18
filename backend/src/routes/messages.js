import express from 'express';
import * as messageController from '../controllers/messageController.js';
import { validate } from '../middleware/validation.js';
import * as messageValidator from '../validators/messageValidator.js';
import { authMiddleware, requireGym } from '../middleware/auth.js';

const router = express.Router();

router.post('/:gymId/renewal-reminder', authMiddleware, requireGym, validate(messageValidator.sendReminderSchema), messageController.sendRenewalReminder);
router.post('/:gymId/expired-alert', authMiddleware, requireGym, validate(messageValidator.sendAlertSchema), messageController.sendExpiredAlert);

export default router;