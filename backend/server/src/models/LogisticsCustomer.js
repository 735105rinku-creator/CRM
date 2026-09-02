import mongoose from "mongoose";

export const LOGISTICS_CUSTOMER_STATUSES = Object.freeze([
  "active",
  "inactive",
  "blocked",
  "other",
]);

export const LOGISTICS_CUSTOMER_TYPES = Object.freeze([
  "company",
  "individual",
  "exporter",
  "importer",
  "both",
  "other",
]);

const addressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      trim: true,
      default: "",
    },

    addressLine2: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "India",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const logisticsCustomerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    customerCode: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },

    customerType: {
      type: String,
      enum: LOGISTICS_CUSTOMER_TYPES,
      default: "company",
      index: true,
    },

    customerTypeOther: {
      type: String,
      trim: true,
      default: "",
    },

    customerName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 250,
      index: true,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250,
    },

    contactPerson: {
      type: String,
      trim: true,
      required: true,
      maxlength: 150,
    },

    mobile: {
      type: String,
      trim: true,
      required: true,
      maxlength: 30,
    },

    alternateMobile: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 200,
    },

    gstType: {
      type: String,
      enum: [
        "registered",
        "unregistered",
        "composition",
        "overseas",
        "other",
      ],
      default: "registered",
    },

    gstTypeOther: {
      type: String,
      trim: true,
      default: "",
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: 30,
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: 20,
    },

    iecNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: 30,
    },

    billingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    shippingAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    pickupAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    sameAsBilling: {
      type: Boolean,
      default: false,
    },

    paymentTerms: {
      type: String,
      trim: true,
      default: "30 Days",
      maxlength: 120,
    },

    paymentTermsOther: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },

    openingBalance: {
      type: Number,
      default: 0,
    },

    balanceType: {
      type: String,
      enum: [
        "receivable",
        "payable",
        "zero",
        "other",
      ],
      default: "receivable",
    },

    balanceTypeOther: {
      type: String,
      trim: true,
      default: "",
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },

    salesPerson: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    preferredMode: {
      type: String,
      enum: [
        "air_cargo",
        "sea_freight",
        "road",
        "multi_mode",
        "other",
      ],
      default: "multi_mode",
    },

    preferredModeOther: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: LOGISTICS_CUSTOMER_STATUSES,
      default: "active",
      index: true,
    },

    statusOther: {
      type: String,
      trim: true,
      default: "",
    },

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
  {
    timestamps: true,
  }
);

logisticsCustomerSchema.index(
  {
    companyId: 1,
    customerCode: 1,
  },
  {
    unique: true,
  }
);

logisticsCustomerSchema.index({
  companyId: 1,
  customerName: 1,
  isActive: 1,
});

logisticsCustomerSchema.index({
  companyId: 1,
  mobile: 1,
  isActive: 1,
});

logisticsCustomerSchema.pre(
  "validate",
  function () {
    if (
      this.customerType === "other" &&
      !String(this.customerTypeOther || "").trim()
    ) {
      this.invalidate(
        "customerTypeOther",
        "Customer type is required when Other is selected"
      );
    }

    if (
      this.gstType === "other" &&
      !String(this.gstTypeOther || "").trim()
    ) {
      this.invalidate(
        "gstTypeOther",
        "GST type is required when Other is selected"
      );
    }

    if (
      this.balanceType === "other" &&
      !String(this.balanceTypeOther || "").trim()
    ) {
      this.invalidate(
        "balanceTypeOther",
        "Balance type is required when Other is selected"
      );
    }

    if (
      this.preferredMode === "other" &&
      !String(this.preferredModeOther || "").trim()
    ) {
      this.invalidate(
        "preferredModeOther",
        "Preferred mode is required when Other is selected"
      );
    }

    if (
      this.status === "other" &&
      !String(this.statusOther || "").trim()
    ) {
      this.invalidate(
        "statusOther",
        "Customer status is required when Other is selected"
      );
    }
  }
);

export const LogisticsCustomer =
  mongoose.model(
    "LogisticsCustomer",
    logisticsCustomerSchema
  );

export default LogisticsCustomer;