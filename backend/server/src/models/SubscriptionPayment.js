import mongoose from "mongoose";

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    planCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    offerCode: {
      type: String,
      trim: true,
      default: "",
    },
    changeType: {
      type: String,
      enum: ["new", "upgrade", "downgrade", "renew"],
      default: "new",
      index: true,
    },
    amountInr: {
      type: Number,
      required: true,
      min: 0,
    },
    discountInr: {
      type: Number,
      default: 0,
      min: 0,
    },
    payableInr: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    durationMonths: {
      type: Number,
      default: 1,
      min: 1,
    },
    gateway: {
      type: String,
      default: "razorpay",
    },
    gatewayMode: {
      type: String,
      enum: ["live", "demo"],
      default: "demo",
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: "",
    },
    razorpaySignature: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export const SubscriptionPayment = mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);


