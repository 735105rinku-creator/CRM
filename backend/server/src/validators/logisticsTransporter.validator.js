import Joi from "joi";

const optionalText = Joi.string().trim().allow("", null);

const statuses = ["active", "inactive", "blocked", "other"];
const serviceTypes = ["local", "domestic", "international", "all", "other"];

const bankSchema = Joi.object({
  bankName: optionalText.max(150),
  accountHolderName: optionalText.max(200),
  accountNumber: optionalText.max(60),
  ifscCode: optionalText.max(30),
  branchName: optionalText.max(150),
}).default({});

export const createLogisticsTransporterSchema = Joi.object({
  transporterName: Joi.string().trim().min(2).max(200).required(),
  contactPerson: Joi.string().trim().min(2).max(150).required(),
  mobile: Joi.string().trim().min(6).max(30).required(),
  alternateMobile: optionalText.max(30),
  email: Joi.string().trim().email().allow("", null),
  gstNumber: optionalText.max(30),
  panNumber: optionalText.max(20),
  address: Joi.string().trim().min(3).max(1000).required(),
  city: optionalText.max(120),
  state: optionalText.max(120),
  country: optionalText.max(120).default("India"),
  pincode: optionalText.max(20),
  serviceType: Joi.string().valid(...serviceTypes).default("domestic"),
  serviceTypeOther: optionalText.max(150),
  vehicleTypes: Joi.array().items(Joi.string().trim().max(100)).default([]),
  defaultDriverName: optionalText.max(150),
  defaultDriverMobile: optionalText.max(30),
  defaultVehicleNumber: optionalText.max(40),
  paymentTerms: optionalText.max(500),
  creditDays: Joi.number().integer().min(0).default(0),
  bankDetails: bankSchema,
  status: Joi.string().valid(...statuses).default("active"),
  statusOther: optionalText.max(150),
  remarks: Joi.string().trim().min(2).max(3000).required(),
})
.custom((value, helpers) => {
  if (
    value.serviceType === "other" &&
    !String(value.serviceTypeOther || "").trim()
  ) {
    return helpers.message({
      custom: "Service type is required when Other is selected",
    });
  }

  if (
    value.status === "other" &&
    !String(value.statusOther || "").trim()
  ) {
    return helpers.message({
      custom: "Transporter status is required when Other is selected",
    });
  }

  return value;
});

export const updateLogisticsTransporterSchema =
  createLogisticsTransporterSchema
    .fork(
      ["transporterName", "contactPerson", "mobile", "address", "remarks"],
      (schema) => schema.optional()
    )
    .min(1);

export const logisticsTransporterQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: optionalText,
  status: Joi.string().valid(...statuses).allow("", null),
  serviceType: Joi.string().valid(...serviceTypes).allow("", null),
  fromDate: Joi.date().allow(null, ""),
  toDate: Joi.date().allow(null, ""),
  sortBy: Joi.string()
    .valid("createdAt", "updatedAt", "transporterCode", "transporterName", "status")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
