import mongoose from "mongoose";

export const SALARY_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  ON_HOLD: "on_hold",
});

const salaryComponentValueSchema = new mongoose.Schema(
  {
    componentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryComponent",
      required: true,
    },

    componentName: { type: String, trim: true, default: "" },

    componentCode: { type: String, uppercase: true, trim: true, default: "" },

    type: { type: String, enum: ["earning", "deduction"], required: true },

    amount: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const employeeSalarySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    salaryStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructure",
      default: null,
    },

    annualCTC: { type: Number, default: 0, min: 0 },

    monthlyCTC: { type: Number, default: 0, min: 0 },

    earnings: { type: [salaryComponentValueSchema], default: [] },

    deductions: { type: [salaryComponentValueSchema], default: [] },

    grossSalary: { type: Number, default: 0, min: 0 },

    totalDeductions: { type: Number, default: 0, min: 0 },

    netSalary: { type: Number, default: 0, min: 0 },

    effectiveFrom: { type: Date, required: true },

    effectiveTo: { type: Date, default: null },

    status: {
      type: String,
      enum: Object.values(SALARY_STATUS),
      default: SALARY_STATUS.ACTIVE,
      index: true,
    },

    remarks: { type: String, trim: true, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

employeeSalarySchema.index({ companyId: 1, employeeId: 1, status: 1 });
employeeSalarySchema.index({ companyId: 1, employeeId: 1, effectiveFrom: 1 });

export const EmployeeSalary = mongoose.model("EmployeeSalary", employeeSalarySchema);