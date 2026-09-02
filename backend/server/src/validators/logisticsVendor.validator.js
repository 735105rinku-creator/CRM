import Joi from "joi";

const optionalText = Joi.string().trim().allow("", null);
const vendorTypes = ["supplier", "service_provider", "cha", "transporter", "warehouse", "freight_forwarder", "other"];
const gstTypes = ["registered", "unregistered", "composition", "overseas", "other"];
const serviceCategories = ["goods", "air_cargo", "air-cargo", "sea_freight", "sea-freight", "road_transport",
  "road-transport", "customs_cha", "customs-cha", "warehouse", "packaging", "insurance", "inspection",
  "multi_service", "multi-service", "other"];
const paymentModes = ["bank_transfer", "bank-transfer", "upi", "cheque", "cash", "card", "other"];
const statuses = ["active", "inactive", "blocked", "other"];

const addressSchema = Joi.object({
  addressLine1: optionalText.max(300), addressLine2: optionalText.max(300),
  city: optionalText.max(120), state: optionalText.max(120),
  country: optionalText.max(120).default("India"), pincode: optionalText.max(20),
}).default({});


const chaServiceLocationSchema = Joi.object({
  locationName: optionalText.max(200),
  locationType: Joi.string().valid("airport", "seaport", "icd", "land_customs_station", "other", "").allow("", null),
  locationCode: optionalText.max(80),
  city: optionalText.max(120),
}).default({});

const chaCommercialSchema = Joi.object({
  defaultClearanceCharge: Joi.number().min(0).default(0),
  documentationCharge: Joi.number().min(0).default(0),
  handlingCharge: Joi.number().min(0).default(0),
  examinationCharge: Joi.number().min(0).default(0),
  gstRate: Joi.number().min(0).max(100).default(18),
}).default({});
const bankSchema = Joi.object({
  accountHolderName: optionalText.max(200), bankName: optionalText.max(200),
  accountNumber: optionalText.max(80), ifscCode: optionalText.max(30),
  branchName: optionalText.max(150), swiftCode: optionalText.max(30),
  upiId: optionalText.max(150),
}).default({});

export const createLogisticsVendorSchema = Joi.object({
  vendorType: Joi.string().valid(...vendorTypes).default("supplier"),
  vendorTypeOther: optionalText.max(150),
  vendorName: Joi.string().trim().min(2).max(250).required(),
  companyName: optionalText.max(250),
  contactPerson: Joi.string().trim().min(2).max(150).required(),
  mobile: Joi.string().trim().min(6).max(30).required(),
  alternateMobile: optionalText.max(30),
  email: Joi.string().trim().email().allow("", null),
  website: optionalText.max(250),
  gstType: Joi.string().valid(...gstTypes).default("registered"),
  gstTypeOther: optionalText.max(150),
  gstNumber: optionalText.max(30), panNumber: optionalText.max(20), iecNumber: optionalText.max(30),
  chaLicenseNumber: optionalText.max(80),
  licenseIssueDate: Joi.date().allow("", null),
  licenseExpiryDate: Joi.date().allow("", null),
  registrationNumber: optionalText.max(80),
  address: addressSchema,
  serviceCategory: Joi.string().valid(...serviceCategories).default("goods"),
  serviceCategoryOther: optionalText.max(150),
  productsServices: Joi.array().items(Joi.string().trim().max(200)).default([]),
  serviceLocations: Joi.array().items(chaServiceLocationSchema).default([]),
  servicesOffered: Joi.array().items(Joi.string().trim().max(120)).default([]),
  chaCommercial: chaCommercialSchema,

  paymentTerms: Joi.string().trim().min(1).max(120).required(),
  paymentTermsOther: optionalText.max(120),
  creditDays: Joi.number().integer().min(0).required(),
  openingPayable: Joi.number().min(0).required(),
  currency: Joi.string().trim().min(2).max(10).required(),
  preferredPaymentMode: Joi.string().valid(...paymentModes).required(),
  preferredPaymentModeOther: optionalText.max(150),
  bankDetails: bankSchema.required(),

  status: Joi.string().valid(...statuses).default("active"),
  statusOther: optionalText.max(150),
  remarks: Joi.string().trim().min(2).max(3000).required(),
}).custom((value, helpers) => {
  const rules = [
    ["vendorType", "vendorTypeOther", "Vendor type"],
    ["gstType", "gstTypeOther", "GST type"],
    ["serviceCategory", "serviceCategoryOther", "Service category"],
    ["paymentTerms", "paymentTermsOther", "Payment terms"],
    ["preferredPaymentMode", "preferredPaymentModeOther", "Preferred payment mode"],
    ["status", "statusOther", "Vendor status"],
  ];
  for (const [field, otherField, label] of rules) {
    if (value[field] === "other" && !String(value[otherField] || "").trim()) {
      return helpers.message({ custom: `${label} is required when Other is selected` });
    }
  }
  return value;
});

export const updateLogisticsVendorSchema = createLogisticsVendorSchema.fork(
  ["vendorName", "contactPerson", "mobile", "paymentTerms", "creditDays", "openingPayable",
   "currency", "preferredPaymentMode", "bankDetails", "remarks"],
  (schema) => schema.optional()
).min(1);

export const logisticsVendorQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: optionalText,
  vendorType: Joi.string().valid(...vendorTypes).allow("", null),
  serviceCategory: Joi.string().valid(...serviceCategories).allow("", null),
  status: Joi.string().valid(...statuses).allow("", null),
  fromDate: Joi.date().allow(null, ""),
  toDate: Joi.date().allow(null, ""),
  sortBy: Joi.string().valid("createdAt", "updatedAt", "vendorCode", "vendorName",
    "status", "openingPayable", "creditDays").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
