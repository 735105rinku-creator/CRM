import mongoose from "mongoose";


/* ============================================================
   CONSTANTS
============================================================ */

export const VENDOR_ENQUIRY_SOURCES = [
  "indiamart",
  "direct_supplier",
  "other",
];


export const VENDOR_ENQUIRY_STATUSES = [
  "draft",
  "requested",
  "received",
  "closed",
  "cancelled",
];


/* ============================================================
   SCHEMA
============================================================ */

const vendorEnquirySchema =
  new mongoose.Schema(
    {

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


      enquiryNumber: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        immutable:
          true,
      },


      rfqNumber: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        default:
          "",
      },


      purchaseRequestId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "PurchaseRequest",

        default:
          null,
      },


      vendorId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required:
          true,

        index:
          true,
      },


      /*
       * Snapshot from existing Vendor/Supplier master.
       */
      vendorName: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },


      vendorCode: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      contactPerson: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      phone: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      email: {
        type:
          String,

        trim:
          true,

        lowercase:
          true,

        default:
          "",
      },


      source: {
        type:
          String,

        enum:
          VENDOR_ENQUIRY_SOURCES,

        required:
          true,

        default:
          "direct_supplier",
      },


      /*
       * Required when source === "other".
       *
       * Example:
       * Referral
       * Trade Fair
       * Local Market
       * Website
       */
      otherSource: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      itemName: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },


      quantity: {
        type:
          Number,

        required:
          true,

        min:
          0.000001,
      },


      unit: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      quotedPrice: {
        type:
          Number,

        min:
          0,

        default:
          null,
      },


      taxPercent: {
        type:
          Number,

        min:
          0,

        max:
          100,

        default:
          null,
      },


      deliveryTime: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      paymentTerms: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      validUntil: {
        type:
          Date,

        default:
          null,
      },


      remarks: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      status: {
        type:
          String,

        enum:
          VENDOR_ENQUIRY_STATUSES,

        required:
          true,

        default:
          "draft",

        index:
          true,
      },


      requestedAt: {
        type:
          Date,

        default:
          null,
      },


      requestedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      receivedAt: {
        type:
          Date,

        default:
          null,
      },


      receivedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

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

    },
    {

      timestamps:
        true,

      versionKey:
        false,

      autoCreate:
        false,

      autoIndex:
        false,

      collection:
        "vendor_enquiries",

    }
  );


/* ============================================================
   VALIDATION
============================================================ */

vendorEnquirySchema.pre(
  "validate",
  function vendorEnquiryValidation() {

    if (
      Number(
        this.quantity
      ) <=
      0
    ) {

      throw new Error(
        "Vendor enquiry quantity must be greater than zero."
      );
    }


    if (
      this.source ===
        "other" &&
      !String(
        this.otherSource ||
        ""
      ).trim()
    ) {

      throw new Error(
        "Other source is required when enquiry source is Other."
      );
    }


    if (
      this.source !==
      "other"
    ) {

      this.otherSource =
        "";
    }


    if (
      this.quotedPrice !==
        null &&
      this.quotedPrice !==
        undefined &&
      Number(
        this.quotedPrice
      ) <
        0
    ) {

      throw new Error(
        "Quoted price cannot be negative."
      );
    }


    if (
      this.taxPercent !==
        null &&
      this.taxPercent !==
        undefined &&
      (
        Number(
          this.taxPercent
        ) <
          0 ||
        Number(
          this.taxPercent
        ) >
          100
      )
    ) {

      throw new Error(
        "Tax percentage must be between 0 and 100."
      );
    }

  }
);


/* ============================================================
   INDEXES
============================================================ */

vendorEnquirySchema.index(
  {
    companyId:
      1,

    enquiryNumber:
      1,
  },
  {
    unique:
      true,
  }
);


vendorEnquirySchema.index(
  {
    companyId:
      1,

    status:
      1,

    createdAt:
      -1,
  }
);


vendorEnquirySchema.index(
  {
    companyId:
      1,

    vendorId:
      1,

    createdAt:
      -1,
  }
);


vendorEnquirySchema.index(
  {
    companyId:
      1,

    purchaseRequestId:
      1,

    createdAt:
      -1,
  }
);


/* ============================================================
   MODEL
============================================================ */

export const VendorEnquiry =
  mongoose.models
    .VendorEnquiry ||
  mongoose.model(
    "VendorEnquiry",
    vendorEnquirySchema
  );


export default VendorEnquiry;