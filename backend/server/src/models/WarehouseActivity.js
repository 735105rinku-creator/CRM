import mongoose from "mongoose";

export const WAREHOUSE_ACTIVITY_TYPES =
  Object.freeze([
    "goods_received",
    "goods_dispatched",
    "stock_added",
    "stock_removed",
    "stock_transferred",
    "damaged_goods_reported",
    "warehouse_created",
  ]);

const warehouseActivitySchema =
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
        default: null,
        index: true,
      },

      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WarehouseItem",
        default: null,
        index: true,
      },

      type: {
        type: String,
        enum: WAREHOUSE_ACTIVITY_TYPES,
        required: true,
        index: true,
      },

      productName: {
        type: String,
        trim: true,
        default: "",
        maxlength: 200,
      },

      sku: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
        maxlength: 60,
      },

      quantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      unit: {
        type: String,
        trim: true,
        lowercase: true,
        default: "unit",
        maxlength: 30,
      },

      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
        index: true,
      },

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      referenceType: {
        type: String,
        trim: true,
        default: "",
        maxlength: 60,
      },

      referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },

      referenceNumber: {
        type: String,
        trim: true,
        default: "",
        maxlength: 120,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000,
      },

      occurredAt: {
        type: Date,
        default: Date.now,
        index: true,
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

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    { timestamps: true }
  );

warehouseActivitySchema.index({
  companyId: 1,
  occurredAt: -1,
  isActive: 1,
});

warehouseActivitySchema.index({
  companyId: 1,
  type: 1,
  occurredAt: -1,
  isActive: 1,
});

warehouseActivitySchema.index({
  companyId: 1,
  warehouseId: 1,
  occurredAt: -1,
  isActive: 1,
});

warehouseActivitySchema.index({
  companyId: 1,
  itemId: 1,
  occurredAt: -1,
  isActive: 1,
});

export const WarehouseActivity =
  mongoose.model(
    "WarehouseActivity",
    warehouseActivitySchema
  );

export default WarehouseActivity;