import mongoose from "mongoose";

export const PURCHASE_INVOICE_STATUSES = [
  "received",
  "matched",
  "exception",
  "verified",
];

export const PURCHASE_INVOICE_HANDOFF_STATUSES = [
  "not_handed_off",
  "handing_off",
  "handed_off",
  "failed",
];

export const PURCHASE_INVOICE_DOCUMENT_TYPES = [
  "vendor_invoice",
  "e_way_bill",
  "delivery_challan",
  "supporting_document",
  "other",
];

export const PURCHASE_INVOICE_ACCOUNTS_STATUSES = [
  "sent",
  "under_review",
  "verified",
  "partially_paid",
  "paid",
  "rejected",
];


const purchaseInvoiceItemSchema = new mongoose.Schema(
  {

    purchaseOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    itemName: {
      type: String,
      trim: true,
      required: true,
    },

    unit: {
      type: String,
      trim: true,
      required: true,
    },

    invoicedQuantity: {
      type: Number,
      min: 0.000001,
      required: true,
    },

    unitPrice: {
      type: Number,
      min: 0,
      required: true,
    },

    taxableAmount: {
      type: Number,
      min: 0,
      required: true,
    },

    taxPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: 0,
      required: true,
    },

    lineTotal: {
      type: Number,
      min: 0,
      required: true,
    },

    poQuantity: {
      type: Number,
      min: 0,
      required: true,
    },

    receivedQuantity: {
      type: Number,
      min: 0,
      required: true,
    },

    poUnitPrice: {
      type: Number,
      min: 0,
      required: true,
    },

    matchStatus: {
      type: String,
      enum: [
        "matched",
        "exception",
      ],
      required: true,
    },

    mismatchReasons: {
      type: [String],
      default: [],
    },

  },
  {
    _id: true,
    id: false,
  }
);


/* ============================================================
   PURCHASE INVOICE ATTACHMENT

   Stores document metadata only.

   The actual file should be stored by the project's existing
   file storage / upload implementation.

   Purchase and Accounts can reference the same attachment URL.
============================================================ */

const purchaseInvoiceAttachmentSchema = new mongoose.Schema(
  {

    documentType: {
      type: String,
      enum: PURCHASE_INVOICE_DOCUMENT_TYPES,
      required: true,
      default: "vendor_invoice",
    },

    otherDocumentType: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    fileName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 255,
    },

    originalName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 255,
    },

    fileUrl: {
      type: String,
      trim: true,
      required: true,
      maxlength: 2000,
    },

    storageKey: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    mimeType: {
      type: String,
      trim: true,
      required: true,
      maxlength: 150,
    },

    fileSize: {
      type: Number,
      min: 0,
      default: 0,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

  },
  {
    _id: true,
    id: false,
  }
);


purchaseInvoiceAttachmentSchema.pre(
  "validate",
  function validateOtherDocumentType() {

    if (
      this.documentType === "other" &&
      !String(
        this.otherDocumentType ||
        ""
      ).trim()
    ) {

      throw new Error(
        "Other document type details are required."
      );

    }


    if (
      this.documentType !== "other"
    ) {

      this.otherDocumentType = "";

    }

  }
);


const purchaseInvoiceSchema = new mongoose.Schema(
  {

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVendor",
      required: true,
    },

    vendorName: {
      type: String,
      trim: true,
      required: true,
    },

    vendorCode: {
      type: String,
      trim: true,
      default: "",
    },

    purchaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
      default: null,
    },

    vendorEnquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorEnquiry",
      default: null,
    },

    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseQuotation",
      default: null,
    },

    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },

    poNumber: {
      type: String,
      trim: true,
      required: true,
    },

    goodsReceiptIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GoodsReceipt",
      },
    ],

    grnNumbers: {
      type: [String],
      default: [],
    },

    vendorInvoiceNumber: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
    },

    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    items: {
      type: [purchaseInvoiceItemSchema],
      required: true,
    },

    taxableAmount: {
      type: Number,
      min: 0,
      required: true,
    },

    taxTotal: {
      type: Number,
      min: 0,
      required: true,
    },

    freightCharges: {
      type: Number,
      min: 0,
      default: 0,
    },

    otherCharges: {
      type: Number,
      min: 0,
      default: 0,
    },

    invoiceTotal: {
      type: Number,
      min: 0,
      required: true,
    },

    declaredInvoiceTotal: {
      type: Number,
      min: 0,
      required: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: "",
    },


    /* ========================================================
       DOCUMENT ATTACHMENTS

       Examples:
       - supplier/vendor invoice
       - e-way bill
       - delivery challan
       - supporting documents

       Existing records remain valid because default is [].
    ======================================================== */

    attachments: {
      type: [purchaseInvoiceAttachmentSchema],
      default: [],
    },


    status: {
      type: String,
      enum: PURCHASE_INVOICE_STATUSES,
      required: true,
    },

    matchStatus: {
      type: String,
      enum: [
        "matched",
        "exception",
      ],
      required: true,
    },

    mismatchReasons: {
      type: [String],
      default: [],
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    handoffStatus: {
      type: String,
      enum: PURCHASE_INVOICE_HANDOFF_STATUSES,
      default: "not_handed_off",
    },

    accountsVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },

    accountsVoucherNumber: {
      type: String,
      trim: true,
      default: "",
    },

    handedOffBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    handedOffAt: {
      type: Date,
      default: null,
    },

    handoffError: {
      type: String,
      trim: true,
      default: "",
    },


    /* ========================================================
       CENTRAL ACCOUNTS INVOICE REGISTER

       These fields mirror the Accounts DepartmentInvoice state.

       Important:
       - They do NOT replace the existing Purchase voucher flow.
       - Actual Purchase settlement remains derived from posted
         Payment Voucher + PaymentAllocation.
       - No accounting ledger/journal/payment logic is stored
         here.
    ======================================================== */

    accountsHandoffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentInvoice",
      default: null,
    },

    accountsStatus: {
      type: String,
      enum: PURCHASE_INVOICE_ACCOUNTS_STATUSES,
      default: null,
    },

    accountsPaidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    accountsRemainingAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    accountsPaymentDate: {
      type: Date,
      default: null,
    },

    accountsPaymentReference: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },

    accountsPaidByName: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },


    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

  },
  {

    timestamps: true,

    versionKey: false,

    autoCreate: false,

    autoIndex: false,

    collection: "purchase_invoices",

  }
);


purchaseInvoiceSchema.index(
  {
    companyId: 1,
    vendorId: 1,
    vendorInvoiceNumber: 1,
  },
  {
    unique: true,
    name: "company_vendor_invoice_unique",
  }
);


purchaseInvoiceSchema.index({
  companyId: 1,
  invoiceDate: -1,
  status: 1,
});


purchaseInvoiceSchema.index({
  companyId: 1,
  purchaseOrderId: 1,
});


export default (
  mongoose.models.PurchaseInvoice ||
  mongoose.model(
    "PurchaseInvoice",
    purchaseInvoiceSchema
  )
);