import mongoose from "mongoose";
import { BILLING_PLAN_CODES } from "./BillingPlan.js";

const planOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
      maxlength: 40,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    planCode: {
      type: String,
      enum: [...Object.values(BILLING_PLAN_CODES), "all"],
      default: "all",
      lowercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "flat"],
      default: "percent",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

planOfferSchema.index({ isActive: 1, planCode: 1 });

export const PlanOffer = mongoose.model("PlanOffer", planOfferSchema);