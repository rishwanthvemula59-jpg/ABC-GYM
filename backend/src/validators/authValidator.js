import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phone: Joi.string().pattern(/^\d{10}$/).required()
});

export const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required()
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

export const forgotPasswordSchema = Joi.object({
  identifier: Joi.string().required()
});

export const resetPasswordSchema = Joi.object({
  identifier: Joi.string().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).required()
});