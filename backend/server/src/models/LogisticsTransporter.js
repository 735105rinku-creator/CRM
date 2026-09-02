import mongoose from "mongoose";

export const LOGISTICS_TRANSPORTER_STATUSES = Object.freeze([
  "active",
  "inactive",
  "blocked",
  "other",
]);

const bankSchema = new mongoose.Schema(
  {
    bankName: { type: String, trim: true, default: "" },
    accountHolderName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    ifscCode: { type: String, trim: true, uppercase: true, default: "" },
    branchName: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const logisticsTransporterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    transporterCode: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },
    transporterName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 200,
      index: true,
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
    address: {
      type: String,
      trim: true,
      required: true,
      maxlength: 1000,
    },
    city: { type: String, trim: true, default: "", maxlength: 120 },
    state: { type: String, trim: true, default: "", maxlength: 120 },
    country: { type: String, trim: true, default: "India", maxlength: 120 },
    pincode: { type: String, trim: true, default: "", maxlength: 20 },
    serviceType: {
      type: String,
      enum: ["local", "domestic", "international", "all", "other"],
      default: "domestic",
    },
    serviceTypeOther: { type: String, trim: true, default: "" },
    vehicleTypes: { type: [String], default: [] },
    defaultDriverName: { type: String, trim: true, default: "" },
    defaultDriverMobile: { type: String, trim: true, default: "" },
    defaultVehicleNumber: { type: String, trim: true, uppercase: true, default: "" },
    paymentTerms: { type: String, trim: true, default: "", maxlength: 500 },
    creditDays: { type: Number, min: 0, default: 0 },
    bankDetails: { type: bankSchema, default: () => ({}) },
    status: {
      type: String,
      enum: LOGISTICS_TRANSPORTER_STATUSES,
      default: "active",
      index: true,
    },
    statusOther: { type: String, trim: true, default: "" },
    remarks: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 3000,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdByEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

logisticsTransporterSchema.index(
  { companyId: 1, transporterCode: 1 },
  { unique: true }
);

logisticsTransporterSchema.index({
  companyId: 1,
  transporterName: 1,
  isActive: 1,
});

logisticsTransporterSchema.pre("validate", function () {
  if (
    this.serviceType === "other" &&
    !String(this.serviceTypeOther || "").trim()
  ) {
    this.invalidate(
      "serviceTypeOther",
      "Service type is required when Other is selected"
    );
  }

  if (
    this.status === "other" &&
    !String(this.statusOther || "").trim()
  ) {
    this.invalidate(
      "statusOther",
      "Transporter status is required when Other is selected"
    );
  }
});

export const LogisticsTransporter = mongoose.model(
  "LogisticsTransporter",
  logisticsTransporterSchema
);

export default LogisticsTransporter;