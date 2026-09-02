import Joi from "joi";

import {
  NOTIFICATION_TYPE,
  NOTIFICATION_PRIORITY,
} from "../models/Notification.js";

const code = Joi.string().trim().uppercase().min(1).max(50);
const optionalCode = code.allow("", null);

const withCommunicationAliases = (schema) => {
  return schema
    .rename("recipientemail", "recipientEmail", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("recipient_email", "recipientEmail", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("recipientemployeecode", "recipientEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("recipient_employee_code", "recipientEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employeecode", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employee_code", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    });
};

const messageBaseSchema = Joi.object({
  recipientEmail: Joi.string().email().lowercase().trim().allow("", null),

  recipientEmployeeCode: optionalCode,
  employeeCode: optionalCode,

  parentMessageId: Joi.string().trim().allow("", null),

  subject: Joi.string().trim().max(200).allow("", null),

  body: Joi.string().trim().max(5000).required(),

  attachmentUrl: Joi.string().trim().allow("", null),
});

export const sendMessageSchema = withCommunicationAliases(messageBaseSchema);

const notificationBaseSchema = Joi.object({
  recipientEmail: Joi.string().email().lowercase().trim().allow("", null),

  recipientEmployeeCode: optionalCode,
  employeeCode: optionalCode,

  type: Joi.string()
    .valid(...Object.values(NOTIFICATION_TYPE))
    .default(NOTIFICATION_TYPE.SYSTEM),

  title: Joi.string().trim().max(200).required(),

  message: Joi.string().trim().max(2000).required(),

  priority: Joi.string()
    .valid(...Object.values(NOTIFICATION_PRIORITY))
    .default(NOTIFICATION_PRIORITY.NORMAL),

  entityType: Joi.string().trim().allow("", null),

  actionUrl: Joi.string().trim().allow("", null),
}).or("recipientEmail", "recipientEmployeeCode", "employeeCode");

export const sendNotificationSchema =
  withCommunicationAliases(notificationBaseSchema);

export const markNotificationReadSchema = Joi.object({
  isRead: Joi.boolean().default(true),
});
