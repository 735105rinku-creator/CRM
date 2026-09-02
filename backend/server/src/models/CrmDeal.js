import mongoose from "mongoose";

const crmDealSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "CrmLead", default: null, index: true },
  clientName: { type: String, trim: true, required: true },
  value: { type: Number, default: 0 },
  stage: { type: String, trim: true, default: "Proposal" },
  businessCategory: { type: String, trim: true, default: "Vegetables" },
  tradeType: { type: String, trim: true, default: "Sell" },
  commodity: { type: String, trim: true, default: "" },
  quantity: { type: String, trim: true, default: "" },
  originLocation: { type: String, trim: true, default: "" },
  destinationLocation: { type: String, trim: true, default: "" },
  routeType: { type: String, trim: true, default: "Domestic" },
  logisticsRequired: { type: Boolean, default: false },
  shipmentMode: { type: String, trim: true, default: "Road" },
  incoterm: { type: String, trim: true, default: "" },
  expectedClose: { type: Date, default: null },
  notes: { type: String, trim: true, default: "" },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  assignedEmployeeCode: { type: String, trim: true, uppercase: true, default: "", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

crmDealSchema.index({ companyId: 1, createdAt: -1 });

export const CrmDeal = mongoose.model("CrmDeal", crmDealSchema);