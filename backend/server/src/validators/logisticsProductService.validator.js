import Joi from "joi";

const optionalText =
  Joi.string().trim().allow("", null);

const itemTypes = [
  "product",
  "service",
  "other",
];

const statuses = [
  "active",
  "inactive",
  "archived",
  "other",
];

const units = [
  "kg",
  "mt",
  "ton",
  "piece",
  "box",
  "bag",
  "container",
  "shipment",
  "hour",
  "day",
  "service",
  "other",
];

const serviceModes = [
  "air_cargo",
  "air-cargo",
  "sea_freight",
  "sea-freight",
  "road_transport",
  "road-transport",
  "customs_cha",
  "customs-cha",
  "warehouse",
  "documentation",
  "insurance",
  "handling",
  "multi_mode",
  "multi-mode",
  "not_applicable",
  "not-applicable",
  "other",
];

export const createLogisticsProductServiceSchema =
  Joi.object({
    itemType:
      Joi.string()
        .valid(...itemTypes)
        .required(),

    itemTypeOther:
      optionalText.max(150),

    name:
      Joi.string()
        .trim()
        .min(2)
        .max(250)
        .required(),

    category:
      Joi.string()
        .trim()
        .min(1)
        .max(150)
        .required(),

    categoryOther:
      optionalText.max(150),

    description:
      optionalText.max(3000),

    sku:
      optionalText.max(100),

    hsnSacCode:
      optionalText.max(30),

    unit:
      Joi.string()
        .valid(...units)
        .required(),

    unitOther:
      optionalText.max(100),

    costPrice:
      Joi.number()
        .min(0)
        .default(0),

    salePrice:
      Joi.number()
        .min(0)
        .required(),

    taxPercent:
      Joi.number()
        .min(0)
        .max(100)
        .default(0),

    currency:
      Joi.string()
        .trim()
        .min(2)
        .max(10)
        .default("INR"),

    vendorId:
      Joi.string()
        .hex()
        .length(24)
        .allow("", null),

    vendorName:
      optionalText.max(250),

    serviceMode:
      Joi.string()
        .valid(...serviceModes)
        .default("not_applicable"),

    serviceModeOther:
      optionalText.max(150),

    status:
      Joi.string()
        .valid(...statuses)
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
  .custom((value, helpers) => {
    const rules = [
      ["itemType", "itemTypeOther", "Item type"],
      ["category", "categoryOther", "Category"],
      ["unit", "unitOther", "Unit"],
      ["serviceMode", "serviceModeOther", "Service mode"],
      ["status", "statusOther", "Status"],
    ];

    for (const [field, otherField, label] of rules) {
      if (
        value[field] === "other" &&
        !String(value[otherField] || "").trim()
      ) {
        return helpers.message({
          custom:
            `${label} is required when Other is selected`,
        });
      }
    }

    return value;
  });

export const updateLogisticsProductServiceSchema =
  createLogisticsProductServiceSchema
    .fork(
      [
        "itemType",
        "name",
        "category",
        "unit",
        "salePrice",
        "remarks",
      ],
      (schema) =>
        schema.optional()
    )
    .min(1);

export const logisticsProductServiceQuerySchema =
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

    itemType:
      Joi.string()
        .valid(...itemTypes)
        .allow("", null),

    category:
      optionalText,

    status:
      Joi.string()
        .valid(...statuses)
        .allow("", null),

    vendorId:
      Joi.string()
        .hex()
        .length(24)
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
          "itemCode",
          "name",
          "salePrice",
          "status"
        )
        .default("createdAt"),

    sortOrder:
      Joi.string()
        .valid("asc", "desc")
        .default("desc"),
  });
