import mongoose from "mongoose";

export const SUPPORT_TICKET_STATUS = Object.freeze({ OPEN: "open", PENDING: "pending", RESOLVED: "resolved", CLOSED: "closed" });
export const SUPPORT_TICKET_PRIORITY = Object.freeze({ LOW: "low", MEDIUM: "medium", HIGH: "high", URGENT: "urgent" });

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
  requesterName: { type: String, trim: true, default: "" },
  requesterEmail: { type: String, trim: true, lowercase: true, default: "" },
  subject: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, default: "", maxlength: 5000 },
  category: { type: String, trim: true, default: "General", index: true },
  priority: { type: String, enum: Object.values(SUPPORT_TICKET_PRIORITY), default: SUPPORT_TICKET_PRIORITY.MEDIUM, index: true },
  status: { type: String, enum: Object.values(SUPPORT_TICKET_STATUS), default: SUPPORT_TICKET_STATUS.OPEN, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  resolutionNote: { type: String, trim: true, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
