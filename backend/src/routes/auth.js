import express from 'express';
import * as authController from '../controllers/authController.js';
import { validate } from '../middleware/validation.js';
import * as authValidator from '../validators/authValidator.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', validate(authValidator.registerSchema), authController.register);
router.post('/login', validate(authValidator.loginSchema), authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/refresh-token', validate(authValidator.refreshTokenSchema), authController.refreshToken);
router.post('/forgot-password', validate(authValidator.forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(authValidator.resetPasswordSchema), authController.resetPassword);

export default router;