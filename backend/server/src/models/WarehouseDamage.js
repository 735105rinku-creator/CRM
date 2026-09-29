import mongoose from "mongoose";

import {
  WAREHOUSE_ITEM_UNITS,
} from "./WarehouseItem.js";

export const WAREHOUSE_DAMAGE_STATUSES =
  Object.freeze([
    "reported",
    "under_review",
    "approved",
    "removed",
  ]);

const warehouseDamageSchema =
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

      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WarehouseItem",
        required: true,
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

      damageReason: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 500,
      },

      damageDate: {
        type: Date,
        default: Date.now,
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
          WAREHOUSE_DAMAGE_STATUSES,
        default: "reported",
        index: true,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      removedAt: {
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

warehouseDamageSchema.index({
  companyId: 1,
  warehouseId: 1,
  status: 1,
  isActive: 1,
});

warehouseDamageSchema.index({
  companyId: 1,
  status: 1,
  isActive: 1,
});

warehouseDamageSchema.index({
  companyId: 1,
  itemId: 1,
  isActive: 1,
});

warehouseDamageSchema.index({
  companyId: 1,
  sku: 1,
  isActive: 1,
});

export const WarehouseDamage =
  mongoose.model(
    "WarehouseDamage",
    warehouseDamageSchema
  );

export default WarehouseDamage;