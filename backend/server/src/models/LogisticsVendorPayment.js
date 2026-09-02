import mongoose from "mongoose";

export const LOGISTICS_VENDOR_PAYMENT_STATUSES = Object.freeze([
  "pending",
  "partial",
  "paid",
  "hold",
  "cancelled",
  "other",
]);

export const LOGISTICS_VENDOR_PAYMENT_MODES = Object.freeze([
  "bank_transfer",
  "upi",
  "cheque",
  "cash",
  "card",
  "other",
]);

const paymentHistorySchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      min: 0,
      required: true,
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    paymentMode: {
      type: String,
      enum: LOGISTICS_VENDOR_PAYMENT_MODES,
      required: true,
      default: "bank_transfer",
    },

    paymentModeOther: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    remarks: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 3000,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const logisticsVendorPaymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    paymentCode: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },

    /*
     * Logistics Manager compulsory payment register fields.
     */

    serialNumber: {
      type: Number,
      min: 1,
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVendor",
      required: true,
      index: true,
    },

    vendor: {
      type: String,
      trim: true,
      required: true,
      maxlength: 250,
      index: true,
    },

    exportInvoiceNo: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
      maxlength: 100,
      index: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
    },

    from: {
      type: String,
      trim: true,
      required: true,
      maxlength: 250,
    },

    vendorInvoiceNo: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
      maxlength: 100,
      index: true,
    },

    vendorInvoiceDate: {
      type: Date,
      required: true,
    },

    weight: {
      type: Number,
      min: 0,
      required: true,
    },

    weightUnit: {
      type: String,
      enum: ["kg", "mt", "ton", "lb", "other"],
      default: "mt",
      required: true,
    },

    weightUnitOther: {
      type: String,
      trim: true,
      default: "",
    },

    totalAmount: {
      type: Number,
      min: 0,
      required: true,
    },

    previousAdvance: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    pendingAmount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    paidAmount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    deduction: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    supplierBalance: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: LOGISTICS_VENDOR_PAYMENT_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },

    statusOther: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * Optional linkage to a Logistics Shipment.
     */
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsShipment",
      default: null,
      index: true,
    },

    shipmentNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      index: true,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
      default: "INR",
      maxlength: 10,
    },

    paymentHistory: {
      type: [paymentHistorySchema],
      default: [],
    },

    /*
     * Compulsory final field from Logistics Manager requirement.
     */
    remarks: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 3000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

logisticsVendorPaymentSchema.index(
  { companyId: 1, paymentCode: 1 },
  { unique: true }
);

logisticsVendorPaymentSchema.index({
  companyId: 1,
  vendorId: 1,
  status: 1,
  createdAt: -1,
});

logisticsVendorPaymentSchema.index({
  companyId: 1,
  exportInvoiceNo: 1,
  vendorInvoiceNo: 1,
});

logisticsVendorPaymentSchema.pre("validate", function () {
  if (
    this.weightUnit === "other" &&
    !String(this.weightUnitOther || "").trim()
  ) {
    this.invalidate(
      "weightUnitOther",
      "Weight unit is required when Other is selected"
    );
  }

  if (
    this.status === "other" &&
    !String(this.statusOther || "").trim()
  ) {
    this.invalidate(
      "statusOther",
      "Payment status is required when Other is selected"
    );
  }

  /*
   * Payment calculation:
   * Payable = Total Amount - Previous Advance - Deduction.
   * Supplier Balance / Pending Amount = Payable - Paid Amount.
   */
  const total = Number(this.totalAmount || 0);
  const advance = Number(this.previousAdvance || 0);
  const paid = Number(this.paidAmount || 0);
  const deduction = Number(this.deduction || 0);

  const balance =
    Math.max(
      0,
      total - advance - paid - deduction
    );

  this.pendingAmount = balance;
  this.supplierBalance = balance;

  if (this.status !== "cancelled" && this.status !== "hold" && this.status !== "other") {
    if (balance <= 0 && total > 0) {
      this.status = "paid";
    } else if (paid > 0 || advance > 0 || deduction > 0) {
      this.status = "partial";
    } else {
      this.status = "pending";
    }
  }
});

export const LogisticsVendorPayment = mongoose.model(
  "LogisticsVendorPayment",
  logisticsVendorPaymentSchema
);

export default LogisticsVendorPayment;
