import Joi from "joi";

import {
  WAREHOUSE_DAMAGE_STATUSES,
} from "../models/WarehouseDamage.js";

export const createWarehouseDamageSchema =
  Joi.object({
    warehouseId: Joi
      .string()
      .trim()
      .required(),

    itemId: Joi
      .string()
      .trim()
      .required(),

    quantity: Joi
      .number()
      .min(1)
      .required(),

    damageReason: Joi
      .string()
      .trim()
      .min(2)
      .max(500)
      .required(),

    damageDate: Joi
      .date()
      .allow(null),

    remarks: Joi
      .string()
      .trim()
      .allow("", null)
      .max(3000),
  });

export const warehouseDamageQuerySchema =
  Joi.object({
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

    warehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    itemId: Joi
      .string()
      .trim()
      .allow("", null),

    status: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_DAMAGE_STATUSES)
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
        "damageDate",
        "productName",
        "status"
      )
      .default("createdAt"),

    sortOrder: Joi
      .string()
      .trim()
      .lowercase()
      .valid("asc", "desc")
      .default("desc"),
  });