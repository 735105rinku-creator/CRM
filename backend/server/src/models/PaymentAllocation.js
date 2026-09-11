import mongoose from "mongoose";

const paymentAllocationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  paymentVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", required: true },
  purchaseInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseInvoice", required: true },
  allocatedAmount: { type: Number, required: true, min: 0.01 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, {
  timestamps: true,
  versionKey: false,
  autoCreate: false,
  autoIndex: false,
  collection: "payment_allocations",
});

paymentAllocationSchema.index(
  { companyId: 1, paymentVoucherId: 1, purchaseInvoiceId: 1 },
  { unique: true, name: "company_payment_purchase_invoice_unique" }
);
paymentAllocationSchema.index(
  { companyId: 1, purchaseInvoiceId: 1 },
  { name: "company_purchase_invoice_allocations" }
);

export default mongoose.models.PaymentAllocation || mongoose.model("PaymentAllocation", paymentAllocationSchema);
