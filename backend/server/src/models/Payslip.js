import mongoose from "mongoose";

export const PAYSLIP_STATUS = Object.freeze({
  GENERATED: "generated",
  SENT: "sent",
  PAID: "paid",
  CANCELLED: "cancelled",
});

const payslipComponentSchema = new mongoose.Schema(
  {
    componentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryComponent",
      default: null,
    },

    name: { type: String, required: true, trim: true },

    code: { type: String, uppercase: true, trim: true, default: "" },

    amount: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const attendanceSnapshotSchema = new mongoose.Schema(
  {
    payableDays: { type: Number, default: 0, min: 0 },

    presentDays: { type: Number, default: 0, min: 0 },

    absentDays: { type: Number, default: 0, min: 0 },

    leaveDays: { type: Number, default: 0, min: 0 },

    halfDays: { type: Number, default: 0, min: 0 },

    lateDays: { type: Number, default: 0, min: 0 },

    overtimeMinutes: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const payslipSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    payrollRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollRun",
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    payslipNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    month: { type: Number, required: true, min: 1, max: 12 },

    year: { type: Number, required: true },

    earnings: { type: [payslipComponentSchema], default: [] },

    deductions: { type: [payslipComponentSchema], default: [] },

    grossSalary: { type: Number, default: 0, min: 0 },

    totalDeductions: { type: Number, default: 0, min: 0 },

    netSalary: { type: Number, default: 0, min: 0 },

    attendance: { type: attendanceSnapshotSchema, default: {} },

    bankName: { type: String, trim: true, default: "" },

    accountNumber: { type: String, trim: true, default: "" },

    ifscCode: { type: String, uppercase: true, trim: true, default: "" },

    pdfUrl: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: Object.values(PAYSLIP_STATUS),
      default: PAYSLIP_STATUS.GENERATED,
      index: true,
    },

    paidAt: { type: Date, default: null },

    sentAt: { type: Date, default: null },

    remarks: { type: String, trim: true, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

payslipSchema.index({ companyId: 1, payslipNumber: 1 }, { unique: true });
payslipSchema.index({ companyId: 1, payrollRunId: 1, employeeId: 1 }, { unique: true });
payslipSchema.index({ companyId: 1, employeeId: 1, year: 1, month: 1 });

export const Payslip = mongoose.model("Payslip", payslipSchema);