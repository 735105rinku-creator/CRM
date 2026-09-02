import Joi from "joi";
import { ROLES, USER_STATUS } from "../constants/roles.js";
import { PERMISSIONS } from "../constants/permissions.js";

const password = Joi.string().min(8).max(32).required();

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),

  email: Joi.string().email().lowercase().trim().required(),

  mobile: Joi.string().trim().allow("", null),

  password,

  role: Joi.string()
    .valid(ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.SUPPORT, ROLES.EMPLOYEE)
    .required(),

    companyId: Joi.string().hex().length(24).allow("", null),

    companyCode: Joi.string().trim().uppercase().allow("", null),

  employeeCode: Joi.string().trim().uppercase().allow("", null),

  department: Joi.string().trim().allow("", null),

  designation: Joi.string().trim().allow("", null),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),

  mobile: Joi.string().trim().allow("", null),

  department: Joi.string().trim().allow("", null),

  designation: Joi.string().trim().allow("", null),

  status: Joi.string().valid(
    USER_STATUS.ACTIVE,
    USER_STATUS.INACTIVE,
    USER_STATUS.BLOCKED
  ),
});

export const changeRoleSchema = Joi.object({
  role: Joi.string()
    .valid(ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.SUPPORT, ROLES.EMPLOYEE)
    .required(),
});

export const resetPasswordSchema = Joi.object({
  password,
  sendEmail: Joi.boolean().default(true),
});

export const assignPermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(Joi.string().valid(...Object.values(PERMISSIONS)))
    .min(1)
    .required()
    .messages({
      "array.base": "Permissions must be an array.",
      "array.min": "At least one permission is required.",
      "any.only": "One or more permissions are invalid.",
    }),
});