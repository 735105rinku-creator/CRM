import mongoose from "mongoose";

export const WAREHOUSE_TYPES = Object.freeze([
  "owned",
  "leased",
  "third_party",
  "bonded",
  "cold_storage",
  "other",
]);

export const WAREHOUSE_STATUSES = Object.freeze([
  "active",
  "inactive",
  "maintenance",
]);

const warehouseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
      index: true,
    },

    type: {
      type: String,
      enum: WAREHOUSE_TYPES,
      default: "owned",
      index: true,
    },

    typeOther: {
      type: String,
      trim: true,
      default: "",
    },

    addressLine1: { type: String, trim: true, default: "" },
    addressLine2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    pincode: { type: String, trim: true, default: "" },

    contactPerson: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },

    capacity: { type: Number, min: 0, default: 0 },
    capacityUnit: {
      type: String,
      enum: ["sq_ft", "sq_m", "mt", "ton", "pallet", "unit", "other"],
      default: "unit",
    },
    capacityUnitOther: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: WAREHOUSE_STATUSES,
      default: "active",
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
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

warehouseSchema.index(
  { companyId: 1, code: 1 },
  { unique: true }
);

warehouseSchema.index({
  companyId: 1,
  name: 1,
  isActive: 1,
});

warehouseSchema.pre("validate", function () {
  if (
    this.type === "other" &&
    !String(this.typeOther || "").trim()
  ) {
    this.invalidate(
      "typeOther",
      "Warehouse type is required when Other is selected"
    );
  }

  if (
    this.capacityUnit === "other" &&
    !String(this.capacityUnitOther || "").trim()
  ) {
    this.invalidate(
      "capacityUnitOther",
      "Capacity unit is required when Other is selected"
    );
  }
});

export const Warehouse = mongoose.model(
  "Warehouse",
  warehouseSchema
);

export default Warehouse;