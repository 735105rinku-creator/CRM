import Joi from "joi";

import {
  MEETING_MODE,
  MEETING_STATUS,
} from "../models/HRMeeting.js";

const code = Joi.string().trim().uppercase().min(1).max(50);
const optionalCode = code.allow("", null);
const objectId = Joi.string().trim().hex().length(24);

const withMeetingAliases = (schema) => {
  return schema
    .rename("meetingcode", "meetingCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("meeting_code", "meetingCode", {
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
    })
    .rename("organizercode", "organizerCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("organizer_code", "organizerCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("organizeremployeecode", "organizerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("organizer_employee_code", "organizerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("assignedtoemployeecode", "assignedToEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("assigned_to_employee_code", "assignedToEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    });
};

const attendeeBaseSchema = Joi.object({
  employeeCode: optionalCode,
  employeeId: objectId.allow("", null),
  userId: objectId.allow("", null),
  attendeeUserId: objectId.allow("", null),

  status: Joi.string()
    .valid("invited", "requested", "accepted", "declined", "attended", "absent")
    .default("invited"),
}).or("employeeCode", "employeeId", "userId", "attendeeUserId");

const attendeeSchema = withMeetingAliases(attendeeBaseSchema);

const agendaItemSchema = Joi.object({
  title: Joi.string().trim().allow("", null),

  description: Joi.string().trim().allow("", null),
});

const actionItemBaseSchema = Joi.object({
  title: Joi.string().trim().required(),

  assignedToEmployeeCode: optionalCode,
  employeeCode: optionalCode,

  dueDate: Joi.date().allow(null),

  status: Joi.string()
    .valid("pending", "in_progress", "completed")
    .default("pending"),
});

const actionItemSchema = withMeetingAliases(actionItemBaseSchema);

const meetingBaseSchema = Joi.object({
  meetingTitle: Joi.string().trim().max(200).required(),

  meetingCode: Joi.string().trim().uppercase().max(30).required(),

  meetingMode: Joi.string()
    .valid(...Object.values(MEETING_MODE))
    .default(MEETING_MODE.ONLINE),

  meetingLink: Joi.string().trim().allow("", null),

  venue: Joi.string().trim().allow("", null),

  startDateTime: Joi.date().required(),

  endDateTime: Joi.date().required(),

  organizerCode: optionalCode,
  organizerEmployeeCode: optionalCode,

  attendees: Joi.array().items(attendeeSchema).default([]),

  agenda: Joi.array().items(agendaItemSchema).default([]),

  minutesOfMeeting: Joi.string().trim().allow("", null),

  actionItems: Joi.array().items(actionItemSchema).default([]),

  status: Joi.string()
    .valid(...Object.values(MEETING_STATUS))
    .default(MEETING_STATUS.SCHEDULED),

  notifyAttendees: Joi.boolean().default(true),

  inviteCompanyAdmins: Joi.boolean().default(false),

  remarks: Joi.string().trim().allow("", null),
});

export const createMeetingSchema = withMeetingAliases(meetingBaseSchema);

export const updateMeetingSchema = withMeetingAliases(
  meetingBaseSchema.fork(
    ["meetingTitle", "meetingCode", "startDateTime", "endDateTime"],
    (schema) => schema.optional()
  )
);

export const updateMeetingStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(MEETING_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});



