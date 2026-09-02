import mongoose from "mongoose";

const accountInvoiceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  invoiceNumber: { type: String, trim: true, required: true },
  clientName: { type: String, trim: true, required: true },
  amount: { type: Number, default: 0 },
  transactionType: { type: String, trim: true, default: "Sell" },
  businessCategory: { type: String, trim: true, default: "Vegetables" },
  commodity: { type: String, trim: true, default: "" },
  quantity: { type: String, trim: true, default: "" },
  routeType: { type: String, trim: true, default: "Domestic" },
  shipmentMode: { type: String, trim: true, default: "Road" },
  status: { type: String, trim: true, default: "Pending" },
  dueDate: { type: Date, default: null },
  notes: { type: String, trim: true, default: "" },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  assignedEmployeeCode: { type: String, trim: true, uppercase: true, default: "", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

accountInvoiceSchema.index({ companyId: 1, createdAt: -1 });

export const AccountInvoice = mongoose.model("AccountInvoice", accountInvoiceSchema);
