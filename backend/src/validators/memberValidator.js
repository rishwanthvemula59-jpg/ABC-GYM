import Joi from 'joi';

export const createMemberSchema = Joi.object({
  fullName: Joi.string().required(),
  phone: Joi.string().pattern(/^\d{10}$/).required(),
  email: Joi.string().email().allow('').optional(),
  plan: Joi.string().valid('1_month', '3_month').required(),
  paymentStatus: Joi.string().valid('paid', 'pending').default('paid'),
  notes: Joi.string().allow('').optional(),
  customDays: Joi.number().min(0).optional()
});

export const updateMemberSchema = Joi.object({
  fullName: Joi.string(),
  email: Joi.string().email().allow(''),
  notes: Joi.string().allow('')
}).min(1);

export const renewMembershipSchema = Joi.object({
  plan: Joi.string().valid('1_month', '3_month').required(),
  paymentStatus: Joi.string().valid('paid', 'pending').default('paid'),
  customDays: Joi.number().min(0).optional()
});

export const listMembersQuerySchema = Joi.object({
  status: Joi.string().valid('all', 'active', 'expiring', 'expired', 'deactivated'),
  search: Joi.string(),
  limit: Joi.number().max(100).default(20),
  offset: Joi.number().default(0)
});