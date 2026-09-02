import mongoose from "mongoose";

export const BILLING_PLAN_CODES = Object.freeze({
  BASIC: "basic",
  STANDARD: "standard",
  BUSINESS: "business",
});

const billingPlanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: Object.values(BILLING_PLAN_CODES),
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    priceInr: {
      type: Number,
      required: true,
      min: 1,
    },
    durationMonths: {
      type: Number,
      default: 1,
      min: 1,
    },
    employeeLimit: {
      type: Number,
      required: true,
      min: -1,
    },
    hrAccountLimit: {
      type: Number,
      required: true,
      min: -1,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export const BillingPlan = mongoose.model("BillingPlan", billingPlanSchema);