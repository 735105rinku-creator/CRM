import Joi from "joi";

const optionalText =
  Joi.string()
    .trim()
    .allow("", null);

const customerTypes = [
  "company",
  "individual",
  "exporter",
  "importer",
  "both",
  "other",
];

const customerStatuses = [
  "active",
  "inactive",
  "blocked",
  "other",
];

const gstTypes = [
  "registered",
  "unregistered",
  "composition",
  "overseas",
  "other",
];

const balanceTypes = [
  "receivable",
  "payable",
  "zero",
  "other",
];

const preferredModes = [
  "air_cargo",
  "air-cargo",
  "sea_freight",
  "sea-freight",
  "road",
  "multi_mode",
  "multi-mode",
  "other",
];

const addressSchema =
  Joi.object({
    addressLine1:
      optionalText.max(300),

    addressLine2:
      optionalText.max(300),

    city:
      optionalText.max(120),

    state:
      optionalText.max(120),

    country:
      optionalText.max(120).default("India"),

    pincode:
      optionalText.max(20),
  }).default({});

export const createLogisticsCustomerSchema =
  Joi.object({
    customerType:
      Joi.string()
        .valid(...customerTypes)
        .default("company"),

    customerTypeOther:
      optionalText.max(150),

    customerName:
      Joi.string()
        .trim()
        .min(2)
        .max(250)
        .required(),

    companyName:
      optionalText.max(250),

    contactPerson:
      Joi.string()
        .trim()
        .min(2)
        .max(150)
        .required(),

    mobile:
      Joi.string()
        .trim()
        .min(6)
        .max(30)
        .required(),

    alternateMobile:
      optionalText.max(30),

    email:
      Joi.string()
        .trim()
        .email()
        .allow("", null),

    gstType:
      Joi.string()
        .valid(...gstTypes)
        .default("registered"),

    gstTypeOther:
      optionalText.max(150),

    gstNumber:
      optionalText.max(30),

    panNumber:
      optionalText.max(20),

    iecNumber:
      optionalText.max(30),

    billingAddress:
      addressSchema,

    shippingAddress:
      addressSchema,

    pickupAddress:
      addressSchema,

    sameAsBilling:
      Joi.boolean().default(false),

    paymentTerms:
      optionalText.max(120).default("30 Days"),

    paymentTermsOther:
      optionalText.max(120),

    creditLimit:
      Joi.number().min(0).default(0),

    openingBalance:
      Joi.number().default(0),

    balanceType:
      Joi.string()
        .valid(...balanceTypes)
        .default("receivable"),

    balanceTypeOther:
      optionalText.max(150),

    currency:
      optionalText.max(10).default("INR"),

    salesPerson:
      optionalText.max(150),

    preferredMode:
      Joi.string()
        .valid(...preferredModes)
        .default("multi_mode"),

    preferredModeOther:
      optionalText.max(150),

    status:
      Joi.string()
        .valid(...customerStatuses)
        .default("active"),

    statusOther:
      optionalText.max(150),

    remarks:
      Joi.string()
        .trim()
        .min(2)
        .max(3000)
        .required(),
  })
  .custom(
    (value, helpers) => {
      if (
        value.customerType === "other" &&
        !String(value.customerTypeOther || "").trim()
      ) {
        return helpers.message({
          custom:
            "Customer type is required when Other is selected",
        });
      }

      if (
        value.gstType === "other" &&
        !String(value.gstTypeOther || "").trim()
      ) {
        return helpers.message({
          custom:
            "GST type is required when Other is selected",
        });
      }

      if (
        value.balanceType === "other" &&
        !String(value.balanceTypeOther || "").trim()
      ) {
        return helpers.message({
          custom:
            "Balance type is required when Other is selected",
        });
      }

      if (
        value.preferredMode === "other" &&
        !String(value.preferredModeOther || "").trim()
      ) {
        return helpers.message({
          custom:
            "Preferred mode is required when Other is selected",
        });
      }

      if (
        value.status === "other" &&
        !String(value.statusOther || "").trim()
      ) {
        return helpers.message({
          custom:
            "Customer status is required when Other is selected",
        });
      }

      return value;
    }
  );

export const updateLogisticsCustomerSchema =
  createLogisticsCustomerSchema
    .fork(
      [
        "customerName",
        "contactPerson",
        "mobile",
        "remarks",
      ],
      (schema) =>
        schema.optional()
    )
    .min(1);

export const logisticsCustomerQuerySchema =
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
        .max(500)
        .default(20),

    search:
      optionalText,

    customerType:
      Joi.string()
        .valid(...customerTypes)
        .allow("", null),

    status:
      Joi.string()
        .valid(...customerStatuses)
        .allow("", null),

    fromDate:
      Joi.date()
        .allow(null, ""),

    toDate:
      Joi.date()
        .allow(null, ""),

    sortBy:
      Joi.string()
        .valid(
          "createdAt",
          "updatedAt",
          "customerCode",
          "customerName",
          "status",
          "creditLimit"
        )
        .default("createdAt"),

    sortOrder:
      Joi.string()
        .valid("asc", "desc")
        .default("desc"),
  });
