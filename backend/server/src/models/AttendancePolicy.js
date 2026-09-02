import mongoose from "mongoose";

export const LATE_MARK_ACTION = Object.freeze({
  NONE: "none",
  WARNING: "warning",
  HALF_DAY: "half_day",
  LEAVE_DEDUCTION: "leave_deduction",
});

export const OVERTIME_CALCULATION = Object.freeze({
  NONE: "none",
  AFTER_SHIFT: "after_shift",
  AFTER_APPROVAL: "after_approval",
});

const attendancePolicySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    policyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    policyCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    graceMinutes: {
      type: Number,
      default: 10,
      min: 0,
    },

    maxLateAllowedPerMonth: {
      type: Number,
      default: 3,
      min: 0,
    },

    lateMarkAction: {
      type: String,
      enum: Object.values(LATE_MARK_ACTION),
      default: LATE_MARK_ACTION.WARNING,
    },

    halfDayAfterMinutes: {
      type: Number,
      default: 240,
      min: 0,
    },

    absentAfterMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    allowRegularization: {
      type: Boolean,
      default: true,
    },

    regularizationLimitPerMonth: {
      type: Number,
      default: 3,
      min: 0,
    },

    allowOvertime: {
      type: Boolean,
      default: true,
    },

    overtimeCalculation: {
      type: String,
      enum: Object.values(OVERTIME_CALCULATION),
      default: OVERTIME_CALCULATION.AFTER_APPROVAL,
    },

    minimumOvertimeMinutes: {
      type: Number,
      default: 30,
      min: 0,
    },

    biometricRequired: {
      type: Boolean,
      default: false,
    },

    selfieRequired: {
      type: Boolean,
      default: false,
    },

    gpsRequired: {
      type: Boolean,
      default: false,
    },

    webCheckInAllowed: {
      type: Boolean,
      default: true,
    },

    mobileCheckInAllowed: {
      type: Boolean,
      default: true,
    },

    autoMarkAbsent: {
      type: Boolean,
      default: true,
    },

    autoMarkHalfDay: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

attendancePolicySchema.index(
  {
    companyId: 1,
    policyCode: 1,
  },
  {
    unique: true,
  }
);

attendancePolicySchema.index({
  companyId: 1,
  isDefault: 1,
});

export const AttendancePolicy = mongoose.model(
  "AttendancePolicy",
  attendancePolicySchema
);