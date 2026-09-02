import mongoose from "mongoose";

export const LEAVE_REQUEST_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

export const LEAVE_DAY_TYPE = Object.freeze({
  FULL_DAY: "full_day",
  HALF_DAY_FIRST: "half_day_first",
  HALF_DAY_SECOND: "half_day_second",
});

const approvalHistorySchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: true,
      min: 1,
    },

    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approverEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    actionAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const leaveRequestSchema = new mongoose.Schema(
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

    fromDate: {
      type: Date,
      required: true,
      index: true,
    },

    toDate: {
      type: Date,
      required: true,
      index: true,
    },

    dayType: {
      type: String,
      enum: Object.values(LEAVE_DAY_TYPE),
      default: LEAVE_DAY_TYPE.FULL_DAY,
    },

    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    attachment: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: Object.values(LEAVE_REQUEST_STATUS),
      default: LEAVE_REQUEST_STATUS.PENDING,
      index: true,
    },

    approvalHistory: {
      type: [approvalHistorySchema],
      default: [],
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    approverRemarks: {
      type: String,
      trim: true,
      default: "",
    },

    cancellationReason: {
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
  { timestamps: true }
);

leaveRequestSchema.index({
  companyId: 1,
  employeeId: 1,
  fromDate: 1,
  toDate: 1,
});

leaveRequestSchema.index({
  companyId: 1,
  status: 1,
});

leaveRequestSchema.index({
  companyId: 1,
  leaveTypeId: 1,
});

export const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);