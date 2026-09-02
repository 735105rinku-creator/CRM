import mongoose from "mongoose";

export const ACCRUAL_FREQUENCY = Object.freeze({
  NONE: "none",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
});

const leavePolicyRuleSchema = new mongoose.Schema(
  {
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },

    yearlyQuota: {
      type: Number,
      default: 0,
      min: 0,
    },

    monthlyAccrual: {
      type: Number,
      default: 0,
      min: 0,
    },

    accrualFrequency: {
      type: String,
      enum: Object.values(ACCRUAL_FREQUENCY),
      default: ACCRUAL_FREQUENCY.NONE,
    },

    carryForwardAllowed: {
      type: Boolean,
      default: false,
    },

    maxCarryForward: {
      type: Number,
      default: 0,
      min: 0,
    },

    encashmentAllowed: {
      type: Boolean,
      default: false,
    },

    maxConsecutiveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    minNoticeDays: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const leaveApprovalLevelSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: true,
      min: 1,
    },

    approverType: {
      type: String,
      enum: ["reporting_manager", "hr", "company_admin", "specific_employee"],
      default: "reporting_manager",
    },

    approverEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    required: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const leavePolicySchema = new mongoose.Schema(
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

    description: {
      type: String,
      trim: true,
      default: "",
    },

    effectiveFrom: {
      type: Date,
      default: Date.now,
    },

    effectiveTo: {
      type: Date,
      default: null,
    },

    rules: {
      type: [leavePolicyRuleSchema],
      default: [],
    },

    approvalLevels: {
      type: [leaveApprovalLevelSchema],
      default: [
        {
          level: 1,
          approverType: "reporting_manager",
          required: true,
        },
        {
          level: 2,
          approverType: "hr",
          required: false,
        },
      ],
    },

    allowNegativeBalance: {
      type: Boolean,
      default: false,
    },

    allowBackdatedLeave: {
      type: Boolean,
      default: false,
    },

    backdatedLimitDays: {
      type: Number,
      default: 0,
      min: 0,
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
  { timestamps: true }
);

leavePolicySchema.index({ companyId: 1, policyCode: 1 }, { unique: true });
leavePolicySchema.index({ companyId: 1, isDefault: 1 });

export const LeavePolicy = mongoose.model("LeavePolicy", leavePolicySchema);