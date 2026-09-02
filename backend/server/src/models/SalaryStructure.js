import mongoose from "mongoose";

const structureComponentSchema = new mongoose.Schema(
  {
    componentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryComponent",
      required: true,
    },

    amount: { type: Number, default: 0, min: 0 },

    percentageOfCTC: { type: Number, default: 0, min: 0 },

    enabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const salaryStructureSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    structureName: { type: String, required: true, trim: true, maxlength: 120 },

    structureCode: { type: String, required: true, uppercase: true, trim: true, maxlength: 30 },

    description: { type: String, trim: true, default: "" },

    annualCTC: { type: Number, default: 0, min: 0 },

    monthlyCTC: { type: Number, default: 0, min: 0 },

    earnings: { type: [structureComponentSchema], default: [] },

    deductions: { type: [structureComponentSchema], default: [] },

    isDefault: { type: Boolean, default: false, index: true },

    isActive: { type: Boolean, default: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

salaryStructureSchema.index({ companyId: 1, structureCode: 1 }, { unique: true });

export const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);