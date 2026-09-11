import mongoose from "mongoose";

export const PURCHASE_INVOICE_STATUSES = ["received", "matched", "exception", "verified"];
export const PURCHASE_INVOICE_HANDOFF_STATUSES = ["not_handed_off", "handing_off", "handed_off", "failed"];

const purchaseInvoiceItemSchema = new mongoose.Schema({
  purchaseOrderItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemName: { type: String, trim: true, required: true },
  unit: { type: String, trim: true, required: true },
  invoicedQuantity: { type: Number, min: 0.000001, required: true },
  unitPrice: { type: Number, min: 0, required: true },
  taxableAmount: { type: Number, min: 0, required: true },
  taxPercent: { type: Number, min: 0, max: 100, default: 0 },
  taxAmount: { type: Number, min: 0, required: true },
  lineTotal: { type: Number, min: 0, required: true },
  poQuantity: { type: Number, min: 0, required: true },
  receivedQuantity: { type: Number, min: 0, required: true },
  poUnitPrice: { type: Number, min: 0, required: true },
  matchStatus: { type: String, enum: ["matched", "exception"], required: true },
  mismatchReasons: { type: [String], default: [] },
}, { _id: true, id: false });

const purchaseInvoiceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "LogisticsVendor", required: true },
  vendorName: { type: String, trim: true, required: true },
  vendorCode: { type: String, trim: true, default: "" },
  purchaseRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseRequest", default: null },
  vendorEnquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "VendorEnquiry", default: null },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseQuotation", default: null },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
  poNumber: { type: String, trim: true, required: true },
  goodsReceiptIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "GoodsReceipt" }],
  grnNumbers: { type: [String], default: [] },
  vendorInvoiceNumber: { type: String, trim: true, uppercase: true, required: true },
  invoiceDate: { type: Date, required: true },
  receivedDate: { type: Date, required: true, default: Date.now },
  items: { type: [purchaseInvoiceItemSchema], required: true },
  taxableAmount: { type: Number, min: 0, required: true },
  taxTotal: { type: Number, min: 0, required: true },
  freightCharges: { type: Number, min: 0, default: 0 },
  otherCharges: { type: Number, min: 0, default: 0 },
  invoiceTotal: { type: Number, min: 0, required: true },
  declaredInvoiceTotal: { type: Number, min: 0, required: true },
  remarks: { type: String, trim: true, maxlength: 1500, default: "" },
  status: { type: String, enum: PURCHASE_INVOICE_STATUSES, required: true },
  matchStatus: { type: String, enum: ["matched", "exception"], required: true },
  mismatchReasons: { type: [String], default: [] },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  verifiedAt: { type: Date, default: null },
  handoffStatus: { type: String, enum: PURCHASE_INVOICE_HANDOFF_STATUSES, default: "not_handed_off" },
  accountsVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
  accountsVoucherNumber: { type: String, trim: true, default: "" },
  handedOffBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  handedOffAt: { type: Date, default: null },
  handoffError: { type: String, trim: true, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, {
  timestamps: true,
  versionKey: false,
  autoCreate: false,
  autoIndex: false,
  collection: "purchase_invoices",
});

purchaseInvoiceSchema.index({ companyId: 1, vendorId: 1, vendorInvoiceNumber: 1 }, { unique: true, name: "company_vendor_invoice_unique" });
purchaseInvoiceSchema.index({ companyId: 1, invoiceDate: -1, status: 1 });
purchaseInvoiceSchema.index({ companyId: 1, purchaseOrderId: 1 });

export default mongoose.models.PurchaseInvoice || mongoose.model("PurchaseInvoice", purchaseInvoiceSchema);
