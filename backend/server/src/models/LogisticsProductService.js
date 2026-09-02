import mongoose from "mongoose";

export const LOGISTICS_ITEM_TYPES = Object.freeze([
  "product",
  "service",
  "other",
]);

export const LOGISTICS_ITEM_STATUSES = Object.freeze([
  "active",
  "inactive",
  "archived",
  "other",
]);

const logisticsProductServiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    itemCode: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },

    itemType: {
      type: String,
      enum: LOGISTICS_ITEM_TYPES,
      required: true,
      index: true,
    },

    itemTypeOther: {
      type: String,
      trim: true,
      default: "",
    },

    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 250,
      index: true,
    },

    category: {
      type: String,
      trim: true,
      required: true,
      maxlength: 150,
      index: true,
    },

    categoryOther: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: 100,
    },

    hsnSacCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: 30,
    },

    unit: {
      type: String,
      enum: [
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
      ],
      required: true,
      default: "service",
    },

    unitOther: {
      type: String,
      trim: true,
      default: "",
    },

    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    salePrice: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    taxPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
      maxlength: 10,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVendor",
      default: null,
      index: true,
    },

    vendorName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250,
    },

    serviceMode: {
      type: String,
      enum: [
        "air_cargo",
        "sea_freight",
        "road_transport",
        "customs_cha",
        "warehouse",
        "documentation",
        "insurance",
        "handling",
        "multi_mode",
        "not_applicable",
        "other",
      ],
      default: "not_applicable",
    },

    serviceModeOther: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: LOGISTICS_ITEM_STATUSES,
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
  { timestamps: true }
);

logisticsProductServiceSchema.index(
  { companyId: 1, itemCode: 1 },
  { unique: true }
);

logisticsProductServiceSchema.index({
  companyId: 1,
  itemType: 1,
  category: 1,
  status: 1,
  isActive: 1,
});

logisticsProductServiceSchema.pre("validate", function () {
  const otherRules = [
    ["itemType", "itemTypeOther", "Item type"],
    ["category", "categoryOther", "Category"],
    ["unit", "unitOther", "Unit"],
    ["serviceMode", "serviceModeOther", "Service mode"],
    ["status", "statusOther", "Status"],
  ];

  for (const [field, otherField, label] of otherRules) {
    if (
      this[field] === "other" &&
      !String(this[otherField] || "").trim()
    ) {
      this.invalidate(
        otherField,
        `${label} is required when Other is selected`
      );
    }
  }
});

export const LogisticsProductService = mongoose.model(
  "LogisticsProductService",
  logisticsProductServiceSchema
);

export default LogisticsProductService;
