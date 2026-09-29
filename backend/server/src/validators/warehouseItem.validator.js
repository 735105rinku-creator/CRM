import Joi from "joi";

import {
  WAREHOUSE_ITEM_STATUSES,
  WAREHOUSE_ITEM_UNITS,
} from "../models/WarehouseItem.js";

const optionalString = Joi
  .string()
  .trim()
  .allow("", null);

const itemBaseSchema = Joi.object({
  warehouseId: Joi
    .string()
    .trim()
    .required(),

  productName: Joi
    .string()
    .trim()
    .min(2)
    .max(200)
    .required(),

  sku: Joi
    .string()
    .trim()
    .uppercase()
    .min(1)
    .max(60)
    .required(),

  unit: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_ITEM_UNITS)
    .default("unit"),

  availableQuantity: Joi
    .number()
    .min(0)
    .default(0),

  reservedQuantity: Joi
    .number()
    .min(0)
    .default(0),

  damagedQuantity: Joi
    .number()
    .min(0)
    .default(0),

  reorderLevel: Joi
    .number()
    .min(0)
    .default(0),

  remarks: Joi
    .string()
    .trim()
    .allow("", null)
    .max(3000),
});

export const createWarehouseItemSchema =
  itemBaseSchema;

export const updateWarehouseItemSchema =
  Joi.object({
    warehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    productName: Joi
      .string()
      .trim()
      .min(2)
      .max(200),

    sku: Joi
      .string()
      .trim()
      .uppercase()
      .min(1)
      .max(60),

    unit: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_ITEM_UNITS),

    reorderLevel: Joi
      .number()
      .min(0),

    remarks: optionalString,
  });

export const adjustWarehouseItemQuantitySchema =
  Joi.object({
    operation: Joi
      .string()
      .trim()
      .lowercase()
      .valid(
        "add",
        "remove",
        "adjust",
        "damage"
      )
      .required(),

    quantity: Joi
      .number()
      .min(0)
      .required(),

    reason: Joi
      .string()
      .trim()
      .allow("", null)
      .max(500),
  });

export const warehouseItemQuerySchema =
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

    status: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_ITEM_STATUSES)
      .allow("", null),

    sortBy: Joi
      .string()
      .trim()
      .valid(
        "createdAt",
        "updatedAt",
        "productName",
        "sku",
        "availableQuantity",
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