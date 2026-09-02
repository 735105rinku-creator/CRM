import mongoose from "mongoose";

export const OFFER_STATUS = Object.freeze({
  DRAFT: "draft",
  SENT: "sent",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
});

const salaryBreakupSchema = new mongoose.Schema(
  {
    basic: { type: Number, default: 0, min: 0 },
    hra: { type: Number, default: 0, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    grossSalary: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, default: 0, min: 0 },
    ctc: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
  },
  { _id: false }
);

const offerLetterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },

    jobOpeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOpening",
      required: true,
      index: true,
    },

    offerNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    joiningDate: {
      type: Date,
      required: true,
    },

    offerDate: {
      type: Date,
      default: Date.now,
    },

    validTill: {
      type: Date,
      default: null,
    },

    probationMonths: {
      type: Number,
      default: 6,
      min: 0,
    },

    noticePeriodDays: {
      type: Number,
      default: 30,
      min: 0,
    },

    salary: {
      type: salaryBreakupSchema,
      default: {},
    },

    offerPdfUrl: {
      type: String,
      trim: true,
      default: "",
    },

    terms: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.DRAFT,
      index: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
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

offerLetterSchema.index({ companyId: 1, offerNumber: 1 }, { unique: true });
offerLetterSchema.index({ companyId: 1, candidateId: 1 });
offerLetterSchema.index({ companyId: 1, status: 1 });

export const OfferLetter = mongoose.model("OfferLetter", offerLetterSchema);