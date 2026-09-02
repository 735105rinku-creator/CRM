import Joi from "joi";
import {
  COMPANY_STATUS,
  SUBSCRIPTION_STATUS,
} from "../constants/roles.js";

export const createCompanySchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(150).required(),

  companyCode: Joi.string()
    .trim()
    .uppercase()
    .alphanum()
    .min(2)
    .max(30)
    .required(),

  email: Joi.string().email().lowercase().trim().required(),

  phone: Joi.string().trim().allow("", null),

  website: Joi.string()
    .trim()
    .pattern(/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/)
    .allow("", null),

  industry: Joi.string().trim().allow("", null),

  gstNumber: Joi.string().trim().uppercase().allow("", null),

  panNumber: Joi.string().trim().uppercase().allow("", null),

  address: Joi.object({
    addressLine1: Joi.string().trim().allow("", null),
    addressLine2: Joi.string().trim().allow("", null),
    city: Joi.string().trim().allow("", null),
    state: Joi.string().trim().allow("", null),
    country: Joi.string().trim().allow("", null),
    pincode: Joi.string().trim().allow("", null),
  }).default({}),

  subscriptionPlan: Joi.string()
    .valid("free", "starter", "business", "enterprise")
    .default("free"),

  maxEmployees: Joi.number().integer().min(1).default(10),

  storageLimitMb: Joi.number().integer().min(100).default(1024),

  enabledModules: Joi.array().items(Joi.string()).default([
    "users",
    "employees",
    "attendance",
    "leave",
    "accounts",
  ]),
});

export const updateCompanySchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(150),

  email: Joi.string().email().lowercase().trim(),

  phone: Joi.string().trim().allow("", null),

  website: Joi.string().uri().allow("", null),

  industry: Joi.string().trim().allow("", null),

  gstNumber: Joi.string().trim().uppercase().allow("", null),

  panNumber: Joi.string().trim().uppercase().allow("", null),

  logo: Joi.string().trim().allow("", null),

  address: Joi.object({
    addressLine1: Joi.string().trim().allow("", null),
    addressLine2: Joi.string().trim().allow("", null),
    city: Joi.string().trim().allow("", null),
    state: Joi.string().trim().allow("", null),
    country: Joi.string().trim().allow("", null),
    pincode: Joi.string().trim().allow("", null),
  }),

  settings: Joi.object({
    timezone: Joi.string(),
    currency: Joi.string(),
    dateFormat: Joi.string(),
    financialYearStartMonth: Joi.number().integer().min(1).max(12),
    smtp: Joi.object({
      host: Joi.string().trim().allow("", null),
      port: Joi.string().trim().allow("", null),
      username: Joi.string().trim().allow("", null),
      password: Joi.string().trim().allow("", null),
      fromEmail: Joi.string().email().trim().allow("", null),
      secure: Joi.boolean(),
      isActive: Joi.boolean(),
    }),
    theme: Joi.object({
      primaryColor: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/),
      accentColor: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/),
      sidebarColor: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/),
    }),
  }),

  maxEmployees: Joi.number().integer().min(1),

  storageLimitMb: Joi.number().integer().min(100),

  enabledModules: Joi.array().items(Joi.string()),
});

export const updateCompanyStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(COMPANY_STATUS))
    .required(),

  subscriptionStatus: Joi.string()
    .valid(...Object.values(SUBSCRIPTION_STATUS))
    .optional(),

  subscriptionEndsAt: Joi.date().allow(null),

  trialEndsAt: Joi.date().allow(null),
});

export const createCompanyAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),

  email: Joi.string().email().lowercase().trim().required(),

  mobile: Joi.string().trim().allow("", null),

  password: Joi.string().min(8).max(32).required(),

  department: Joi.string().trim().allow("", null),

  designation: Joi.string().trim().allow("", null),
});



