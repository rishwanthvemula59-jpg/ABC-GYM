import Joi from 'joi';

export const checkinSchema = Joi.object({
  phone: Joi.string().pattern(/^\d{10}$/).required(),
  gymId: Joi.string().uuid().required()
});

export const markPresentSchema = Joi.object({
  memberId: Joi.string().uuid().required()
});

export const getHistoryQuerySchema = Joi.object({
  limit: Joi.number().default(30),
  offset: Joi.number().default(0)
});