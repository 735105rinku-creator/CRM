import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    departmentName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    departmentCode: {
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

    featureKey: {
      type: String,
      trim: true,
      lowercase: true,
      enum: [
        "none",
        "sales",
        "accounts",
        "logistics",
        "hr",
        "support",
        "marketing",
        "operations",
        "purchase",
        "production",
        "store"
      ],
      default: "none",
      index: true,
    },
    dashboardKey: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ["none", "employee", "sales", "accounts", "logistics", "hr", "support", "operations"],
      default: "employee",
      index: true,
    },

    accessModules: {
      type: [String],
      default: [],
      set: (items) => Array.from(new Set((Array.isArray(items) ? items : []).map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))),
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isCustom: {
      type: Boolean,
      default: false,
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

departmentSchema.index({ companyId: 1, departmentCode: 1 }, { unique: true });
departmentSchema.index({ companyId: 1, departmentName: 1 });

export const Department = mongoose.model("Department", departmentSchema);

