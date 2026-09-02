import mongoose from "mongoose";

const communicationGatewaySettingSchema = new mongoose.Schema({
  provider: { type: String, required: true, lowercase: true, trim: true, unique: true },
  label: { type: String, required: true, trim: true },
  channel: { type: String, enum: ["email", "sms"], required: true, index: true },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: false, index: true },
  isConfigured: { type: Boolean, default: false, index: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

export const CommunicationGatewaySetting = mongoose.model("CommunicationGatewaySetting", communicationGatewaySettingSchema);
