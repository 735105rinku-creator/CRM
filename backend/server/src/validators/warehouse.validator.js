import Joi from "joi";

import {
  WAREHOUSE_TYPES,
  WAREHOUSE_STATUSES,
} from "../models/Warehouse.js";

const optionalString = Joi
  .string()
  .trim()
  .allow("", null);

const warehouseBaseSchema = Joi.object({
  code: Joi
    .string()
    .trim()
    .uppercase()
    .min(2)
    .max(30)
    .required(),

  name: Joi
    .string()
    .trim()
    .min(2)
    .max(200)
    .required(),

  type: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_TYPES)
    .default("owned"),

  typeOther: optionalString,

  addressLine1: optionalString,
  addressLine2: optionalString,
  city: optionalString,
  state: optionalString,
  country: Joi
    .string()
    .trim()
    .allow("", null)
    .default("India"),
  pincode: optionalString,

  contactPerson: optionalString,

  phone: optionalString,

  email: Joi
    .string()
    .trim()
    .lowercase()
    .email()
    .allow("", null),

  capacity: Joi
    .number()
    .min(0)
    .default(0),

  capacityUnit: Joi
    .string()
    .trim()
    .lowercase()
    .valid(
      "sq_ft",
      "sq_m",
      "mt",
      "ton",
      "pallet",
      "unit",
      "other"
    )
    .default("unit"),

  capacityUnitOther: optionalString,

  status: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_STATUSES)
    .default("active"),

  remarks: Joi
    .string()
    .trim()
    .allow("", null)
    .max(3000),
});

export const createWarehouseSchema =
  warehouseBaseSchema;

export const updateWarehouseSchema =
  warehouseBaseSchema.fork(
    ["code", "name"],
    (schema) => schema.optional()
  );

export const warehouseQuerySchema = Joi.object({
  page: Joi
    .number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi
    .number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  search: Joi
    .string()
    .trim()
    .allow("", null),

  status: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_STATUSES)
    .allow("", null),

  type: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_TYPES)
    .allow("", null),

  fromDate: Joi
    .date()
    .allow(null),

  toDate: Joi
    .date()
    .allow(null),

  sortBy: Joi
    .string()
    .trim()
    .valid(
      "createdAt",
      "updatedAt",
      "code",
      "name",
      "status",
      "type"
    )
    .default("createdAt"),

  sortOrder: Joi
    .string()
    .trim()
    .lowercase()
    .valid("asc", "desc")
    .default("desc"),
});