import mongoose from "mongoose";

export const WAREHOUSE_ITEM_STATUSES =
  Object.freeze([
    "in_stock",
    "low_stock",
    "out_of_stock",
    "reserved",
    "damaged",
  ]);

export const WAREHOUSE_ITEM_UNITS =
  Object.freeze([
    "unit",
    "kg",
    "g",
    "mt",
    "ton",
    "lb",
    "ltr",
    "ml",
    "box",
    "carton",
    "pallet",
    "bag",
    "roll",
    "other",
  ]);

const warehouseItemSchema =
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

      unit: {
        type: String,
        trim: true,
        lowercase: true,
        enum: WAREHOUSE_ITEM_UNITS,
        default: "unit",
      },

      availableQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      reservedQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      damagedQuantity: {
        type: Number,
        min: 0,
        default: 0,
      },

      reorderLevel: {
        type: Number,
        min: 0,
        default: 0,
      },

      status: {
        type: String,
        enum: WAREHOUSE_ITEM_STATUSES,
        default: "in_stock",
        index: true,
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
        maxlength: 3000,
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

warehouseItemSchema.index(
  {
    companyId: 1,
    warehouseId: 1,
    sku: 1,
  },
  {
    unique: true,
  }
);

warehouseItemSchema.index({
  companyId: 1,
  warehouseId: 1,
  status: 1,
  isActive: 1,
});

warehouseItemSchema.index({
  companyId: 1,
  status: 1,
  isActive: 1,
});

export const WarehouseItem =
  mongoose.model(
    "WarehouseItem",
    warehouseItemSchema
  );

export default WarehouseItem;