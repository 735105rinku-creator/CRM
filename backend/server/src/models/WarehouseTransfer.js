import mongoose from "mongoose";

import {
  WAREHOUSE_ITEM_UNITS,
} from "./WarehouseItem.js";

export const WAREHOUSE_TRANSFER_STATUSES =
  Object.freeze([
    "pending",
    "completed",
    "cancelled",
  ]);

const warehouseTransferSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },

      fromWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
        index: true,
      },

      toWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
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

      fromItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WarehouseItem",
        required: true,
        index: true,
      },

      toItemId: {
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

      transferDate: {
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
          WAREHOUSE_TRANSFER_STATUSES,
        default: "pending",
        index: true,
      },

      completedAt: {
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

warehouseTransferSchema.index({
  companyId: 1,
  fromWarehouseId: 1,
  status: 1,
  isActive: 1,
});

warehouseTransferSchema.index({
  companyId: 1,
  toWarehouseId: 1,
  status: 1,
  isActive: 1,
});

warehouseTransferSchema.index({
  companyId: 1,
  status: 1,
  isActive: 1,
});

warehouseTransferSchema.index({
  companyId: 1,
  sku: 1,
  isActive: 1,
});

export const WarehouseTransfer =
  mongoose.model(
    "WarehouseTransfer",
    warehouseTransferSchema
  );

export default WarehouseTransfer;