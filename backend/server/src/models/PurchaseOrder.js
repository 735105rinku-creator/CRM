import mongoose from "mongoose";


/* ============================================================
   CONSTANTS
============================================================ */

export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "approved",
  "sent",
  "partially_received",
  "received",
  "cancelled"
];

export const PURCHASE_ORDER_DELIVERY_TYPES = [
  "company_warehouse", "airport", "port", "customer_location",
  "project_site", "factory_processing_unit", "third_party_warehouse",
  "direct_delivery", "other"
];


/* ============================================================
   PURCHASE ORDER ITEM
============================================================ */

const purchaseOrderItemSchema =
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

      orderedQuantity: {
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
          0,
        default:
          0
      },

      lineTax: {
        type:
          Number,
        required:
          true,
        min:
          0,
        default:
          0
      },

      lineTotal: {
        type:
          Number,
        required:
          true,
        min:
          0,
        default:
          0
      },

      /*
       * Updated later through GRN aggregation.
       * Purchase Order create/update endpoints must not trust
       * client values for received/remaining quantity.
       */

      receivedQuantity: {
        type:
          Number,
        min:
          0,
        default:
          0
      },

      remainingQuantity: {
        type:
          Number,
        min:
          0,
        default:
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


/* ============================================================
   PURCHASE ORDER
============================================================ */

const purchaseOrderSchema =
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

      poNumber: {
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

      poDate: {
        type:
          Date,
        required:
          true,
        default:
          Date.now
      },

      purchaseRequestId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "PurchaseRequest",
        required:
          true,
        index:
          true
      },

      purchaseRequestNumber: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      quotationId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "PurchaseQuotation",
        required:
          true,
        index:
          true
      },

      quotationNumber: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      vendorEnquiryId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "VendorEnquiry",
        default:
          null
      },

      rfqNumber: {
        type:
          String,
        trim:
          true,
        default:
          ""
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

      items: {
        type: [
          purchaseOrderItemSchema
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
            "At least one Purchase Order item is required."
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

      deliveryAddress: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      deliveryType: {
        type: String,
        enum: PURCHASE_ORDER_DELIVERY_TYPES,
        default: "company_warehouse"
      },

      deliveryLocationName: { type: String, trim: true, default: "" },
      deliveryContactPerson: { type: String, trim: true, default: "" },
      deliveryContactNumber: { type: String, trim: true, default: "" },
      otherDeliveryType: { type: String, trim: true, default: "" },

      warehouseId: {
        type:
          mongoose.Schema.Types.ObjectId,
        default:
          null,
        index:
          true
      },

      warehouseName: {
        type:
          String,
        trim:
          true,
        default:
          ""
      },

      expectedDeliveryDate: {
        type:
          Date,
        default:
          null
      },

      paymentTerms: {
        type:
          String,
        trim:
          true,
        default:
          ""
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
          PURCHASE_ORDER_STATUSES,
        default:
          "draft",
        index:
          true
      },

      approvedAt: {
        type:
          Date,
        default:
          null
      },

      approvedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "User",
        default:
          null
      },

      sentAt: {
        type:
          Date,
        default:
          null
      },

      sentBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "User",
        default:
          null
      },

      cancelledAt: {
        type:
          Date,
        default:
          null
      },

      cancelledBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "User",
        default:
          null
      },

      cancellationReason: {
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
        "purchase_orders"
    }
  );


/* ============================================================
   VALIDATION
============================================================ */

purchaseOrderSchema.pre(
  "validate",
  function purchaseOrderValidation() {

    const deliveryType = this.deliveryType || "company_warehouse";

    if (deliveryType === "company_warehouse" && !this.warehouseId) {
      throw new Error("Warehouse is required for Company Warehouse delivery.");
    }

    if (deliveryType !== "company_warehouse" && !String(this.deliveryLocationName || "").trim()) {
      throw new Error("Delivery location name is required for this delivery type.");
    }

    if (deliveryType === "other" && !String(this.otherDeliveryType || "").trim()) {
      throw new Error("Specify Delivery Type is required when Other is selected.");
    }

    if (
      !Array.isArray(
        this.items
      ) ||
      this.items.length ===
        0
    ) {

      throw new Error(
        "At least one Purchase Order item is required."
      );
    }


    for (
      const item
      of this.items
    ) {

      const orderedQuantity =
        Number(
          item.orderedQuantity
        );


      const receivedQuantity =
        Number(
          item.receivedQuantity ||
          0
        );


      const remainingQuantity =
        Number(
          item.remainingQuantity ||
          0
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
          orderedQuantity
        ) ||
        orderedQuantity <=
          0
      ) {

        throw new Error(
          "Purchase Order item quantity must be greater than zero."
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
          "Purchase Order item unit price cannot be negative."
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
          "Purchase Order item tax percentage must be between 0 and 100."
        );
      }


      if (
        !Number.isFinite(
          receivedQuantity
        ) ||
        receivedQuantity <
          0
      ) {

        throw new Error(
          "Received quantity cannot be negative."
        );
      }


      if (
        receivedQuantity >
        orderedQuantity
      ) {

        throw new Error(
          "Received quantity cannot exceed ordered quantity."
        );
      }


      if (
        !Number.isFinite(
          remainingQuantity
        ) ||
        remainingQuantity <
          0
      ) {

        throw new Error(
          "Remaining quantity cannot be negative."
        );
      }


      if (
        remainingQuantity >
        orderedQuantity
      ) {

        throw new Error(
          "Remaining quantity cannot exceed ordered quantity."
        );
      }

    }


    if (
      this.expectedDeliveryDate &&
      this.poDate &&
      new Date(
        this.expectedDeliveryDate
      ).getTime() <
      new Date(
        this.poDate
      ).getTime()
    ) {

      throw new Error(
        "Expected delivery date cannot be before PO date."
      );
    }

  }
);


/* ============================================================
   INDEXES
============================================================ */

purchaseOrderSchema.index(
  {
    companyId:
      1,

    poNumber:
      1
  },
  {
    unique:
      true,

    name:
      "uq_purchase_order_company_number"
  }
);


purchaseOrderSchema.index(
  {
    companyId:
      1,

    quotationId:
      1
  },
  {
    unique:
      true,

    name:
      "uq_purchase_order_company_quotation"
  }
);


purchaseOrderSchema.index(
  {
    companyId:
      1,

    status:
      1,

    poDate:
      -1
  },
  {
    name:
      "idx_purchase_order_listing"
  }
);


purchaseOrderSchema.index(
  {
    companyId:
      1,

    vendorId:
      1,

    poDate:
      -1
  },
  {
    name:
      "idx_purchase_order_vendor"
  }
);


purchaseOrderSchema.index(
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
      "idx_purchase_order_pr"
  }
);


purchaseOrderSchema.index(
  {
    companyId:
      1,

    warehouseId:
      1,

    status:
      1
  },
  {
    name:
      "idx_purchase_order_warehouse"
  }
);


purchaseOrderSchema.index(
  {
    companyId:
      1,

    expectedDeliveryDate:
      1,

    status:
      1
  },
  {
    name:
      "idx_purchase_order_delivery"
  }
);


/* ============================================================
   MODEL
============================================================ */

const PurchaseOrder =
  mongoose.models
    .PurchaseOrder ||
  mongoose.model(
    "PurchaseOrder",
    purchaseOrderSchema
  );


export default PurchaseOrder;
