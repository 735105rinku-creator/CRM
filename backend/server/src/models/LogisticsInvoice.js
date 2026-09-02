import mongoose from "mongoose";


/* ============================================================
   CONSTANTS
============================================================ */

export const LOGISTICS_INVOICE_STATUS =
  Object.freeze({
    DRAFT: "draft",
    ISSUED: "issued",
    CANCELLED: "cancelled",
  });


export const LOGISTICS_PAYMENT_STATUS =
  Object.freeze({
    UNPAID: "unpaid",
    PARTIAL: "partial",
    PAID: "paid",
    OVERDUE: "overdue",
    CANCELLED: "cancelled",
    OTHER: "other",
  });


export const DISCOUNT_TYPE =
  Object.freeze({
    AMOUNT: "amount",
    PERCENTAGE: "percentage",
  });


export const REVERSE_CHARGE =
  Object.freeze({
    YES: "yes",
    NO: "no",
  });


/* ============================================================
   BANK DETAILS
============================================================ */

const bankDetailsSchema =
  new mongoose.Schema(
    {
      bankName: {
        type: String,
        trim: true,
        default: "",
      },

      accountName: {
        type: String,
        trim: true,
        default: "",
      },

      accountNumber: {
        type: String,
        trim: true,
        default: "",
      },

      ifscCode: {
        type: String,
        trim: true,
        default: "",
      },

      branchName: {
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
   INVOICE ITEM
============================================================ */

const invoiceItemSchema =
  new mongoose.Schema(
    {
      productServiceId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "SupplierProduct",

        default:
          null,
      },

      description: {
        type: String,
        required: true,
        trim: true,
      },

      descriptionOther: {
        type: String,
        trim: true,
        default: "",
      },

      hsnSac: {
        type: String,
        trim: true,
        default: "",
      },

      quantity: {
        type: Number,
        required: true,
        min: 0,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      unitOther: {
        type: String,
        trim: true,
        default: "",
      },

      rate: {
        type: Number,
        default: 0,
        min: 0,
      },

      discount: {
        type: Number,
        default: 0,
        min: 0,
      },

      gstRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      baseAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      taxableAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      taxAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      _id: true,
    }
  );


/* ============================================================
   ADDITIONAL CHARGE
============================================================ */

const additionalChargeSchema =
  new mongoose.Schema(
    {
      description: {
        type: String,
        required: true,
        trim: true,
      },

      descriptionOther: {
        type: String,
        trim: true,
        default: "",
      },

      amount: {
        type: Number,
        min: 0,
        default: 0,
      },

      taxable: {
        type: Boolean,
        default: true,
      },
    },
    {
      _id: true,
    }
  );


/* ============================================================
   MAIN LOGISTICS INVOICE SCHEMA
============================================================ */

const logisticsInvoiceSchema =
  new mongoose.Schema(
    {
      /* ======================================================
         TENANT
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
         INVOICE IDENTITY
      ====================================================== */

      invoiceNumber: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        index:
          true,
      },


      /* ======================================================
         CUSTOMER
      ====================================================== */

      customerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "BusinessPartner",

        default:
          null,

        index:
          true,
      },

      customerName: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true,
      },

      contactPerson: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      mobile: {
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

      gstNumber: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        default:
          "",
      },

      billingAddress: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      shippingAddress: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      /* ======================================================
         INVOICE DATES
      ====================================================== */

      invoiceDate: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      dueDate: {
        type:
          Date,

        default:
          null,

        index:
          true,
      },


      /* ======================================================
         INVOICE TYPE
      ====================================================== */

      invoiceType: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      invoiceTypeOther: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },


      /* ======================================================
         SHIPMENT
      ====================================================== */

      shipmentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "LogisticsShipment",

        default:
          null,

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

        default:
          "",

        index:
          true,
      },


      /* ======================================================
         OTHER CUSTOMER DETAILS
      ====================================================== */

      customerReference: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      placeOfSupply: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      currency: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        default:
          "INR",
      },

      reverseCharge: {
        type:
          String,

        enum:
          Object.values(
            REVERSE_CHARGE
          ),

        default:
          REVERSE_CHARGE.NO,
      },


      /* ======================================================
         ITEMS
      ====================================================== */

      items: {
        type:
          [invoiceItemSchema],

        default:
          [],

        validate: {
          validator:
            function (
              value
            ) {

              return (
                Array.isArray(
                  value
                ) &&
                value.length >
                  0
              );
            },

          message:
            "At least one invoice item is required",
        },
      },


      /* ======================================================
         ADDITIONAL CHARGES
      ====================================================== */

      additionalCharges: {
        type:
          [additionalChargeSchema],

        default:
          [],
      },


      /* ======================================================
         DISCOUNT
      ====================================================== */

      discountType: {
        type:
          String,

        enum:
          Object.values(
            DISCOUNT_TYPE
          ),

        default:
          DISCOUNT_TYPE.AMOUNT,
      },

      overallDiscount: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      overallDiscountAmount: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },


      /* ======================================================
         TOTALS
      ====================================================== */

      itemsSubtotal: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      additionalChargeSubtotal: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      taxableAmount: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      taxTotal: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      roundOff: {
        type:
          Number,

        default:
          0,
      },

      invoiceTotal: {
        type:
          Number,

        default:
          0,

        min:
          0,

        index:
          true,
      },


      /* ======================================================
         PAYMENT
      ====================================================== */

      paymentStatus: {
        type:
          String,

        enum:
          Object.values(
            LOGISTICS_PAYMENT_STATUS
          ),

        default:
          LOGISTICS_PAYMENT_STATUS.UNPAID,

        index:
          true,
      },

      paymentStatusOther: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      paymentMode: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      paymentModeOther: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      paymentReference: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      paymentDate: {
        type:
          Date,

        default:
          null,
      },

      amountReceived: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      balanceDue: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },


      /* ======================================================
         BANK
      ====================================================== */

      bankDetails: {
        type:
          bankDetailsSchema,

        default:
          {},
      },


      /* ======================================================
         TERMS / REMARKS
      ====================================================== */

      termsAndConditions: {
        type:
          String,

        trim:
          true,

        default:
          "",
      },

      remarks: {
        type:
          String,

        trim:
          true,

        required:
          true,
      },


      /* ======================================================
         STATUS
      ====================================================== */

      status: {
        type:
          String,

        enum:
          Object.values(
            LOGISTICS_INVOICE_STATUS
          ),

        default:
          LOGISTICS_INVOICE_STATUS.DRAFT,

        index:
          true,
      },


      /* ======================================================
         SOFT DELETE
      ====================================================== */

      isActive: {
        type:
          Boolean,

        default:
          true,

        index:
          true,
      },


      /* ======================================================
         AUDIT
      ====================================================== */

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
    }
  );


/* ============================================================
   INDEXES
============================================================ */

logisticsInvoiceSchema.index(
  {
    companyId:
      1,

    invoiceNumber:
      1,
  },
  {
    unique:
      true,
  }
);


logisticsInvoiceSchema.index({
  companyId:
    1,

  invoiceDate:
    -1,
});


logisticsInvoiceSchema.index({
  companyId:
    1,

  status:
    1,

  paymentStatus:
    1,
});


logisticsInvoiceSchema.index({
  companyId:
    1,

  shipmentNumber:
    1,
});


logisticsInvoiceSchema.index({
  companyId:
    1,

  customerId:
    1,
});


/* ============================================================
   MODEL
============================================================ */

const LogisticsInvoice =
  mongoose.models.LogisticsInvoice ||
  mongoose.model(
    "LogisticsInvoice",
    logisticsInvoiceSchema
  );


export default LogisticsInvoice;