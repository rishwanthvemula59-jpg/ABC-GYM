import Joi from 'joi';

export const sendReminderSchema = Joi.object({
  memberId: Joi.string().uuid().required()
});

export const sendAlertSchema = Joi.object({
  memberId: Joi.string().uuid().required()
});

export const sendBulkSchema = Joi.object({
  memberIds: Joi.array().items(Joi.string().uuid()).required(),
  messageType: Joi.string().valid('renewal_reminder', 'expired_alert').required()
});