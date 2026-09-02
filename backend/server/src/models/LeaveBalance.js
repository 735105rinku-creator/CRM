import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
      index: true,
    },

    leavePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeavePolicy",
      default: null,
    },

    year: {
      type: Number,
      required: true,
      index: true,
    },

    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    credited: {
      type: Number,
      default: 0,
      min: 0,
    },

    availed: {
      type: Number,
      default: 0,
      min: 0,
    },

    pending: {
      type: Number,
      default: 0,
      min: 0,
    },

    rejected: {
      type: Number,
      default: 0,
      min: 0,
    },

    lapsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    encashed: {
      type: Number,
      default: 0,
      min: 0,
    },

    carryForward: {
      type: Number,
      default: 0,
      min: 0,
    },

    availableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastAccrualDate: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

leaveBalanceSchema.index(
  {
    companyId: 1,
    employeeId: 1,
    leaveTypeId: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

leaveBalanceSchema.index({
  companyId: 1,
  employeeId: 1,
});

leaveBalanceSchema.index({
  companyId: 1,
  year: 1,
});

export const LeaveBalance = mongoose.model(
  "LeaveBalance",
  leaveBalanceSchema
);