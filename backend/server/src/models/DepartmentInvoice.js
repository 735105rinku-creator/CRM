import mongoose from "mongoose";


/* ============================================================
   DOCUMENT
============================================================ */

const documentSchema =
  new mongoose.Schema(
    {

      label: {
        type: String,
        trim: true,
        default: "Invoice Document",
      },

      fileName: {
        type: String,
        trim: true,
        default: "",
      },

      fileUrl: {
        type: String,
        trim: true,
        default: "",
      },

      filePath: {
        type: String,
        trim: true,
        default: "",
      },

      mimeType: {
        type: String,
        trim: true,
        default: "",
      },

    },
    {
      _id: false,
    }
  );


/* ============================================================
   PAYMENT HISTORY
============================================================ */

const paymentSchema =
  new mongoose.Schema(
    {

      amount: {
        type: Number,
        required: true,
        min: 0.01,
      },

      paymentDate: {
        type: Date,
        required: true,
      },

      paymentReference: {
        type: String,
        trim: true,
        default: "",
      },

      paymentMode: {
        type: String,
        trim: true,
        default: "",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },

      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      recordedByName: {
        type: String,
        trim: true,
        default: "",
      },

      recordedAt: {
        type: Date,
        default: Date.now,
      },

    },
    {
      _id: true,
    }
  );


/* ============================================================
   DEPARTMENT INVOICE
============================================================ */

const schema =
  new mongoose.Schema(
    {

      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },


      /* ========================================================
         SOURCE
      ======================================================== */

      sourceDepartment: {
        type: String,
        enum: [
          "purchase",
          "logistics",
        ],
        required: true,
      },

      sourceModule: {
        type: String,
        enum: [
          "purchase_invoice",
          "logistics_vendor_payment",
          "logistics_invoice",
        ],
        required: true,
      },

      sourceRecordId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },


      /* ========================================================
         INVOICE SNAPSHOT
      ======================================================== */

      invoiceNumber: {
        type: String,
        trim: true,
        required: true,
      },

      partyName: {
        type: String,
        trim: true,
        required: true,
      },

      invoiceDate: {
        type: Date,
        required: true,
      },

      currency: {
        type: String,
        trim: true,
        uppercase: true,
        default: "INR",
      },

      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      documents: {
        type: [
          documentSchema,
        ],
        default: [],
      },


      /* ========================================================
         ACCOUNTS WORKFLOW
      ======================================================== */

      status: {
        type: String,
        enum: [
          "sent",
          "under_review",
          "verified",
          "partially_paid",
          "paid",
          "rejected",
        ],
        default: "sent",
      },


      /* ========================================================
         HANDOFF AUDIT
      ======================================================== */

      sentToAccountsBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      sentToAccountsByEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
      },

      sentToAccountsByName: {
        type: String,
        trim: true,
        default: "",
      },

      sentToAccountsAt: {
        type: Date,
        default: Date.now,
      },


      /* ========================================================
         VERIFICATION AUDIT
      ======================================================== */

      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      verifiedByName: {
        type: String,
        trim: true,
        default: "",
      },

      verifiedAt: {
        type: Date,
        default: null,
      },


      /* ========================================================
         REJECTION AUDIT
      ======================================================== */

      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      rejectedByName: {
        type: String,
        trim: true,
        default: "",
      },

      rejectedAt: {
        type: Date,
        default: null,
      },

      rejectionReason: {
        type: String,
        trim: true,
        default: "",
      },


      /* ========================================================
         ACCOUNTS PAYMENT HISTORY

         Purchase invoices continue using the existing
         PaymentVoucher + PaymentAllocation architecture.

         This embedded payment history is used for supported
         Logistics Accounts-side settlement.
      ======================================================== */

      payments: {
        type: [
          paymentSchema,
        ],
        default: [],
      },

      paidAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      remainingAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      lastPaymentAt: {
        type: Date,
        default: null,
      },

      lastPaymentReference: {
        type: String,
        trim: true,
        default: "",
      },

      lastPaidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      lastPaidByName: {
        type: String,
        trim: true,
        default: "",
      },

      accountsRemarks: {
        type: String,
        trim: true,
        default: "",
      },

    },
    {
      timestamps: true,
      versionKey: false,
      autoCreate: false,
      autoIndex: false,
      collection: "department_invoices",
    }
  );


/* ============================================================
   INDEXES
============================================================ */

schema.index(
  {
    companyId: 1,
    sourceModule: 1,
    sourceRecordId: 1,
  },
  {
    unique: true,
    name: "uq_department_invoice_source",
  }
);


schema.index({
  companyId: 1,
  status: 1,
  sentToAccountsAt: -1,
});


/* ============================================================
   EXPORT
============================================================ */

export default
  mongoose.models.DepartmentInvoice ||
  mongoose.model(
    "DepartmentInvoice",
    schema
  );