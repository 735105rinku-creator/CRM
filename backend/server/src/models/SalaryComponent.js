import mongoose from "mongoose";

export const COMPONENT_TYPE = Object.freeze({
  EARNING: "earning",
  DEDUCTION: "deduction",
});

export const CALCULATION_TYPE = Object.freeze({
  FIXED: "fixed",
  PERCENTAGE: "percentage",
});

const salaryComponentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    componentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    componentCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    type: {
      type: String,
      enum: Object.values(COMPONENT_TYPE),
      required: true,
      index: true,
    },

    calculationType: {
      type: String,
      enum: Object.values(CALCULATION_TYPE),
      default: CALCULATION_TYPE.FIXED,
    },

    value: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxable: {
      type: Boolean,
      default: true,
    },

    affectsPF: {
      type: Boolean,
      default: false,
    },

    affectsESI: {
      type: Boolean,
      default: false,
    },

    affectsGratuity: {
      type: Boolean,
      default: false,
    },

    isDefault: {
      type: Boolean,
      default: false,
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

salaryComponentSchema.index(
  { companyId: 1, componentCode: 1 },
  { unique: true }
);

export const SalaryComponent = mongoose.model(
  "SalaryComponent",
  salaryComponentSchema
);