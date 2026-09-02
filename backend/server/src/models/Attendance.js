import mongoose from "mongoose";

export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  HALF_DAY: "half_day",
  ON_LEAVE: "on_leave",
  WEEK_OFF: "week_off",
  HOLIDAY: "holiday",
});

export const CHECKIN_SOURCE = Object.freeze({
  WEB: "web",
  MOBILE: "mobile",
  BIOMETRIC: "biometric",
  MANUAL: "manual",
});

const locationSchema = new mongoose.Schema(
  {
    latitude: Number,
    longitude: Number,
    address: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const punchLogSchema = new mongoose.Schema(
  {
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date, default: null },
    totalWorkMinutes: { type: Number, default: 0, min: 0 },
    checkInSource: {
      type: String,
      enum: Object.values(CHECKIN_SOURCE),
      default: CHECKIN_SOURCE.WEB,
    },
    checkOutSource: {
      type: String,
      enum: Object.values(CHECKIN_SOURCE),
      default: CHECKIN_SOURCE.WEB,
    },
    checkInLocation: {
      type: locationSchema,
      default: {},
    },
    checkOutLocation: {
      type: locationSchema,
      default: {},
    },
  },
  { _id: true }
);

const attendanceSchema = new mongoose.Schema(
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

    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },

    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },

    attendancePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendancePolicy",
      default: null,
    },

    checkInTime: {
      type: Date,
      default: null,
    },

    checkOutTime: {
      type: Date,
      default: null,
    },

    checkInSource: {
      type: String,
      enum: Object.values(CHECKIN_SOURCE),
      default: CHECKIN_SOURCE.WEB,
    },

    checkOutSource: {
      type: String,
      enum: Object.values(CHECKIN_SOURCE),
      default: CHECKIN_SOURCE.WEB,
    },

    checkInLocation: {
      type: locationSchema,
      default: {},
    },

    checkOutLocation: {
      type: locationSchema,
      default: {},
    },

    punchLogs: {
      type: [punchLogSchema],
      default: [],
    },

    checkInSelfie: {
      type: String,
      trim: true,
      default: "",
    },

    checkOutSelfie: {
      type: String,
      trim: true,
      default: "",
    },

    totalWorkMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    breakMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    overtimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateByMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    earlyCheckoutMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      default: ATTENDANCE_STATUS.PRESENT,
      index: true,
    },

    isLate: {
      type: Boolean,
      default: false,
      index: true,
    },

    isHalfDay: {
      type: Boolean,
      default: false,
      index: true,
    },

    isRegularized: {
      type: Boolean,
      default: false,
    },

    regularizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceRegularization",
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
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

attendanceSchema.index(
  { companyId: 1, employeeId: 1, attendanceDate: 1 },
  { unique: true }
);

attendanceSchema.index({ companyId: 1, attendanceDate: 1, status: 1 });
attendanceSchema.index({ companyId: 1, employeeId: 1, status: 1 });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
