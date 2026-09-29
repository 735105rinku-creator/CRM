import Joi from "joi";

import {
  WAREHOUSE_ITEM_UNITS,
} from "../models/WarehouseItem.js";

import {
  WAREHOUSE_INCOMING_REFERENCE_TYPES,
  WAREHOUSE_INCOMING_CONDITIONS,
  WAREHOUSE_INCOMING_STATUSES,
} from "../models/WarehouseIncoming.js";

const optionalString = Joi
  .string()
  .trim()
  .allow("", null);

const incomingBaseSchema = Joi.object({
  warehouseId: Joi
    .string()
    .trim()
    .required(),

  shipmentNumber: Joi
    .string()
    .trim()
    .uppercase()
    .min(1)
    .max(60)
    .required(),

  referenceType: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_INCOMING_REFERENCE_TYPES)
    .default("supplier"),

  referenceTypeOther: optionalString,

  referenceNumber: optionalString,

  supplierName: Joi
    .string()
    .trim()
    .min(2)
    .max(200)
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

  itemId: Joi
    .string()
    .trim()
    .allow("", null),

  quantity: Joi
    .number()
    .min(0)
    .required(),

  unit: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_ITEM_UNITS)
    .default("unit"),

  arrivalDate: Joi
    .date()
    .allow(null),

  condition: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_INCOMING_CONDITIONS)
    .default("good"),

  conditionOther: optionalString,

  remarks: Joi
    .string()
    .trim()
    .allow("", null)
    .max(3000),
});

export const createWarehouseIncomingSchema =
  incomingBaseSchema;

export const updateWarehouseIncomingSchema =
  Joi.object({
    referenceType: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_INCOMING_REFERENCE_TYPES),

    referenceTypeOther: optionalString,

    referenceNumber: optionalString,

    supplierName: Joi
      .string()
      .trim()
      .min(2)
      .max(200),

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

    itemId: Joi
      .string()
      .trim()
      .allow("", null),

    quantity: Joi
      .number()
      .min(0),

    unit: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_ITEM_UNITS),

    arrivalDate: Joi
      .date()
      .allow(null),

    condition: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_INCOMING_CONDITIONS),

    conditionOther: optionalString,

    remarks: Joi
      .string()
      .trim()
      .allow("", null)
      .max(3000),
  });

export const warehouseIncomingQuerySchema =
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
      .valid(...WAREHOUSE_INCOMING_STATUSES)
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
        "arrivalDate",
        "shipmentNumber",
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