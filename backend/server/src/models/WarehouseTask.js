import mongoose from "mongoose";

export const WAREHOUSE_TASK_PRIORITIES =
  Object.freeze([
    "low",
    "normal",
    "high",
    "urgent",
  ]);

export const WAREHOUSE_TASK_STATUSES =
  Object.freeze([
    "open",
    "in_progress",
    "completed",
    "cancelled",
  ]);

const warehouseTaskSchema =
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

      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 200,
        index: true,
      },

      description: {
        type: String,
        trim: true,
        default: "",
        maxlength: 3000,
      },

      assignedToEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
        index: true,
      },

      assignedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      priority: {
        type: String,
        enum: WAREHOUSE_TASK_PRIORITIES,
        default: "normal",
        index: true,
      },

      dueDate: {
        type: Date,
        default: null,
        index: true,
      },

      status: {
        type: String,
        enum: WAREHOUSE_TASK_STATUSES,
        default: "open",
        index: true,
      },

      completedAt: {
        type: Date,
        default: null,
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

warehouseTaskSchema.index({
  companyId: 1,
  status: 1,
  isActive: 1,
});

warehouseTaskSchema.index({
  companyId: 1,
  warehouseId: 1,
  status: 1,
  isActive: 1,
});

warehouseTaskSchema.index({
  companyId: 1,
  assignedToEmployeeId: 1,
  status: 1,
  isActive: 1,
});

warehouseTaskSchema.index({
  companyId: 1,
  dueDate: 1,
  status: 1,
  isActive: 1,
});

export const WarehouseTask =
  mongoose.model(
    "WarehouseTask",
    warehouseTaskSchema
  );

export default WarehouseTask;