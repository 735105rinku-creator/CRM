import mongoose from "mongoose";

export const PAYROLL_STATUS = Object.freeze({
  DRAFT: "draft",
  PROCESSED: "processed",
  APPROVED: "approved",
  PAID: "paid",
  LOCKED: "locked",
  CANCELLED: "cancelled",
});

const payrollSummarySchema = new mongoose.Schema(
  {
    totalEmployees: { type: Number, default: 0, min: 0 },

    totalGrossSalary: { type: Number, default: 0, min: 0 },

    totalDeductions: { type: Number, default: 0, min: 0 },

    totalNetSalary: { type: Number, default: 0, min: 0 },

    totalPF: { type: Number, default: 0, min: 0 },

    totalESI: { type: Number, default: 0, min: 0 },

    totalTDS: { type: Number, default: 0, min: 0 },

    totalProfessionalTax: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const payrollRunSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    payrollCode: { type: String, required: true, uppercase: true, trim: true, index: true },

    month: { type: Number, required: true, min: 1, max: 12, index: true },

    year: { type: Number, required: true, index: true },

    fromDate: { type: Date, required: true },

    toDate: { type: Date, required: true },

    paymentDate: { type: Date, default: null },

    status: {
      type: String,
      enum: Object.values(PAYROLL_STATUS),
      default: PAYROLL_STATUS.DRAFT,
      index: true,
    },

    summary: { type: payrollSummarySchema, default: {} },

    remarks: { type: String, trim: true, default: "" },

    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    processedAt: { type: Date, default: null },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    approvedAt: { type: Date, default: null },

    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    lockedAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

payrollRunSchema.index({ companyId: 1, year: 1, month: 1 }, { unique: true });
payrollRunSchema.index({ companyId: 1, payrollCode: 1 }, { unique: true });

export const PayrollRun = mongoose.model("PayrollRun", payrollRunSchema);