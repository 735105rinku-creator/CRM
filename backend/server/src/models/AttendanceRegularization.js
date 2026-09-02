import mongoose from "mongoose";

export const REGULARIZATION_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

const attendanceRegularizationSchema = new mongoose.Schema(
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

    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
      index: true,
    },

    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },

    requestedCheckIn: {
      type: Date,
      default: null,
    },

    requestedCheckOut: {
      type: Date,
      default: null,
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

    employeeRemarks: {
      type: String,
      trim: true,
      default: "",
    },

    managerRemarks: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: Object.values(REGULARIZATION_STATUS),
      default: REGULARIZATION_STATUS.PENDING,
      index: true,
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

attendanceRegularizationSchema.index({
  companyId: 1,
  employeeId: 1,
  attendanceDate: 1,
});

attendanceRegularizationSchema.index({
  companyId: 1,
  status: 1,
});

export const AttendanceRegularization = mongoose.model(
  "AttendanceRegularization",
  attendanceRegularizationSchema
);