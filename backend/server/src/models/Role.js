import mongoose from "mongoose";

export const ROLE_LEVEL = Object.freeze({
  SUPER_ADMIN: 0,
  COMPANY_ADMIN: 1,
  HR_MANAGER: 2,
  DEPARTMENT_HEAD: 2,
  TEAM_LEADER: 3,
  EMPLOYEE: 4,
});

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
    },
    level: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
      index: true,
    },
    permissions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    isCustom: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

roleSchema.index({ company: 1, name: 1 }, { unique: true });
roleSchema.index({ isActive: 1, level: 1 });

export const Role = mongoose.model("Role", roleSchema);




