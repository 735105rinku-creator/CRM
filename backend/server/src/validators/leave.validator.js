import Joi from "joi";

import { LEAVE_CATEGORY } from "../models/LeaveType.js";
import { ACCRUAL_FREQUENCY } from "../models/LeavePolicy.js";
import {
  LEAVE_REQUEST_STATUS,
  LEAVE_DAY_TYPE,
} from "../models/LeaveRequest.js";

const code = Joi.string().trim().uppercase().min(1).max(50);
const optionalCode = code.allow("", null);

/* ================= ALIASES ================= */

const withLeaveAliases = (schema) => {
  return schema
    .rename("employeecode", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employee_code", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leavetypecode", "leaveTypeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leave_type_code", "leaveTypeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leavecode", "leaveCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leave_code", "leaveCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leavepolicycode", "leavePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leave_policy_code", "leavePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("policycode", "policyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("policy_code", "policyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("approveremployeecode", "approverEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("approver_employee_code", "approverEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    });
};

/* ================= LEAVE TYPE ================= */

const leaveTypeBaseSchema = Joi.object({
  leaveName: Joi.string().trim().max(100).required(),

  leaveCode: code.max(30).required(),

  category: Joi.string()
    .valid(...Object.values(LEAVE_CATEGORY))
    .required(),

  description: Joi.string().trim().allow("", null),

  paid: Joi.boolean().default(true),

  allowHalfDay: Joi.boolean().default(true),

  requireDocument: Joi.boolean().default(false),

  requireApproval: Joi.boolean().default(true),

  colorCode: Joi.string().trim().allow("", null),

  isActive: Joi.boolean().default(true),
});

export const createLeaveTypeSchema = leaveTypeBaseSchema;

export const updateLeaveTypeSchema = leaveTypeBaseSchema.fork(
  ["leaveName", "leaveCode", "category"],
  (schema) => schema.optional()
);

/* ================= LEAVE POLICY ================= */

const leavePolicyRuleBaseSchema = Joi.object({
  leaveTypeCode: optionalCode,
  leaveCode: optionalCode,

  yearlyQuota: Joi.number().min(0).default(0),

  monthlyAccrual: Joi.number().min(0).default(0),

  accrualFrequency: Joi.string()
    .valid(...Object.values(ACCRUAL_FREQUENCY))
    .default(ACCRUAL_FREQUENCY.NONE),

  carryForwardAllowed: Joi.boolean().default(false),

  maxCarryForward: Joi.number().min(0).default(0),

  encashmentAllowed: Joi.boolean().default(false),

  maxConsecutiveDays: Joi.number().integer().min(0).default(0),

  minNoticeDays: Joi.number().integer().min(0).default(0),
}).or("leaveTypeCode", "leaveCode");

const leavePolicyRuleSchema = withLeaveAliases(leavePolicyRuleBaseSchema);

const approvalLevelBaseSchema = Joi.object({
  level: Joi.number().integer().min(1).required(),

  approverType: Joi.string()
    .valid("reporting_manager", "hr", "company_admin", "specific_employee")
    .default("reporting_manager"),

  approverEmployeeCode: optionalCode,

  required: Joi.boolean().default(true),
});

const approvalLevelSchema = withLeaveAliases(approvalLevelBaseSchema);

const leavePolicyBaseSchema = Joi.object({
  policyName: Joi.string().trim().max(120).required(),

  policyCode: code.max(30).required(),

  description: Joi.string().trim().allow("", null),

  effectiveFrom: Joi.date().allow(null),

  effectiveTo: Joi.date().allow(null),

  rules: Joi.array().items(leavePolicyRuleSchema).default([]),

  approvalLevels: Joi.array().items(approvalLevelSchema).default([]),

  allowNegativeBalance: Joi.boolean().default(false),

  allowBackdatedLeave: Joi.boolean().default(false),

  backdatedLimitDays: Joi.number().integer().min(0).default(0),

  isDefault: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
});

export const createLeavePolicySchema = withLeaveAliases(leavePolicyBaseSchema);

export const updateLeavePolicySchema = withLeaveAliases(
  leavePolicyBaseSchema.fork(["policyName", "policyCode"], (schema) =>
    schema.optional()
  )
);

/* ================= LEAVE BALANCE ================= */

const createLeaveBalanceBaseSchema = Joi.object({
  employeeCode: code.required(),

  leaveTypeCode: optionalCode,
  leaveCode: optionalCode,

  leavePolicyCode: optionalCode,
  policyCode: optionalCode,

  year: Joi.number().integer().required(),

  openingBalance: Joi.number().min(0).default(0),

  credited: Joi.number().min(0).default(0),

  availed: Joi.number().min(0).default(0),

  pending: Joi.number().min(0).default(0),

  carryForward: Joi.number().min(0).default(0),

  availableBalance: Joi.number().min(0).default(0),

  remarks: Joi.string().trim().allow("", null),
}).or("leaveTypeCode", "leaveCode");

const updateLeaveBalanceBaseSchema = Joi.object({
  employeeCode: optionalCode,

  leaveTypeCode: optionalCode,
  leaveCode: optionalCode,

  leavePolicyCode: optionalCode,
  policyCode: optionalCode,

  year: Joi.number().integer(),

  openingBalance: Joi.number().min(0),

  credited: Joi.number().min(0),

  availed: Joi.number().min(0),

  pending: Joi.number().min(0),

  carryForward: Joi.number().min(0),

  availableBalance: Joi.number().min(0),

  remarks: Joi.string().trim().allow("", null),
});

export const createLeaveBalanceSchema = withLeaveAliases(
  createLeaveBalanceBaseSchema
);

export const updateLeaveBalanceSchema = withLeaveAliases(
  updateLeaveBalanceBaseSchema
);

/* ================= LEAVE REQUEST ================= */

const applyLeaveBaseSchema = Joi.object({
  employeeCode: optionalCode,

  leaveTypeCode: optionalCode,
  leaveCode: optionalCode,

  leavePolicyCode: optionalCode,
  policyCode: optionalCode,

  fromDate: Joi.date().required(),

  toDate: Joi.date().required(),

  dayType: Joi.string()
    .valid(...Object.values(LEAVE_DAY_TYPE))
    .default(LEAVE_DAY_TYPE.FULL_DAY),

  reason: Joi.string().trim().min(2).max(1000).required(),

  attachment: Joi.string().trim().allow("", null),
}).or("leaveTypeCode", "leaveCode");

export const applyLeaveSchema = withLeaveAliases(applyLeaveBaseSchema);

export const updateLeaveRequestStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      LEAVE_REQUEST_STATUS.APPROVED,
      LEAVE_REQUEST_STATUS.REJECTED,
      LEAVE_REQUEST_STATUS.CANCELLED
    )
    .required(),

  approverRemarks: Joi.string().trim().allow("", null),

  cancellationReason: Joi.string().trim().allow("", null),
});
