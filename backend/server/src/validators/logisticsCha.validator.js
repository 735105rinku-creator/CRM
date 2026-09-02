import Joi from "joi";

const optionalText = Joi.string().trim().allow("", null);

const shipmentModes = [
  "air_cargo",
  "air-cargo",
  "sea_freight",
  "sea-freight",
  "road",
  "other",
];

const statuses = [
  "documents_pending",
  "documents-pending",
  "documents_ready",
  "documents-ready",
  "submitted_to_cha",
  "submitted-to-cha",
  "filed",
  "assessment",
  "examination",
  "duty_pending",
  "duty-pending",
  "cleared",
  "hold",
  "query_raised",
  "query-raised",
  "cancelled",
  "other",
];

const documentsSchema = Joi.object({
  invoice: Joi.boolean().default(false),
  packingList: Joi.boolean().default(false),
  certificateOfOrigin: Joi.boolean().default(false),
  shippingBill: Joi.boolean().default(false),
  billOfEntry: Joi.boolean().default(false),
  airwayBill: Joi.boolean().default(false),
  billOfLading: Joi.boolean().default(false),
  other: Joi.boolean().default(false),
}).default({});

const chargesSchema = Joi.object({
  customsDuty: Joi.number().min(0).default(0),
  igst: Joi.number().min(0).default(0),
  cess: Joi.number().min(0).default(0),
  chaCharge: Joi.number().min(0).default(0),
  examinationCharge: Joi.number().min(0).default(0),
  miscellaneousCharge: Joi.number().min(0).default(0),
}).default({});

export const createLogisticsChaSchema = Joi.object({
  shipmentType: Joi.string().valid(...shipmentModes).required(),
  shipmentTypeOther: optionalText,
  shipmentId: optionalText.max(80),

  shipmentNo: Joi.string().trim().uppercase().max(60).required(),
  customer: Joi.string().trim().min(2).max(250).required(),

  chaVendorId: optionalText.max(80),
  chaAgent: Joi.string().trim().required(),
  chaAgentOther: optionalText,

  customsLocation: Joi.string().trim().required(),
  customsLocationOther: optionalText,

  assignedDate: Joi.date().allow("", null),
  expectedClearanceDate: Joi.date().allow("", null),

  shippingBillNo: optionalText.max(100),
  shippingBillDate: Joi.date().allow("", null),

  billOfEntryNo: optionalText.max(100),
  billOfEntryDate: Joi.date().allow("", null),

  invoiceValue: Joi.number().min(0).default(0),
  assessableValue: Joi.number().min(0).default(0),

  charges: chargesSchema,

  customsDuty: Joi.number().min(0).optional(),
  igst: Joi.number().min(0).optional(),
  cess: Joi.number().min(0).optional(),
  chaCharge: Joi.number().min(0).optional(),
  examinationCharge: Joi.number().min(0).optional(),
  miscellaneousCharge: Joi.number().min(0).optional(),

  documents: documentsSchema,

  documentInvoice: Joi.boolean().optional(),
  documentPackingList: Joi.boolean().optional(),
  documentCertificateOrigin: Joi.boolean().optional(),
  documentShippingBill: Joi.boolean().optional(),
  documentBillOfEntry: Joi.boolean().optional(),
  documentAirwayBill: Joi.boolean().optional(),
  documentBillOfLading: Joi.boolean().optional(),
  documentOther: Joi.boolean().optional(),

  status: Joi.string().valid(...statuses).default("documents_pending"),
  statusOther: optionalText,

  remarks: Joi.string().trim().min(2).max(3000).required(),
})
.custom((value, helpers) => {
  if (
    ["other"].includes(value.shipmentType) &&
    !String(value.shipmentTypeOther || "").trim()
  ) {
    return helpers.message({
      custom: "Shipment type is required when Other is selected",
    });
  }

  if (
    value.chaAgent === "other" &&
    !String(value.chaAgentOther || "").trim()
  ) {
    return helpers.message({
      custom: "CHA Agent is required when Other is selected",
    });
  }

  if (
    value.customsLocation === "other" &&
    !String(value.customsLocationOther || "").trim()
  ) {
    return helpers.message({
      custom: "Customs Location is required when Other is selected",
    });
  }

  if (
    value.status === "other" &&
    !String(value.statusOther || "").trim()
  ) {
    return helpers.message({
      custom: "CHA status is required when Other is selected",
    });
  }

  return value;
});

export const updateLogisticsChaSchema =
  createLogisticsChaSchema.fork(
    [
      "shipmentType",
      "shipmentNo",
      "customer",
      "chaAgent",
      "customsLocation",
      "remarks",
    ],
    (schema) => schema.optional()
  ).min(1);

export const updateLogisticsChaStatusSchema = Joi.object({
  status: Joi.string().valid(...statuses).required(),
  statusOther: optionalText,
  remarks: Joi.string().trim().min(2).max(3000).required(),
})
.custom((value, helpers) => {
  if (
    value.status === "other" &&
    !String(value.statusOther || "").trim()
  ) {
    return helpers.message({
      custom: "CHA status is required when Other is selected",
    });
  }

  return value;
});

export const logisticsChaQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: optionalText,
  shipmentNo: optionalText,
  shipmentType: Joi.string().valid(...shipmentModes).allow("", null),
  status: Joi.string().valid(...statuses).allow("", null),
  fromDate: Joi.date().allow(null, ""),
  toDate: Joi.date().allow(null, ""),
  sortBy: Joi.string()
    .valid("createdAt", "updatedAt", "caseNumber", "assignedDate", "status")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
