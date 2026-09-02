import mongoose from "mongoose";

export const CRM_SETTING_TYPES = Object.freeze({
  LEAD_SOURCE: "lead_source",
  PIPELINE_STAGE: "pipeline_stage",
  MESSAGE_TEMPLATE: "message_template",
});

const crmModuleSettingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(CRM_SETTING_TYPES),
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    channel: {
      type: String,
      enum: ["email", "sms", "both", "none"],
      default: "none",
    },
    subject: {
      type: String,
      trim: true,
      default: "",
      maxlength: 180,
    },
    body: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },
    color: {
      type: String,
      trim: true,
      default: "#2563eb",
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

crmModuleSettingSchema.index({ type: 1, code: 1 }, { unique: true });
crmModuleSettingSchema.index({ type: 1, isActive: 1, sortOrder: 1 });

export const CrmModuleSetting = mongoose.model("CrmModuleSetting", crmModuleSettingSchema);
