import mongoose from "mongoose";

export const SHIFT_TYPE = Object.freeze({
  FIXED: "fixed",
  FLEXIBLE: "flexible",
  ROTATIONAL: "rotational",
  NIGHT: "night",
});

const shiftSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    shiftName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    shiftCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    shiftType: {
      type: String,
      enum: Object.values(SHIFT_TYPE),
      default: SHIFT_TYPE.FIXED,
    },

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    endTime: {
      type: String,
      required: true,
      trim: true,
    },

    breakMinutes: {
      type: Number,
      default: 60,
      min: 0,
    },

    graceMinutes: {
      type: Number,
      default: 10,
      min: 0,
    },

    halfDayAfterMinutes: {
      type: Number,
      default: 240,
      min: 0,
    },

    fullDayMinutes: {
      type: Number,
      default: 480,
      min: 0,
    },

    weeklyOffDays: {
      type: [String],
      enum: [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ],
      default: ["sunday"],
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

shiftSchema.index({ companyId: 1, shiftCode: 1 }, { unique: true });
shiftSchema.index({ companyId: 1, isDefault: 1 });

export const Shift = mongoose.model("Shift", shiftSchema);