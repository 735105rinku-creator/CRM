import Joi from "joi";

const optionalText =
  Joi.string()
    .trim()
    .allow("", null);

const statuses = [
  "pending",
  "partial",
  "paid",
  "hold",
  "cancelled",
  "other",
];

const paymentModes = [
  "bank_transfer",
  "bank-transfer",
  "upi",
  "cheque",
  "cash",
  "card",
  "other",
];

const weightUnits = [
  "kg",
  "mt",
  "ton",
  "lb",
  "other",
];

export const createLogisticsVendorPaymentSchema =
  Joi.object({
    vendorId:
      Joi.string()
        .hex()
        .length(24)
        .required(),

    exportInvoiceNo:
      Joi.string()
        .trim()
        .max(100)
        .required(),

    invoiceDate:
      Joi.date()
        .required(),

    from:
      Joi.string()
        .trim()
        .min(1)
        .max(250)
        .required(),

    vendorInvoiceNo:
      Joi.string()
        .trim()
        .max(100)
        .required(),

    vendorInvoiceDate:
      Joi.date()
        .required(),

    weight:
      Joi.number()
        .min(0)
        .required(),

    weightUnit:
      Joi.string()
        .valid(...weightUnits)
        .default("mt"),

    weightUnitOther:
      optionalText.max(50),

    totalAmount:
      Joi.number()
        .min(0)
        .required(),

    previousAdvance:
      Joi.number()
        .min(0)
        .default(0),

    paidAmount:
      Joi.number()
        .min(0)
        .default(0),

    deduction:
      Joi.number()
        .min(0)
        .default(0),

    status:
      Joi.string()
        .valid(...statuses)
        .default("pending"),

    statusOther:
      optionalText.max(150),

    shipmentId:
      Joi.string()
        .hex()
        .length(24)
        .allow("", null),

    shipmentNumber:
      optionalText.max(60),

    currency:
      Joi.string()
        .trim()
        .min(2)
        .max(10)
        .default("INR"),

    remarks:
      Joi.string()
        .trim()
        .min(2)
        .max(3000)
        .required(),
  })
  .custom((value, helpers) => {
    if (
      value.weightUnit === "other" &&
      !String(value.weightUnitOther || "").trim()
    ) {
      return helpers.message({
        custom:
          "Weight unit is required when Other is selected",
      });
    }

    if (
      value.status === "other" &&
      !String(value.statusOther || "").trim()
    ) {
      return helpers.message({
        custom:
          "Payment status is required when Other is selected",
      });
    }

    const total =
      Number(value.totalAmount || 0);

    const advance =
      Number(value.previousAdvance || 0);

    const paid =
      Number(value.paidAmount || 0);

    const deduction =
      Number(value.deduction || 0);

    if (
      advance + paid + deduction >
      total
    ) {
      return helpers.message({
        custom:
          "Previous Advance + Paid Amount + Deduction cannot exceed Total Amount",
      });
    }

    return value;
  });

export const updateLogisticsVendorPaymentSchema =
  createLogisticsVendorPaymentSchema
    .fork(
      [
        "vendorId",
        "exportInvoiceNo",
        "invoiceDate",
        "from",
        "vendorInvoiceNo",
        "vendorInvoiceDate",
        "weight",
        "totalAmount",
        "remarks",
      ],
      (schema) =>
        schema.optional()
    )
    .min(1);

export const addVendorPaymentTransactionSchema =
  Joi.object({
    amount:
      Joi.number()
        .positive()
        .required(),

    paymentDate:
      Joi.date()
        .required(),

    paymentMode:
      Joi.string()
        .valid(...paymentModes)
        .required(),

    paymentModeOther:
      optionalText.max(150),

    referenceNumber:
      optionalText.max(150),

    remarks:
      Joi.string()
        .trim()
        .min(2)
        .max(3000)
        .required(),
  })
  .custom((value, helpers) => {
    if (
      value.paymentMode === "other" &&
      !String(value.paymentModeOther || "").trim()
    ) {
      return helpers.message({
        custom:
          "Payment mode is required when Other is selected",
      });
    }

    return value;
  });

export const logisticsVendorPaymentQuerySchema =
  Joi.object({
    page:
      Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit:
      Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20),

    search:
      optionalText,

    vendorId:
      Joi.string()
        .hex()
        .length(24)
        .allow("", null),

    status:
      Joi.string()
        .valid(...statuses)
        .allow("", null),

    fromDate:
      Joi.date()
        .allow("", null),

    toDate:
      Joi.date()
        .allow("", null),

    sortBy:
      Joi.string()
        .valid(
          "createdAt",
          "updatedAt",
          "paymentCode",
          "invoiceDate",
          "vendorInvoiceDate",
          "totalAmount",
          "pendingAmount",
          "supplierBalance",
          "status"
        )
        .default("createdAt"),

    sortOrder:
      Joi.string()
        .valid("asc", "desc")
        .default("desc"),
  });
