import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    holidayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["public", "company", "optional", "festival"],
      default: "company",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    holidayColor: {
      type: String,
      trim: true,
      default: "#2563eb",
      match: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    },

    isPaid: {
      type: Boolean,
      default: true,
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

holidaySchema.index({ companyId: 1, date: 1, holidayName: 1 }, { unique: true });
holidaySchema.index({ companyId: 1, type: 1 });

export const Holiday = mongoose.model("Holiday", holidaySchema);
