import mongoose from "mongoose";

export const LOGISTICS_CHA_STATUSES = Object.freeze([
  "documents_pending",
  "documents_ready",
  "submitted_to_cha",
  "filed",
  "assessment",
  "examination",
  "duty_pending",
  "cleared",
  "hold",
  "query_raised",
  "cancelled",
  "other",
]);

const documentChecklistSchema = new mongoose.Schema(
  {
    invoice: { type: Boolean, default: false },
    packingList: { type: Boolean, default: false },
    certificateOfOrigin: { type: Boolean, default: false },
    shippingBill: { type: Boolean, default: false },
    billOfEntry: { type: Boolean, default: false },
    airwayBill: { type: Boolean, default: false },
    billOfLading: { type: Boolean, default: false },
    other: { type: Boolean, default: false },
  },
  { _id: false }
);

const chargesSchema = new mongoose.Schema(
  {
    customsDuty: { type: Number, min: 0, default: 0 },
    igst: { type: Number, min: 0, default: 0 },
    cess: { type: Number, min: 0, default: 0 },
    chaCharge: { type: Number, min: 0, default: 0 },
    examinationCharge: { type: Number, min: 0, default: 0 },
    miscellaneousCharge: { type: Number, min: 0, default: 0 },
    totalCharges: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: LOGISTICS_CHA_STATUSES,
      required: true,
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
      maxlength: 3000,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const logisticsChaSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    caseNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 60,
    },

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsShipment",
      required: true,
      index: true,
    },

    shipmentNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    shipmentMode: {
      type: String,
      enum: ["air_cargo", "sea_freight", "road", "other"],
      required: true,
      index: true,
    },

    shipmentModeOther: {
      type: String,
      trim: true,
      default: "",
    },

    customerName: {
      type: String,
      trim: true,
      required: true,
    },

    chaVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVendor",
      default: null,
      index: true,
    },

    chaAgent: {
      type: String,
      trim: true,
      required: true,
    },

    chaAgentOther: {
      type: String,
      trim: true,
      default: "",
    },

    customsLocation: {
      type: String,
      trim: true,
      required: true,
    },

    customsLocationOther: {
      type: String,
      trim: true,
      default: "",
    },

    assignedDate: {
      type: Date,
      default: null,
    },

    expectedClearanceDate: {
      type: Date,
      default: null,
    },

    shippingBillNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    shippingBillDate: {
      type: Date,
      default: null,
    },

    billOfEntryNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    billOfEntryDate: {
      type: Date,
      default: null,
    },

    invoiceValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    assessableValue: {
      type: Number,
      min: 0,
      default: 0,
    },

    charges: {
      type: chargesSchema,
      default: () => ({}),
    },

    documents: {
      type: documentChecklistSchema,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: LOGISTICS_CHA_STATUSES,
      default: "documents_pending",
      index: true,
    },

    statusOther: {
      type: String,
      trim: true,
      default: "",
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    remarks: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 3000,
    },

    assignedToEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    createdByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
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

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

logisticsChaSchema.index(
  { companyId: 1, caseNumber: 1 },
  { unique: true }
);

logisticsChaSchema.index(
  { companyId: 1, shipmentId: 1, createdAt: -1 }
);

logisticsChaSchema.index(
  { companyId: 1, status: 1, createdAt: -1 }
);

logisticsChaSchema.pre("validate", function () {
  if (
    this.shipmentMode === "other" &&
    !String(this.shipmentModeOther || "").trim()
  ) {
    this.invalidate(
      "shipmentModeOther",
      "Shipment mode is required when Other is selected"
    );
  }

  if (
    this.chaAgent === "other" &&
    !String(this.chaAgentOther || "").trim()
  ) {
    this.invalidate(
      "chaAgentOther",
      "CHA Agent is required when Other is selected"
    );
  }

  if (
    this.customsLocation === "other" &&
    !String(this.customsLocationOther || "").trim()
  ) {
    this.invalidate(
      "customsLocationOther",
      "Customs Location is required when Other is selected"
    );
  }

  if (
    this.status === "other" &&
    !String(this.statusOther || "").trim()
  ) {
    this.invalidate(
      "statusOther",
      "CHA status is required when Other is selected"
    );
  }

  const charges = this.charges || {};

  charges.totalCharges =
    Number(charges.customsDuty || 0) +
    Number(charges.igst || 0) +
    Number(charges.cess || 0) +
    Number(charges.chaCharge || 0) +
    Number(charges.examinationCharge || 0) +
    Number(charges.miscellaneousCharge || 0);

  this.charges = charges;
});

export const LogisticsCha = mongoose.model(
  "LogisticsCha",
  logisticsChaSchema
);

export default LogisticsCha;