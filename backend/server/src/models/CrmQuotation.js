import mongoose from "mongoose";

const crmQuotationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  quotationNumber: { type: String, trim: true, required: true },
  clientName: { type: String, trim: true, required: true },
  amount: { type: Number, default: 0 },
  businessCategory: { type: String, trim: true, default: "Vegetables" },
  commodity: { type: String, trim: true, default: "" },
  quantity: { type: String, trim: true, default: "" },
  routeType: { type: String, trim: true, default: "Domestic" },
  shipmentMode: { type: String, trim: true, default: "Road" },
  validUntil: { type: Date, default: null },
  status: { type: String, trim: true, default: "Draft" },
  notes: { type: String, trim: true, default: "" },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  assignedEmployeeCode: { type: String, trim: true, uppercase: true, default: "", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

crmQuotationSchema.index({ companyId: 1, createdAt: -1 });

export const CrmQuotation = mongoose.model("CrmQuotation", crmQuotationSchema);
