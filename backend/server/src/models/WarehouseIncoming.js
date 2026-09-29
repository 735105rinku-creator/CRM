import mongoose from "mongoose";

import {
  WAREHOUSE_ITEM_UNITS,
} from "./WarehouseItem.js";

export const WAREHOUSE_INCOMING_REFERENCE_TYPES =
  Object.freeze([
    "supplier",
    "manufacturer",
    "import_shipment",
    "purchase_order",
    "other",
  ]);

export const WAREHOUSE_INCOMING_CONDITIONS =
  Object.freeze([
    "good",
    "damaged",
    "partial",
    "other",
  ]);

export const WAREHOUSE_INCOMING_STATUSES =
  Object.freeze([
    "expected",
    "received",
    "confirmed",
    "cancelled",
  ]);

const warehouseIncomingSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
        index: true,
      },

      shipmentNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 60,
      },

      referenceType: {
        type: String,
        enum:
          WAREHOUSE_INCOMING_REFERENCE_TYPES,
        default: "supplier",
        index: true,
      },

      referenceTypeOther: {
        type: String,
        trim: true,
        default: "",
      },

      referenceNumber: {
        type: String,
        trim: true,
        default: "",
      },

      supplierName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 200,
        index: true,
      },

      productName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 200,
        index: true,
      },

      sku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 60,
      },

      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WarehouseItem",
        default: null,
        index: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 0,
      },

      unit: {
        type: String,
        trim: true,
        lowercase: true,
        enum: WAREHOUSE_ITEM_UNITS,
        default: "unit",
      },

      arrivalDate: {
        type: Date,
        default: Date.now,
      },

      condition: {
        type: String,
        enum:
          WAREHOUSE_INCOMING_CONDITIONS,
        default: "good",
      },

      conditionOther: {
        type: String,
        trim: true,
        default: "",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
        maxlength: 3000,
      },

      status: {
        type: String,
        enum:
          WAREHOUSE_INCOMING_STATUSES,
        default: "expected",
        index: true,
      },

      receivedAt: {
        type: Date,
        default: null,
      },

      confirmedAt: {
        type: Date,
        default: null,
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      createdByEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
      },

      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    { timestamps: true }
  );

warehouseIncomingSchema.index(
  { companyId: 1, shipmentNumber: 1 },
  { unique: true }
);

warehouseIncomingSchema.index({
  companyId: 1,
  warehouseId: 1,
  status: 1,
  isActive: 1,
});

warehouseIncomingSchema.index({
  companyId: 1,
  status: 1,
  isActive: 1,
});

warehouseIncomingSchema.index({
  companyId: 1,
  sku: 1,
  isActive: 1,
});

warehouseIncomingSchema.pre(
  "validate",
  function () {
    if (
      this.referenceType === "other" &&
      !String(
        this.referenceTypeOther || ""
      ).trim()
    ) {
      this.invalidate(
        "referenceTypeOther",
        "Reference type is required when Other is selected"
      );
    }

    if (
      this.condition === "other" &&
      !String(
        this.conditionOther || ""
      ).trim()
    ) {
      this.invalidate(
        "conditionOther",
        "Condition is required when Other is selected"
      );
    }
  }
);

export const WarehouseIncoming =
  mongoose.model(
    "WarehouseIncoming",
    warehouseIncomingSchema
  );

export default WarehouseIncoming;