import mongoose from "mongoose";

const crmLeadSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  name: { type: String, trim: true, required: true },
  company: { type: String, trim: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, default: "" },
  address: { type: String, trim: true, default: "" },
  price: { type: Number, default: 0 },
  priceType: { type: String, trim: true, default: "per kg" },
  packagingOption: { type: String, trim: true, default: "No" },
  source: { type: String, trim: true, default: "Website" },
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
  status: { type: String, trim: true, default: "New" },
  notes: { type: String, trim: true, default: "" },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  assignedEmployeeCode: { type: String, trim: true, uppercase: true, default: "", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

crmLeadSchema.index({ companyId: 1, createdAt: -1 });

export const CrmLead = mongoose.model("CrmLead", crmLeadSchema);