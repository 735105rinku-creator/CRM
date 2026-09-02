import mongoose from "mongoose";

export const LOGISTICS_WAREHOUSE_STATUSES = Object.freeze([
  "active",
  "inactive",
  "full",
  "maintenance",
  "other",
]);

export const LOGISTICS_WAREHOUSE_RECEIPT_STATUSES = Object.freeze([
  "expected",
  "received",
  "inspection_pending",
  "quality_check",
  "inspected",
  "stored",
  "ready_for_dispatch",
  "dispatched",
  "hold",
  "damaged",
  "cancelled",
  "partially_released",
  "released",
  "rejected",
  "other",
]);

const warehouseAddressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, trim: true, default: "" },
    addressLine2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    pincode: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const warehouseContactSchema = new mongoose.Schema(
  {
    contactPerson: { type: String, trim: true, default: "" },
    mobile: { type: String, trim: true, default: "" },
    alternateMobile: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
  },
  { _id: false }
);

const warehouseStorageSchema = new mongoose.Schema(
  {
    totalCapacity: { type: Number, min: 0, default: 0 },
    occupiedCapacity: { type: Number, min: 0, default: 0 },
    availableCapacity: { type: Number, min: 0, default: 0 },
    capacityUnit: {
      type: String,
      enum: ["sq_ft", "sq_m", "mt", "ton", "pallet", "other"],
      default: "sq_ft",
    },
    capacityUnitOther: { type: String, trim: true, default: "" },

    storageType: {
      type: String,
      enum: [
        "general",
        "cold_storage",
        "bonded",
        "dry",
        "reefer",
        "open_yard",
        "other",
      ],
      default: "general",
    },
    storageTypeOther: { type: String, trim: true, default: "" },

    minTemperature: { type: Number, default: null },
    maxTemperature: { type: Number, default: null },
  },
  { _id: false }
);

const warehouseRateSchema = new mongoose.Schema(
  {
    storageRate: { type: Number, min: 0, default: 0 },
    storageRateUnit: {
      type: String,
      enum: ["per_day", "per_week", "per_month", "per_mt", "per_pallet", "other"],
      default: "per_day",
    },
    storageRateUnitOther: { type: String, trim: true, default: "" },

    inwardHandlingCharge: { type: Number, min: 0, default: 0 },
    outwardHandlingCharge: { type: Number, min: 0, default: 0 },
    loadingCharge: { type: Number, min: 0, default: 0 },
    unloadingCharge: { type: Number, min: 0, default: 0 },
    otherCharge: { type: Number, min: 0, default: 0 },
    otherChargeDescription: { type: String, trim: true, default: "" },
    currency: { type: String, trim: true, uppercase: true, default: "INR" },
  },
  { _id: false }
);

const receiptQualitySchema = new mongoose.Schema(
  {
    expectedQuantity: { type: Number, min: 0, default: 0 },
    receivedQuantity: { type: Number, min: 0, default: 0 },
    acceptedQuantity: { type: Number, min: 0, default: 0 },
    rejectedQuantity: { type: Number, min: 0, default: 0 },
    damagedQuantity: { type: Number, min: 0, default: 0 },

    quantityUnit: { type: String, trim: true, default: "" },

    expectedWeight: { type: Number, min: 0, default: 0 },
    receivedWeight: { type: Number, min: 0, default: 0 },
    weightUnit: {
      type: String,
      enum: ["kg", "mt", "ton", "lb", "other"],
      default: "kg",
    },
    weightUnitOther: { type: String, trim: true, default: "" },

    temperature: { type: Number, default: null },
    humidity: { type: Number, min: 0, default: null },

    batchNumber: { type: String, trim: true, default: "" },
    lotNumber: { type: String, trim: true, default: "" },

    qualityRemarks: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const warehouseReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsShipment",
      required: true,
    },

    shipmentNumber: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },

    customerName: {
      type: String,
      trim: true,
      required: true,
    },

    commodity: {
      type: String,
      trim: true,
      default: "",
    },

    receivedDate: {
      type: Date,
      default: Date.now,
    },

    inwardReference: {
      type: String,
      trim: true,
      default: "",
    },

    outwardReference: {
      type: String,
      trim: true,
      default: "",
    },

    movementType: { type: String, trim: true, default: "inbound" },

    storageType: { type: String, trim: true, default: "general" },

    zone: { type: String, trim: true, default: "" },

    rackLocation: {
      type: String,
      trim: true,
      default: "",
    },

    binLocation: { type: String, trim: true, default: "" },

    quality: {
      type: receiptQualitySchema,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: LOGISTICS_WAREHOUSE_RECEIPT_STATUSES,
      default: "received",
    },

    statusOther: {
      type: String,
      trim: true,
      default: "",
    },

    releasedDate: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      required: true,
      maxlength: 3000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const logisticsWarehouseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    warehouseCode: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },

    warehouseName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 200,
      index: true,
    },

    address: {
      type: warehouseAddressSchema,
      default: () => ({}),
    },

    contact: {
      type: warehouseContactSchema,
      default: () => ({}),
    },

    storage: {
      type: warehouseStorageSchema,
      default: () => ({}),
    },

    rates: {
      type: warehouseRateSchema,
      default: () => ({}),
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    status: {
      type: String,
      enum: LOGISTICS_WAREHOUSE_STATUSES,
      default: "active",
      index: true,
    },

    statusOther: {
      type: String,
      trim: true,
      default: "",
    },

    receipts: {
      type: [warehouseReceiptSchema],
      default: [],
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

logisticsWarehouseSchema.index(
  { companyId: 1, warehouseCode: 1 },
  { unique: true }
);

logisticsWarehouseSchema.index({
  companyId: 1,
  warehouseName: 1,
  isActive: 1,
});

logisticsWarehouseSchema.index({
  companyId: 1,
  "receipts.shipmentNumber": 1,
});

logisticsWarehouseSchema.pre("validate", function () {
  if (
    this.storage?.capacityUnit === "other" &&
    !String(this.storage?.capacityUnitOther || "").trim()
  ) {
    this.invalidate(
      "storage.capacityUnitOther",
      "Capacity unit is required when Other is selected"
    );
  }

  if (
    this.storage?.storageType === "other" &&
    !String(this.storage?.storageTypeOther || "").trim()
  ) {
    this.invalidate(
      "storage.storageTypeOther",
      "Storage type is required when Other is selected"
    );
  }

  if (
    this.rates?.storageRateUnit === "other" &&
    !String(this.rates?.storageRateUnitOther || "").trim()
  ) {
    this.invalidate(
      "rates.storageRateUnitOther",
      "Storage rate unit is required when Other is selected"
    );
  }

  if (
    this.status === "other" &&
    !String(this.statusOther || "").trim()
  ) {
    this.invalidate(
      "statusOther",
      "Warehouse status is required when Other is selected"
    );
  }

  if (this.storage) {
    const total = Number(this.storage.totalCapacity || 0);
    const occupied = Number(this.storage.occupiedCapacity || 0);

    this.storage.availableCapacity =
      Math.max(0, total - occupied);
  }
});

export const LogisticsWarehouse = mongoose.model(
  "LogisticsWarehouse",
  logisticsWarehouseSchema
);

export default LogisticsWarehouse;


