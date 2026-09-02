import mongoose from "mongoose";

export const LOGISTICS_VENDOR_STATUSES = Object.freeze(["active", "inactive", "blocked", "other"]);
export const LOGISTICS_VENDOR_TYPES = Object.freeze([
  "supplier", "service_provider", "cha", "transporter", "warehouse", "freight_forwarder", "other"
]);

const addressSchema = new mongoose.Schema({
  addressLine1: { type: String, trim: true, default: "" },
  addressLine2: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  state: { type: String, trim: true, default: "" },
  country: { type: String, trim: true, default: "India" },
  pincode: { type: String, trim: true, default: "" },
}, { _id: false });

const bankSchema = new mongoose.Schema({
  accountHolderName: { type: String, trim: true, default: "" },
  bankName: { type: String, trim: true, default: "" },
  accountNumber: { type: String, trim: true, default: "" },
  ifscCode: { type: String, trim: true, uppercase: true, default: "" },
  branchName: { type: String, trim: true, default: "" },
  swiftCode: { type: String, trim: true, uppercase: true, default: "" },
  upiId: { type: String, trim: true, default: "" },
}, { _id: false });
const chaServiceLocationSchema = new mongoose.Schema({
  locationName: { type: String, trim: true, default: "" },
  locationType: {
    type: String,
    enum: ["airport", "seaport", "icd", "land_customs_station", "other", ""],
    default: "",
  },
  locationCode: { type: String, trim: true, uppercase: true, default: "" },
  city: { type: String, trim: true, default: "" },
}, { _id: false });

const chaCommercialSchema = new mongoose.Schema({
  defaultClearanceCharge: { type: Number, min: 0, default: 0 },
  documentationCharge: { type: Number, min: 0, default: 0 },
  handlingCharge: { type: Number, min: 0, default: 0 },
  examinationCharge: { type: Number, min: 0, default: 0 },
  gstRate: { type: Number, min: 0, max: 100, default: 18 },
}, { _id: false });
const logisticsVendorSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  vendorCode: { type: String, trim: true, uppercase: true, required: true },
  vendorType: { type: String, enum: LOGISTICS_VENDOR_TYPES, default: "supplier", index: true },
  vendorTypeOther: { type: String, trim: true, default: "" },
  vendorName: { type: String, trim: true, required: true, maxlength: 250, index: true },
  companyName: { type: String, trim: true, default: "", maxlength: 250 },
  contactPerson: { type: String, trim: true, required: true, maxlength: 150 },
  mobile: { type: String, trim: true, required: true, maxlength: 30 },
  alternateMobile: { type: String, trim: true, default: "", maxlength: 30 },
  email: { type: String, trim: true, lowercase: true, default: "", maxlength: 200 },
  website: { type: String, trim: true, default: "", maxlength: 250 },

  gstType: {
    type: String,
    enum: ["registered", "unregistered", "composition", "overseas", "other"],
    default: "registered",
  },
  gstTypeOther: { type: String, trim: true, default: "" },
  gstNumber: { type: String, trim: true, uppercase: true, default: "", maxlength: 30 },
  panNumber: { type: String, trim: true, uppercase: true, default: "", maxlength: 20 },
  iecNumber: { type: String, trim: true, uppercase: true, default: "", maxlength: 30 },
  chaLicenseNumber: { type: String, trim: true, uppercase: true, default: "", maxlength: 80 },
  licenseIssueDate: { type: Date, default: null },
  licenseExpiryDate: { type: Date, default: null },
  registrationNumber: { type: String, trim: true, uppercase: true, default: "", maxlength: 80 },
  address: { type: addressSchema, default: () => ({}) },

  serviceCategory: {
    type: String,
    enum: ["goods", "air_cargo", "sea_freight", "road_transport", "customs_cha",
      "warehouse", "packaging", "insurance", "inspection", "multi_service", "other"],
    default: "goods",
    index: true,
  },
  serviceCategoryOther: { type: String, trim: true, default: "" },
  productsServices: { type: [String], default: [] },
  serviceLocations: { type: [chaServiceLocationSchema], default: [] },
  servicesOffered: { type: [String], default: [] },
  chaCommercial: { type: chaCommercialSchema, default: () => ({}) },

  // Vendor/Supplier payment information is compulsory.
  paymentTerms: { type: String, trim: true, required: true, maxlength: 120 },
  paymentTermsOther: { type: String, trim: true, default: "", maxlength: 120 },
  creditDays: { type: Number, min: 0, required: true, default: 0 },
  openingPayable: { type: Number, min: 0, required: true, default: 0 },
  currency: { type: String, trim: true, uppercase: true, required: true, default: "INR", maxlength: 10 },
  preferredPaymentMode: {
    type: String,
    enum: ["bank_transfer", "upi", "cheque", "cash", "card", "other"],
    required: true,
    default: "bank_transfer",
  },
  preferredPaymentModeOther: { type: String, trim: true, default: "" },
  bankDetails: { type: bankSchema, required: true, default: () => ({}) },

  status: { type: String, enum: LOGISTICS_VENDOR_STATUSES, default: "active", index: true },
  statusOther: { type: String, trim: true, default: "" },

  // Remarks remains compulsory and last in the business form.
  remarks: { type: String, trim: true, required: true, minlength: 2, maxlength: 3000 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdByEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

logisticsVendorSchema.index({ companyId: 1, vendorCode: 1 }, { unique: true });
logisticsVendorSchema.index({ companyId: 1, vendorName: 1, isActive: 1 });
logisticsVendorSchema.index({ companyId: 1, vendorType: 1, status: 1, isActive: 1 });

logisticsVendorSchema.pre("validate", function () {
  const rules = [
    ["vendorType", "vendorTypeOther", "Vendor type"],
    ["gstType", "gstTypeOther", "GST type"],
    ["serviceCategory", "serviceCategoryOther", "Service category"],
    ["paymentTerms", "paymentTermsOther", "Payment terms"],
    ["preferredPaymentMode", "preferredPaymentModeOther", "Preferred payment mode"],
    ["status", "statusOther", "Vendor status"],
  ];

  for (const [field, otherField, label] of rules) {
    if (this[field] === "other" && !String(this[otherField] || "").trim()) {
      this.invalidate(otherField, `${label} is required when Other is selected`);
    }
  }
});

export const LogisticsVendor = mongoose.model("LogisticsVendor", logisticsVendorSchema);
export default LogisticsVendor;
