import mongoose from "mongoose";

export const PURCHASE_QUOTATION_STATUSES = [
  "requested",
  "received",
  "selected",
  "rejected"
];

const purchaseQuotationItemSchema =
  new mongoose.Schema(
    {
      itemId: {
        type:
          mongoose.Schema.Types.ObjectId,
        default:
          null
      },

      itemName: {
        type:
          String,
        required:
          true,
        trim:
          true
      },

      description: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      quantity: {
        type:
          Number,
        required:
          true,
        min:
          0
      },

      unit: {
        type:
          String,
        required:
          true,
        trim:
          true
      },

      unitPrice: {
        type:
          Number,
        required:
          true,
        min:
          0
      },

      taxPercent: {
        type:
          Number,
        default:
          0,
        min:
          0,
        max:
          100
      },

      lineSubtotal: {
        type:
          Number,
        required:
          true,
        min:
          0
      },

      lineTax: {
        type:
          Number,
        required:
          true,
        min:
          0
      },

      lineTotal: {
        type:
          Number,
        required:
          true,
        min:
          0
      }
    },
    {
      _id:
        true,

      id:
        false
    }
  );


const purchaseQuotationSchema =
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
          true
      },

      quotationNumber: {
        type:
          String,
        required:
          true,
        trim:
          true,
        uppercase:
          true,
        immutable:
          true
      },

      rfqNumber: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      purchaseRequestId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "PurchaseRequest",
        default:
          null,
        index:
          true
      },

      vendorEnquiryId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "VendorEnquiry",
        default:
          null,
        index:
          true
      },

      vendorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "LogisticsVendor",
        required:
          true,
        index:
          true
      },

      vendorName: {
        type:
          String,
        required:
          true,
        trim:
          true
      },

      vendorCode: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      quotationDate: {
        type:
          Date,
        required:
          true,
        default:
          Date.now
      },

      items: {
        type: [
          purchaseQuotationItemSchema
        ],
        required:
          true,

        validate: {
          validator:
            value =>
              Array.isArray(
                value
              ) &&
              value.length >
                0,

          message:
            "At least one quotation item is required."
        }
      },

      subtotal: {
        type:
          Number,
        required:
          true,
        min:
          0,
        default:
          0
      },

      taxTotal: {
        type:
          Number,
        required:
          true,
        min:
          0,
        default:
          0
      },

      freightCharges: {
        type:
          Number,
        min:
          0,
        default:
          0
      },

      otherCharges: {
        type:
          Number,
        min:
          0,
        default:
          0
      },

      grandTotal: {
        type:
          Number,
        required:
          true,
        min:
          0,
        default:
          0
      },

      deliveryTime: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      paymentTerms: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      validUntil: {
        type:
          Date,
        default:
          null
      },

      remarks: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      status: {
        type:
          String,
        enum:
          PURCHASE_QUOTATION_STATUSES,
        default:
          "received",
        index:
          true
      },

      selectedAt: {
        type:
          Date,
        default:
          null
      },

      selectedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "User",
        default:
          null
      },

      rejectedAt: {
        type:
          Date,
        default:
          null
      },

      rejectedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "User",
        default:
          null
      },

      rejectionReason: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "User",
        required:
          true
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "User",
        default:
          null
      }
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
        "purchase_quotations"
    }
  );


/* ============================================================
   VALIDATION
============================================================ */

purchaseQuotationSchema.pre(
  "validate",
  function purchaseQuotationValidation() {

    if (
      !Array.isArray(
        this.items
      ) ||
      this.items.length ===
        0
    ) {

      throw new Error(
        "At least one quotation item is required."
      );
    }


    for (
      const item
      of this.items
    ) {

      const quantity =
        Number(
          item.quantity
        );


      const unitPrice =
        Number(
          item.unitPrice
        );


      const taxPercent =
        Number(
          item.taxPercent ||
          0
        );


      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <=
          0
      ) {

        throw new Error(
          "Quotation item quantity must be greater than zero."
        );
      }


      if (
        !Number.isFinite(
          unitPrice
        ) ||
        unitPrice <
          0
      ) {

        throw new Error(
          "Quotation item unit price cannot be negative."
        );
      }


      if (
        !Number.isFinite(
          taxPercent
        ) ||
        taxPercent <
          0 ||
        taxPercent >
          100
      ) {

        throw new Error(
          "Quotation item tax percentage must be between 0 and 100."
        );
      }

    }


    const freightCharges =
      Number(
        this.freightCharges ||
        0
      );


    const otherCharges =
      Number(
        this.otherCharges ||
        0
      );


    if (
      !Number.isFinite(
        freightCharges
      ) ||
      freightCharges <
        0
    ) {

      throw new Error(
        "Freight charges cannot be negative."
      );
    }


    if (
      !Number.isFinite(
        otherCharges
      ) ||
      otherCharges <
        0
    ) {

      throw new Error(
        "Other charges cannot be negative."
      );
    }


    if (
      this.validUntil &&
      this.quotationDate &&
      new Date(
        this.validUntil
      ).getTime() <
      new Date(
        this.quotationDate
      ).getTime()
    ) {

      throw new Error(
        "Quotation validity date cannot be before quotation date."
      );
    }

  }
);


/* ============================================================
   INDEXES
============================================================ */

purchaseQuotationSchema.index(
  {
    companyId:
      1,

    quotationNumber:
      1
  },
  {
    unique:
      true,

    name:
      "uq_purchase_quotation_company_number"
  }
);


purchaseQuotationSchema.index(
  {
    companyId:
      1,

    status:
      1,

    quotationDate:
      -1
  },
  {
    name:
      "idx_purchase_quotation_listing"
  }
);


purchaseQuotationSchema.index(
  {
    companyId:
      1,

    purchaseRequestId:
      1,

    status:
      1
  },
  {
    name:
      "idx_purchase_quotation_pr_status"
  }
);


purchaseQuotationSchema.index(
  {
    companyId:
      1,

    vendorId:
      1,

    quotationDate:
      -1
  },
  {
    name:
      "idx_purchase_quotation_vendor"
  }
);


purchaseQuotationSchema.index(
  {
    companyId:
      1,

    vendorEnquiryId:
      1
  },
  {
    name:
      "idx_purchase_quotation_vendor_enquiry"
  }
);


/* ============================================================
   MODEL
============================================================ */

const PurchaseQuotation =
  mongoose.models
    .PurchaseQuotation ||
  mongoose.model(
    "PurchaseQuotation",
    purchaseQuotationSchema
  );


export default PurchaseQuotation;