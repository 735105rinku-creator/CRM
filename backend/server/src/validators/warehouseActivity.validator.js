import Joi from "joi";

import {
  WAREHOUSE_ACTIVITY_TYPES,
} from "../models/WarehouseActivity.js";

export const warehouseActivityQuerySchema =
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

    type: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_ACTIVITY_TYPES)
      .allow("", null),

    employeeId: Joi
      .string()
      .trim()
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
        "occurredAt",
        "createdAt",
        "quantity",
        "type"
      )
      .default("occurredAt"),

    sortOrder: Joi
      .string()
      .trim()
      .lowercase()
      .valid("asc", "desc")
      .default("desc"),
  });