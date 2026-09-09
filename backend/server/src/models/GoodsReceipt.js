import mongoose from "mongoose";


export const GOODS_RECEIPT_STATUSES = [
  "received",
  "partial",
  "rejected",
  "completed"
];


/* ============================================================
   GOODS RECEIPT ITEM
============================================================ */

const goodsReceiptItemSchema =
  new mongoose.Schema(
    {
      purchaseOrderItemId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required:
          true
      },

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

        default:
          "",

        trim:
          true
      },

      unit: {
        type:
          String,

        required:
          true,

        trim:
          true
      },

      orderedQuantity: {
        type:
          Number,

        required:
          true,

        min:
          0
      },

      previouslyReceivedQuantity: {
        type:
          Number,

        required:
          true,

        default:
          0,

        min:
          0
      },

      currentReceivedQuantity: {
        type:
          Number,

        required:
          true,

        min:
          0
      },

      acceptedQuantity: {
        type:
          Number,

        required:
          true,

        default:
          0,

        min:
          0
      },

      rejectedQuantity: {
        type:
          Number,

        required:
          true,

        default:
          0,

        min:
          0
      },

      remainingQuantity: {
        type:
          Number,

        required:
          true,

        min:
          0
      },

      rejectionReason: {
        type:
          String,

        default:
          "",

        trim:
          true
      }
    },
    {
      _id:
        false
    }
  );


/* ============================================================
   ITEM VALIDATION
============================================================ */

goodsReceiptItemSchema.pre(
  "validate",
  function validateGoodsReceiptItem() {

    const ordered =
      Number(
        this.orderedQuantity ||
        0
      );


    const previous =
      Number(
        this.previouslyReceivedQuantity ||
        0
      );


    const current =
      Number(
        this.currentReceivedQuantity ||
        0
      );


    const accepted =
      Number(
        this.acceptedQuantity ||
        0
      );


    const rejected =
      Number(
        this.rejectedQuantity ||
        0
      );


    const remaining =
      Number(
        this.remainingQuantity ||
        0
      );


    if (
      ordered <=
      0
    ) {

      throw new Error(
        "Ordered quantity must be greater than zero."
      );
    }


    if (
      previous >
      ordered
    ) {

      throw new Error(
        "Previously received quantity cannot exceed ordered quantity."
      );
    }


    if (
      current >
      (
        ordered -
        previous
      )
    ) {

      throw new Error(
        "Current received quantity cannot exceed remaining PO quantity."
      );
    }


    if (
      accepted +
      rejected !==
      current
    ) {

      throw new Error(
        "Accepted quantity plus rejected quantity must equal current received quantity."
      );
    }


    /*
     * Remaining quantity is based on physical receipt.
     * Accepted/rejected quality outcome is tracked separately.
     */

    const expectedRemaining =
      ordered -
      previous -
      current;


    if (
      Math.abs(
        remaining -
        expectedRemaining
      ) >
      0.000001
    ) {

      throw new Error(
        "Remaining quantity does not match ordered and received quantities."
      );
    }


    if (
      rejected >
        0 &&
      !String(
        this.rejectionReason ||
        ""
      )
        .trim()
    ) {

      throw new Error(
        "Rejection reason is required when rejected quantity is greater than zero."
      );
    }

  }
);


/* ============================================================
   GOODS RECEIPT
============================================================ */

const goodsReceiptSchema =
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
          false
      },

      grnNumber: {
        type:
          String,

        required:
          true,

        trim:
          true,

        immutable:
          true
      },

      purchaseOrderId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "PurchaseOrder",

        required:
          true
      },

      poNumber: {
        type:
          String,

        required:
          true,

        trim:
          true
      },

      receiptDate: {
        type:
          Date,

        required:
          true,

        default:
          Date.now
      },

      vendorId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "LogisticsVendor",

        required:
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

        default:
          "",

        trim:
          true
      },

      warehouseId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "LogisticsWarehouse",

        required:
          true
      },

      warehouseName: {
        type:
          String,

        required:
          true,

        trim:
          true
      },

      warehouseCode: {
        type:
          String,

        default:
          "",

        trim:
          true
      },

      deliveryChallanNumber: {
        type:
          String,

        default:
          "",

        trim:
          true
      },

      items: {
        type: [
          goodsReceiptItemSchema
        ],

        required:
          true,

        validate: {
          validator(
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
            "At least one GRN item is required."
        }
      },

      receivedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true
      },

      receivedByName: {
        type:
          String,

        default:
          "",

        trim:
          true
      },

      remarks: {
        type:
          String,

        default:
          "",

        trim:
          true
      },

      status: {
        type:
          String,

        enum:
          GOODS_RECEIPT_STATUSES,

        required:
          true,

        default:
          "received"
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

        required:
          true
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
        "goods_receipts"
    }
  );


/* ============================================================
   DOCUMENT VALIDATION
============================================================ */

goodsReceiptSchema.pre(
  "validate",
  function validateGoodsReceipt() {

    if (
      !Array.isArray(
        this.items
      ) ||
      this.items.length ===
        0
    ) {

      throw new Error(
        "At least one Goods Receipt item is required."
      );
    }


    const currentReceivedTotal =
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.currentReceivedQuantity ||
            0
          ),
        0
      );


    const acceptedTotal =
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.acceptedQuantity ||
            0
          ),
        0
      );


    const rejectedTotal =
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.rejectedQuantity ||
            0
          ),
        0
      );


    const remainingTotal =
      this.items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.remainingQuantity ||
            0
          ),
        0
      );


    if (
      currentReceivedTotal <=
      0
    ) {

      throw new Error(
        "Goods Receipt must contain a received quantity."
      );
    }


    if (
      this.status ===
        "completed" &&
      remainingTotal >
        0
    ) {

      throw new Error(
        "Completed GRN cannot have remaining Purchase Order quantity."
      );
    }


    if (
      this.status ===
        "rejected" &&
      rejectedTotal <=
        0
    ) {

      throw new Error(
        "Rejected GRN must contain rejected quantity."
      );
    }


    if (
      this.status ===
        "rejected" &&
      acceptedTotal >
        0
    ) {

      throw new Error(
        "Rejected GRN cannot contain accepted quantity."
      );
    }

  }
);


/* ============================================================
   INDEX DEFINITIONS

   autoIndex:false means these declarations do not automatically
   create indexes at application startup.
============================================================ */

goodsReceiptSchema.index(
  {
    companyId:
      1,

    grnNumber:
      1
  },
  {
    unique:
      true
  }
);


goodsReceiptSchema.index(
  {
    companyId:
      1,

    purchaseOrderId:
      1,

    receiptDate:
      -1
  }
);


goodsReceiptSchema.index(
  {
    companyId:
      1,

    vendorId:
      1,

    receiptDate:
      -1
  }
);


goodsReceiptSchema.index(
  {
    companyId:
      1,

    warehouseId:
      1,

    receiptDate:
      -1
  }
);


goodsReceiptSchema.index(
  {
    companyId:
      1,

    status:
      1,

    receiptDate:
      -1
  }
);


/* ============================================================
   MODEL
============================================================ */

const GoodsReceipt =
  mongoose.models
    .GoodsReceipt ||
  mongoose.model(
    "GoodsReceipt",
    goodsReceiptSchema
  );


export {
  goodsReceiptItemSchema,
  goodsReceiptSchema
};


export default GoodsReceipt;