import mongoose from "mongoose";
import { SUPPORT_TICKET_PRIORITY } from "./SupportTicket.js";

const supportCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, lowercase: true, trim: true, unique: true },
  description: { type: String, trim: true, default: "", maxlength: 500 },
  defaultPriority: { type: String, enum: Object.values(SUPPORT_TICKET_PRIORITY), default: SUPPORT_TICKET_PRIORITY.MEDIUM },
  slaHours: { type: Number, default: 24, min: 1 },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

supportCategorySchema.index({ isActive: 1, sortOrder: 1 });
export const SupportCategory = mongoose.model("SupportCategory", supportCategorySchema);
