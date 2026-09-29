import Joi from "joi";

import {
  WAREHOUSE_TRANSFER_STATUSES,
} from "../models/WarehouseTransfer.js";

const optionalString = Joi
  .string()
  .trim()
  .allow("", null);

export const createWarehouseTransferSchema =
  Joi.object({
    fromWarehouseId: Joi
      .string()
      .trim()
      .required(),

    toWarehouseId: Joi
      .string()
      .trim()
      .required(),

    fromItemId: Joi
      .string()
      .trim()
      .required(),

    toItemId: Joi
      .string()
      .trim()
      .allow("", null),

    quantity: Joi
      .number()
      .min(0)
      .required(),

    transferDate: Joi
      .date()
      .allow(null),

    remarks: Joi
      .string()
      .trim()
      .allow("", null)
      .max(3000),
  });

export const warehouseTransferQuerySchema =
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

    fromWarehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    toWarehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    status: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_TRANSFER_STATUSES)
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
        "transferDate",
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