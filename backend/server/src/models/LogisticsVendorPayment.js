import mongoose from "mongoose";


export const LOGISTICS_VENDOR_PAYMENT_STATUSES = Object.freeze([
  "pending",
  "partial",
  "paid",
  "hold",
  "cancelled",
  "other",
]);


export const LOGISTICS_VENDOR_PAYMENT_MODES = Object.freeze([
  "bank_transfer",
  "upi",
  "cheque",
  "cash",
  "card",
  "other",
]);


export const LOGISTICS_VENDOR_PAYMENT_ACCOUNTS_STATUSES =
  Object.freeze([
    "sent",
    "under_review",
    "verified",
    "partially_paid",
    "paid",
    "rejected",
  ]);


/* ============================================================
   PAYMENT HISTORY

   Existing Logistics payment history.

   Important:
   After Accounts handoff, the service layer will prevent
   Logistics users from directly recording new payments.

   Historical records remain untouched.
============================================================ */

const paymentHistorySchema = new mongoose.Schema(
  {

    amount: {
      type: Number,
      min: 0,
      required: true,
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    paymentMode: {
      type: String,
      enum: LOGISTICS_VENDOR_PAYMENT_MODES,
      required: true,
      default: "bank_transfer",
    },

    paymentModeOther: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    remarks: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 3000,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

  },
  {
    _id: true,
  }
);


/* ============================================================
   PAYMENT PROOF

   This remains PAYMENT PROOF only.

   It must NOT be reused as the vendor invoice/bill document.

   Physical file:
   public/uploads/vendor-payment-proofs/

   MongoDB:
   metadata + URL only.
============================================================ */

const paymentProofSchema = new mongoose.Schema(
  {

    url: {
      type: String,
      trim: true,
      default: "",
    },

    originalName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    mimeType: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    size: {
      type: Number,
      min: 0,
      default: 0,
    },

  },
  {
    _id: false,
  }
);


/* ============================================================
   VENDOR BILL / INVOICE DOCUMENT

   This is separate from paymentProof.

   Purpose:
   - Logistics uploads the vendor invoice/bill once.
   - Accounts receives the SAME stored document reference.
   - No binary/base64/Buffer is stored in MongoDB.
   - MongoDB stores only metadata.

   Physical storage will be handled by upload middleware/service.
============================================================ */

const vendorBillDocumentSchema = new mongoose.Schema(
  {

    fileName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 255,
    },

    originalName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
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
      default: null,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

  },
  {
    _id: false,
    id: false,
  }
);


/* ============================================================
   VENDOR PAYMENT
============================================================ */

const logisticsVendorPaymentSchema = new mongoose.Schema(
  {

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    paymentCode: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
    },


    /* ========================================================
       LOGISTICS MANAGER PAYMENT REGISTER
    ======================================================== */

    serialNumber: {
      type: Number,
      min: 1,
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsVendor",
      required: true,
      index: true,
    },

    vendor: {
      type: String,
      trim: true,
      required: true,
      maxlength: 250,
      index: true,
    },

    exportInvoiceNo: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
      maxlength: 100,
      index: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
    },

    from: {
      type: String,
      trim: true,
      required: true,
      maxlength: 250,
    },

    vendorInvoiceNo: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
      maxlength: 100,
      index: true,
    },

    vendorInvoiceDate: {
      type: Date,
      required: true,
    },

    weight: {
      type: Number,
      min: 0,
      required: true,
    },

    weightUnit: {
      type: String,
      enum: [
        "kg",
        "mt",
        "ton",
        "lb",
        "other",
      ],
      default: "mt",
      required: true,
    },

    weightUnitOther: {
      type: String,
      trim: true,
      default: "",
    },

    totalAmount: {
      type: Number,
      min: 0,
      required: true,
    },

    previousAdvance: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    pendingAmount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    paidAmount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    deduction: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    supplierBalance: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: LOGISTICS_VENDOR_PAYMENT_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },

    statusOther: {
      type: String,
      trim: true,
      default: "",
    },


    /* ========================================================
       OPTIONAL SHIPMENT LINK
    ======================================================== */

    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsShipment",
      default: null,
      index: true,
    },

    shipmentNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      index: true,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      required: true,
      default: "INR",
      maxlength: 10,
    },


    /* ========================================================
       EXISTING LOGISTICS PAYMENT HISTORY
    ======================================================== */

    paymentHistory: {
      type: [paymentHistorySchema],
      default: [],
    },


    /* ========================================================
       EXISTING PAYMENT PROOF

       This is proof that a payment was made.
       It is NOT the vendor invoice.
    ======================================================== */

    paymentProof: {
      type: paymentProofSchema,
      default: undefined,
    },


    /* ========================================================
       VENDOR BILL / INVOICE DOCUMENT

       Separate from paymentProof.

       Accounts will receive the same file URL during handoff.
    ======================================================== */

    vendorBillDocument: {
      type: vendorBillDocumentSchema,
      default: undefined,
    },


    /* ========================================================
       CENTRAL ACCOUNTS HANDOFF / PAYMENT STATE

       DepartmentInvoice becomes the central Accounts authority
       after Logistics hands this record to Accounts.

       These fields are only a synchronized snapshot for
       Logistics display and locking rules.

       They do NOT create journals, ledgers or Accounts vouchers.
    ======================================================== */

    accountsHandoffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentInvoice",
      default: null,
    },

    accountsStatus: {
      type: String,
      enum: LOGISTICS_VENDOR_PAYMENT_ACCOUNTS_STATUSES,
      default: null,
    },

    accountsHandedOffBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    accountsHandedOffAt: {
      type: Date,
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


    /* ========================================================
       REMARKS
    ======================================================== */

    remarks: {
      type: String,
      trim: true,
      required: true,
      minlength: 2,
      maxlength: 3000,
    },


    /* ========================================================
       AUDIT
    ======================================================== */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },


    /*
     * Append-only edit attribution.
     */

    editHistory: {
      type: [
        new mongoose.Schema(
          {

            changedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              default: null,
            },

            changedByName: {
              type: String,
              default: "",
            },

            changedAt: {
              type: Date,
              default: Date.now,
            },

          },
          {
            _id: false,
          }
        )
      ],
      default: [],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

  },
  {
    timestamps: true,
  }
);


/* ============================================================
   INDEXES
============================================================ */

logisticsVendorPaymentSchema.index(
  {
    companyId: 1,
    paymentCode: 1,
  },
  {
    unique: true,
  }
);


logisticsVendorPaymentSchema.index({
  companyId: 1,
  vendorId: 1,
  status: 1,
  createdAt: -1,
});


logisticsVendorPaymentSchema.index({
  companyId: 1,
  exportInvoiceNo: 1,
  vendorInvoiceNo: 1,
});


/* ============================================================
   VALIDATION / CALCULATION
============================================================ */

logisticsVendorPaymentSchema.pre(
  "validate",
  function () {


    /* ========================================================
       WEIGHT UNIT "OTHER"
    ======================================================== */

    if (
      this.weightUnit === "other" &&
      !String(
        this.weightUnitOther ||
        ""
      ).trim()
    ) {

      this.invalidate(
        "weightUnitOther",
        "Weight unit is required when Other is selected"
      );

    }


    if (
      this.weightUnit !== "other"
    ) {

      this.weightUnitOther =
        "";

    }


    /* ========================================================
       PAYMENT STATUS "OTHER"
    ======================================================== */

    if (
      this.status === "other" &&
      !String(
        this.statusOther ||
        ""
      ).trim()
    ) {

      this.invalidate(
        "statusOther",
        "Payment status is required when Other is selected"
      );

    }


    if (
      this.status !== "other"
    ) {

      this.statusOther =
        "";

    }


    /* ========================================================
       PAYMENT MODE "OTHER"

       Validate all embedded payment history records.
    ======================================================== */

    for (
      const payment of
      this.paymentHistory ||
      []
    ) {

      if (
        payment.paymentMode === "other" &&
        !String(
          payment.paymentModeOther ||
          ""
        ).trim()
      ) {

        payment.invalidate(
          "paymentModeOther",
          "Payment mode details are required when Other is selected"
        );

      }


      if (
        payment.paymentMode !== "other"
      ) {

        payment.paymentModeOther =
          "";

      }

    }


    /* ========================================================
       PAYMENT CALCULATION

       Existing Logistics calculation remains unchanged for
       non-handoff / historical records.

       Payable =
         Total Amount
         - Previous Advance
         - Deduction

       Balance =
         Payable
         - Paid Amount

       Important:
       Once accountsHandoffId exists, service-layer rules will
       stop Logistics users from recording/changing payment
       state directly.

       Accounts synchronized fields remain separate.
    ======================================================== */

    const total =
      Number(
        this.totalAmount ||
        0
      );


    const advance =
      Number(
        this.previousAdvance ||
        0
      );


    const paid =
      Number(
        this.paidAmount ||
        0
      );


    const deduction =
      Number(
        this.deduction ||
        0
      );


    const balance =
      Math.max(
        0,
        total -
        advance -
        paid -
        deduction
      );


    this.pendingAmount =
      balance;


    this.supplierBalance =
      balance;


    if (
      this.status !== "cancelled" &&
      this.status !== "hold" &&
      this.status !== "other"
    ) {

      if (
        balance <= 0 &&
        total > 0
      ) {

        this.status =
          "paid";

      }
      else if (
        paid > 0 ||
        advance > 0 ||
        deduction > 0
      ) {

        this.status =
          "partial";

      }
      else {

        this.status =
          "pending";

      }

    }

  }
);


/* ============================================================
   MODEL
============================================================ */

export const LogisticsVendorPayment =
  mongoose.models.LogisticsVendorPayment ||
  mongoose.model(
    "LogisticsVendorPayment",
    logisticsVendorPaymentSchema
  );


export default LogisticsVendorPayment;