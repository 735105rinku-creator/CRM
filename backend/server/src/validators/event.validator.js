import Joi from "joi";

import {
  EVENT_TYPE,
  EVENT_STATUS,
} from "../models/HREvent.js";

const code = Joi.string().trim().uppercase().min(1).max(50);

const withEventAliases = (schema) => {
  return schema
    .rename("eventcode", "eventCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("event_code", "eventCode", {
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

const participantBaseSchema = Joi.object({
  employeeCode: code.required(),

  status: Joi.string()
    .valid("invited", "accepted", "declined", "attended")
    .default("invited"),
});

const participantSchema = withEventAliases(participantBaseSchema);

const eventBaseSchema = Joi.object({
  eventTitle: Joi.string().trim().max(200).required(),

  eventCode: Joi.string().trim().uppercase().max(30).required(),

  eventType: Joi.string()
    .valid(...Object.values(EVENT_TYPE))
    .default(EVENT_TYPE.COMPANY_EVENT),

  description: Joi.string().trim().allow("", null),

  venue: Joi.string().trim().allow("", null),

  meetingLink: Joi.string().trim().allow("", null),

  bannerImage: Joi.string().trim().allow("", null),

  startDateTime: Joi.date().required(),

  endDateTime: Joi.date().required(),

  allDay: Joi.boolean().default(false),

  participants: Joi.array().items(participantSchema).default([]),

  notifyEmployees: Joi.boolean().default(true),

  status: Joi.string()
    .valid(...Object.values(EVENT_STATUS))
    .default(EVENT_STATUS.DRAFT),
});

export const createEventSchema = withEventAliases(eventBaseSchema);

export const updateEventSchema = withEventAliases(
  eventBaseSchema.fork(
    ["eventTitle", "eventCode", "startDateTime", "endDateTime"],
    (schema) => schema.optional()
  )
);

export const updateEventStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(EVENT_STATUS))
    .required(),
});