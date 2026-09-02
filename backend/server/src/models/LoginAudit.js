import mongoose from "mongoose";

const loginAuditSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["success", "failed", "locked", "logout"],
      required: true,
    },

    reason: {
      type: String,
      default: "",
    },

    ipAddress: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const LoginAudit = mongoose.model("LoginAudit", loginAuditSchema);