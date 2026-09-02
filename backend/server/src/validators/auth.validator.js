import Joi from "joi";
import { ROLES } from "../constants/roles.js";

/**
 * Password Policy
 * - Minimum 8 characters
 * - Maximum 32 characters
 * - At least one uppercase
 * - At least one lowercase
 * - At least one number
 * - At least one special character
 */

const password = Joi.string()
  .min(8)
  .max(32)
  .pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=])[A-Za-z\d@$!%*?&^#()_\-+=]{8,32}$/
  )
  .messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password cannot exceed 32 characters",
    "string.pattern.base":
      "Password must contain uppercase, lowercase, number and special character",
  });

export const loginSchema = Joi.object({
  email: Joi.string().trim().required().messages({
    "string.empty": "Email or user id is required",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),

  role: Joi.string()
    .valid(
      ROLES.SUPER_ADMIN,
      ROLES.COMPANY_ADMIN,
      ROLES.HR,
      ROLES.SUPPORT,
      ROLES.EMPLOYEE,
      "accounts"
    )
    .allow("", null),
});

export const createUserSchema = Joi.object({
  companyId: Joi.string().trim().allow("", null),

  name: Joi.string().min(2).max(120).trim().required(),

  email: Joi.string().email().lowercase().trim().required(),

  mobile: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .allow("", null),

  profileImage: Joi.string().allow("", null),

  password,

  role: Joi.string()
  .valid(
    ROLES.SUPER_ADMIN,
    ROLES.COMPANY_ADMIN,
    ROLES.HR,
    ROLES.SUPPORT,
    ROLES.EMPLOYEE
  )
  .required(),
  department: Joi.string().allow("", null),

  designation: Joi.string().allow("", null),

  employeeCode: Joi.string().uppercase().allow("", null),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(120),

  mobile: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .allow("", null),

  profileImage: Joi.string().allow("", null),

  department: Joi.string().allow("", null),

  designation: Joi.string().allow("", null),

  companyName: Joi.string().trim().min(2).max(150).allow("", null),

  companyEmail: Joi.string().email().lowercase().trim().allow("", null),

  companyPhone: Joi.string().trim().allow("", null),

  industry: Joi.string().trim().allow("", null),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),

  newPassword: password,

  confirmPassword: Joi.any()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),

  password,

  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
    }),
});
export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

export const registerCompanySchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(150).required(),

  companyCode: Joi.string()
    .trim()
    .uppercase()
    .min(2)
    .max(30)
    .required(),

  companyEmail: Joi.string().email().lowercase().trim().required(),

  companyPhone: Joi.string().trim().allow("", null),

  companyCountryCode: Joi.string().trim().default("+91").allow("", null),

  country: Joi.string().trim().allow("", null),

  adminName: Joi.string().trim().min(2).max(120).required(),

  adminEmail: Joi.string().email().lowercase().trim().required(),

  adminMobile: Joi.string().trim().allow("", null),

  adminCountryCode: Joi.string().trim().default("+91").allow("", null),

  password: Joi.string().min(8).max(128).required(),

  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Confirm password must match password.",
    }),

  acceptTerms: Joi.boolean().truthy("true").truthy("1").valid(true).required(),
   companyPan: Joi.string().trim().uppercase().allow("", null),
  companyGst: Joi.string().trim().uppercase().allow("", null),
  industry: Joi.string().trim().allow("", null),
  employeeCount: Joi.string().trim().allow("", null),
  registeredAddress: Joi.string().trim().allow("", null),
  website: Joi.string()
    .trim()
    .pattern(/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/)
    .allow("", null)
    .messages({
      "string.pattern.base": "Website must be a valid domain or URL.",
    }),
  logo: Joi.string().trim().allow("", null),
});





