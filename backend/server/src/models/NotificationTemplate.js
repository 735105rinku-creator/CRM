import mongoose from "mongoose";

export const NOTIFICATION_TEMPLATE_CHANNEL = Object.freeze({ IN_APP: "in_app", EMAIL: "email", SMS: "sms", BOTH: "both" });

const notificationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  code: { type: String, required: true, lowercase: true, trim: true, unique: true },
  channel: { type: String, enum: Object.values(NOTIFICATION_TEMPLATE_CHANNEL), default: NOTIFICATION_TEMPLATE_CHANNEL.IN_APP, index: true },
  subject: { type: String, trim: true, default: "", maxlength: 180 },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  variables: { type: [String], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

export const NotificationTemplate = mongoose.model("NotificationTemplate", notificationTemplateSchema);
