import mongoose from "mongoose";


/* ============================================================
   CONSTANTS
============================================================ */

export const LOGISTICS_DOCUMENT_TYPES =
  Object.freeze([
    "commercial-invoice",
    "packing-list",
    "awb",
    "bill-of-lading",
    "shipping-bill",
    "bill-of-entry",
    "certificate-origin",
    "insurance",
    "fumigation",
    "phytosanitary",
    "lr",
    "warehouse-receipt",
    "vendor-invoice",
    "customer-invoice",
    "other",
  ]);


export const LOGISTICS_DOCUMENT_STATUSES =
  Object.freeze([
    "valid",
    "pending",
    "expired",
    "rejected",
    "other",
  ]);


/* ============================================================
   SCHEMA
============================================================ */

const logisticsDocumentSchema =
  new mongoose.Schema(
    {
      /* ======================================================
         TENANT / COMPANY
      ====================================================== */

      companyId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Company",

        required:
          true,

        index:
          true,
      },


      /* ======================================================
         SHIPMENT
      ====================================================== */

      shipmentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "LogisticsShipment",

        required:
          true,

        index:
          true,
      },


      shipmentNumber: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        required:
          true,

        index:
          true,
      },


      customerName: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },


      /* ======================================================
         DOCUMENT NUMBER
      ====================================================== */

      documentNumber: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        required:
          true,

        maxlength:
          60,
      },


      /* ======================================================
         DOCUMENT TYPE
      ====================================================== */

      documentType: {
        type:
          String,

        enum:
          LOGISTICS_DOCUMENT_TYPES,

        required:
          true,

        index:
          true,
      },


      documentTypeOther: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      documentTitle: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          250,
      },


      /* ======================================================
         DOCUMENT INFORMATION
      ====================================================== */

      issueDate: {
        type:
          Date,

        default:
          null,
      },


      expiryDate: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },


      issuingAuthority: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          250,
      },


      referenceNumber: {
        type:
          String,

        trim:
          true,

        default:
          "",

        maxlength:
          150,
      },


      /* ======================================================
         FILE INFORMATION
      ====================================================== */

      fileName: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },


      originalFileName: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },


      filePath: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },


      fileUrl: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },


      mimeType: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },


      fileSize: {
        type:
          Number,

        min:
          0,

        required:
          true,
      },


      /* ======================================================
         VERIFICATION
      ====================================================== */

      status: {
        type:
          String,

        enum:
          LOGISTICS_DOCUMENT_STATUSES,

        default:
          "pending",

        index:
          true,
      },


      statusOther: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      verifiedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      verifiedAt: {
        type:
          Date,

        default:
          null,
      },


      /* ======================================================
         REMARKS
      ====================================================== */

      /**
       * Compulsory as requested for Logistics workflows.
       */
      remarks: {
        type:
          String,

        trim:
          true,

        required:
          true,

        minlength:
          2,

        maxlength:
          3000,
      },


      /* ======================================================
         AUDIT
      ====================================================== */

      uploadedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      uploadedByEmployeeId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,
      },


      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      isActive: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },
    },
    {
      timestamps:
        true,
    }
  );


/* ============================================================
   INDEXES
============================================================ */

/*
 * Document numbers only need to be unique inside a company.
 */
logisticsDocumentSchema.index(
  {
    companyId:
      1,

    documentNumber:
      1,
  },

  {
    unique:
      true,
  }
);


logisticsDocumentSchema.index({
  companyId:
    1,

  shipmentId:
    1,

  createdAt:
    -1,
});


logisticsDocumentSchema.index({
  companyId:
    1,

  shipmentNumber:
    1,

  documentType:
    1,
});


logisticsDocumentSchema.index({
  companyId:
    1,

  status:
    1,

  expiryDate:
    1,
});


logisticsDocumentSchema.index({
  companyId:
    1,

  createdAt:
    -1,
});


/* ============================================================
   VALIDATION
============================================================ */

logisticsDocumentSchema.pre(
  "validate",

  function (
    next
  ) {

    /* ========================================================
       DOCUMENT TYPE OTHER
    ======================================================== */

    if (
      this.documentType ===
        "other" &&
      !String(
        this.documentTypeOther ||
        ""
      ).trim()
    ) {

      this.invalidate(
        "documentTypeOther",

        "Document type is required when Other is selected"
      );
    }


    /* ========================================================
       STATUS OTHER
    ======================================================== */

    if (
      this.status ===
        "other" &&
      !String(
        this.statusOther ||
        ""
      ).trim()
    ) {

      this.invalidate(
        "statusOther",

        "Document status is required when Other is selected"
      );
    }


    /* ========================================================
       EXPIRY STATUS
    ======================================================== */

    if (
      this.expiryDate &&
      new Date(
        this.expiryDate
      ).getTime() <
        Date.now() &&
      this.status !==
        "rejected"
    ) {

      this.status =
        "expired";
    }
  }
);


/* ============================================================
   EXPORT
============================================================ */

export const LogisticsDocument =
  mongoose.model(
    "LogisticsDocument",

    logisticsDocumentSchema
  );


export default LogisticsDocument;