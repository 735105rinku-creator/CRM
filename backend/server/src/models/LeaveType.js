import mongoose from "mongoose";

export const LEAVE_CATEGORY = Object.freeze({
  CASUAL: "casual",
  SICK: "sick",
  EARNED: "earned",
  LWP: "lwp",
  MATERNITY: "maternity",
  PATERNITY: "paternity",
  COMP_OFF: "comp_off",
  OPTIONAL: "optional",
  OTHER: "other",
});

const leaveTypeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    leaveName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    leaveCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    category: {
      type: String,
      enum: Object.values(LEAVE_CATEGORY),
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    paid: {
      type: Boolean,
      default: true,
    },

    allowHalfDay: {
      type: Boolean,
      default: true,
    },

    requireDocument: {
      type: Boolean,
      default: false,
    },

    requireApproval: {
      type: Boolean,
      default: true,
    },

    colorCode: {
      type: String,
      trim: true,
      default: "#4F46E5",
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

leaveTypeSchema.index({ companyId: 1, leaveCode: 1 }, { unique: true });
leaveTypeSchema.index({ companyId: 1, category: 1 });

export const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);