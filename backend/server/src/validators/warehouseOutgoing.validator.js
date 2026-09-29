import Joi from "joi";

import {
  WAREHOUSE_ITEM_UNITS,
} from "../models/WarehouseItem.js";

import {
  WAREHOUSE_OUTGOING_DESTINATION_TYPES,
  WAREHOUSE_OUTGOING_STATUSES,
} from "../models/WarehouseOutgoing.js";

const optionalString = Joi
  .string()
  .trim()
  .allow("", null);

const outgoingBaseSchema = Joi.object({
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

  destinationType: Joi
    .string()
    .trim()
    .lowercase()
    .valid(...WAREHOUSE_OUTGOING_DESTINATION_TYPES)
    .default("customer"),

  destinationTypeOther: optionalString,

  destinationWarehouseId: Joi
    .string()
    .trim()
    .allow("", null),

  customerName: Joi
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

  dispatchDate: Joi
    .date()
    .allow(null),

  destination: optionalString,

  remarks: Joi
    .string()
    .trim()
    .allow("", null)
    .max(3000),
});

export const createWarehouseOutgoingSchema =
  outgoingBaseSchema;

export const updateWarehouseOutgoingSchema =
  Joi.object({
    destinationType: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_OUTGOING_DESTINATION_TYPES),

    destinationTypeOther: optionalString,

    destinationWarehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    customerName: Joi
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

    dispatchDate: Joi
      .date()
      .allow(null),

    destination: optionalString,

    remarks: Joi
      .string()
      .trim()
      .allow("", null)
      .max(3000),
  });

export const warehouseOutgoingQuerySchema =
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
      .valid(...WAREHOUSE_OUTGOING_STATUSES)
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
        "dispatchDate",
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