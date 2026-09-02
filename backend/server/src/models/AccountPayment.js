import mongoose from "mongoose";

const accountPaymentSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "AccountInvoice", default: null, index: true },
  payerName: { type: String, trim: true, required: true },
  amount: { type: Number, default: 0 },
  mode: { type: String, trim: true, default: "Bank Transfer" },
  transactionType: { type: String, trim: true, default: "Sell" },
  routeType: { type: String, trim: true, default: "Domestic" },
  status: { type: String, trim: true, default: "Received" },
  paymentDate: { type: Date, default: null },
  reference: { type: String, trim: true, default: "" },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  assignedEmployeeCode: { type: String, trim: true, uppercase: true, default: "", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

accountPaymentSchema.index({ companyId: 1, createdAt: -1 });

export const AccountPayment = mongoose.model("AccountPayment", accountPaymentSchema);
