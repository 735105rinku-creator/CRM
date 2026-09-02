import mongoose from "mongoose";

const crmTaskSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  title: { type: String, trim: true, required: true },
  relatedTo: { type: String, trim: true, default: "" },
  taskType: { type: String, trim: true, default: "Follow-up" },
  businessCategory: { type: String, trim: true, default: "General" },
  routeType: { type: String, trim: true, default: "Domestic" },
  dueDate: { type: Date, default: null },
  priority: { type: String, trim: true, default: "Medium" },
  status: { type: String, trim: true, default: "Open" },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  assignedEmployeeCode: { type: String, trim: true, uppercase: true, default: "", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

crmTaskSchema.index({ companyId: 1, createdAt: -1 });

export const CrmTask = mongoose.model("CrmTask", crmTaskSchema);