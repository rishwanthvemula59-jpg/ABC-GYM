import express from 'express';
import * as memberController from '../controllers/memberController.js';
import { validate, validateQuery } from '../middleware/validation.js';
import * as memberValidator from '../validators/memberValidator.js';
import { authMiddleware, requireGym } from '../middleware/auth.js';

const router = express.Router();

const isDev = process.env.NODE_ENV === 'development';
const allowDevPublic = process.env.ALLOW_DEV_PUBLIC_ATTENDANCE === 'true';

router.post('/:gymId', authMiddleware, requireGym, validate(memberValidator.createMemberSchema), memberController.createMember);
// Allow public listing in development when explicitly enabled.
const membersListMiddlewares = (isDev && allowDevPublic) ? [] : [authMiddleware, requireGym];
router.get('/:gymId', ...membersListMiddlewares, validateQuery(memberValidator.listMembersQuerySchema), memberController.listMembers);
router.get('/:gymId/:memberId', authMiddleware, requireGym, memberController.getMember);
router.post('/:gymId/:memberId/renew', authMiddleware, requireGym, validate(memberValidator.renewMembershipSchema), memberController.renewMembership);
router.patch('/:gymId/:memberId/status', authMiddleware, requireGym, memberController.toggleMemberStatus);
router.delete('/:gymId/:memberId', authMiddleware, requireGym, memberController.deleteMember);

export default router;