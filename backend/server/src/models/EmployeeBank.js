import mongoose from "mongoose";

const employeeBankSchema = new mongoose.Schema(
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
      unique: true,
      index: true,
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    branchName: {
      type: String,
      trim: true,
      default: "",
    },

    accountHolderName: {
      type: String,
      trim: true,
      default: "",
    },

    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },

    ifscCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    upiId: {
      type: String,
      trim: true,
      default: "",
    },

    paymentMode: {
      type: String,
      enum: ["bank_transfer", "upi", "cash", "cheque", ""],
      default: "bank_transfer",
    },

    isSalaryAccount: {
      type: Boolean,
      default: true,
    },

    cancelledChequeUrl: {
      type: String,
      trim: true,
      default: "",
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

employeeBankSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });

export const EmployeeBank = mongoose.model("EmployeeBank", employeeBankSchema);