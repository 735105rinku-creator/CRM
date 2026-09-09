import Joi from "joi";


/* ============================================================
   COMMON SCHEMAS
============================================================ */

const objectIdSchema =
  Joi.string()
    .trim()
    .length(24)
    .hex();


const positiveQuantitySchema =
  Joi.number()
    .positive()
    .precision(4);


const nonNegativeQuantitySchema =
  Joi.number()
    .min(0)
    .precision(4);


const dateSchema =
  Joi.date()
    .iso();


/* ============================================================
   ITEM VALIDATION
============================================================ */

const goodsReceiptItemSchema =
  Joi.object({

    purchaseOrderItemId:
      objectIdSchema
        .required(),

    /*
     * These values are controlled by the backend from
     * Purchase Order snapshots.
     */
    itemId:
      Joi.forbidden(),

    itemName:
      Joi.forbidden(),

    description:
      Joi.forbidden(),

    unit:
      Joi.forbidden(),

    orderedQuantity:
      Joi.forbidden(),

    previouslyReceivedQuantity:
      Joi.forbidden(),

    remainingQuantity:
      Joi.forbidden(),

    currentReceivedQuantity:
      positiveQuantitySchema
        .required(),

    acceptedQuantity:
      nonNegativeQuantitySchema
        .required(),

    rejectedQuantity:
      nonNegativeQuantitySchema
        .required(),

    rrejectionReason:
    Joi.when(
      "rejectedQuantity",
      {
        is:
          Joi.number()
            .greater(0),
  
        then:
          Joi.string()
            .trim()
            .min(1)
            .max(1000)
            .required(),
  
        otherwise:
          Joi.string()
            .trim()
            .allow("")
            .max(1000)
            .optional()
      }
    )
  })
    .custom(
      (
        value,
        helpers
      ) => {

        const currentReceivedQuantity =
          Number(
            value.currentReceivedQuantity ||
            0
          );


        const acceptedQuantity =
          Number(
            value.acceptedQuantity ||
            0
          );


        const rejectedQuantity =
          Number(
            value.rejectedQuantity ||
            0
          );


        const totalOutcome =
          acceptedQuantity +
          rejectedQuantity;


        if (
          Math.abs(
            totalOutcome -
            currentReceivedQuantity
          ) >
          0.000001
        ) {

          return helpers.error(
            "goodsReceipt.quantityMismatch"
          );
        }


        return value;
      },
      "GRN item quantity validation"
    )
    .messages({

      "goodsReceipt.quantityMismatch":
        "Accepted quantity plus rejected quantity must equal current received quantity."

    });


/* ============================================================
   CREATE GRN
============================================================ */

export const createGoodsReceiptSchema =
  Joi.object({

    purchaseOrderId:
      objectIdSchema
        .required(),

    receiptDate:
      dateSchema
        .optional(),

    warehouseId:
      objectIdSchema
        .required(),

    deliveryChallanNumber:
      Joi.string()
        .trim()
        .allow("")
        .max(150)
        .optional(),

    items:
      Joi.array()
        .items(
          goodsReceiptItemSchema
        )
        .min(1)
        .required(),

    remarks:
      Joi.string()
        .trim()
        .allow("")
        .max(2000)
        .optional(),


    /* ========================================================
       BACKEND CONTROLLED FIELDS
    ======================================================== */

    companyId:
      Joi.forbidden(),

    grnNumber:
      Joi.forbidden(),

    poNumber:
      Joi.forbidden(),

    vendorId:
      Joi.forbidden(),

    vendorName:
      Joi.forbidden(),

    vendorCode:
      Joi.forbidden(),

    warehouseName:
      Joi.forbidden(),

    warehouseCode:
      Joi.forbidden(),

    receivedBy:
      Joi.forbidden(),

    receivedByName:
      Joi.forbidden(),

    status:
      Joi.forbidden(),

    createdBy:
      Joi.forbidden(),

    updatedBy:
      Joi.forbidden(),

    createdAt:
      Joi.forbidden(),

    updatedAt:
      Joi.forbidden(),


    /* ========================================================
       ACCOUNTS / PAYMENT FIELDS
       Purchase must never control these.
    ======================================================== */

    paidAmount:
      Joi.forbidden(),

    outstandingAmount:
      Joi.forbidden(),

    paymentReference:
      Joi.forbidden(),

    ledgerId:
      Joi.forbidden(),

    journalEntryId:
      Joi.forbidden(),

    paymentStatus:
      Joi.forbidden()

  })
    .required();


/* ============================================================
   QUERY
============================================================ */

export const goodsReceiptQuerySchema =
  Joi.object({

    search:
      Joi.string()
        .trim()
        .allow("")
        .max(200)
        .optional(),

    status:
      Joi.string()
        .valid(
          "received",
          "partial",
          "rejected",
          "completed"
        )
        .optional(),

    purchaseOrderId:
      objectIdSchema
        .optional(),

    vendorId:
      objectIdSchema
        .optional(),

    warehouseId:
      objectIdSchema
        .optional(),

    from:
      dateSchema
        .optional(),

    to:
      dateSchema
        .optional(),

    page:
      Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit:
      Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20),

    sort:
      Joi.string()
        .valid(
          "receiptDate",
          "-receiptDate",
          "createdAt",
          "-createdAt",
          "grnNumber",
          "-grnNumber",
          "poNumber",
          "-poNumber",
          "vendorName",
          "-vendorName"
        )
        .default("-receiptDate")

  });


/* ============================================================
   ID PARAM
============================================================ */

export const goodsReceiptIdParamSchema =
  Joi.object({

    id:
      objectIdSchema
        .required()

  });


/* ============================================================
   PO ID PARAM
============================================================ */

export const goodsReceiptPurchaseOrderParamSchema =
  Joi.object({

    purchaseOrderId:
      objectIdSchema
        .required()

  });


/* ============================================================
   STATUS FILTER
============================================================ */

export const goodsReceiptStatusSchema =
  Joi.object({

    status:
      Joi.string()
        .valid(
          "received",
          "partial",
          "rejected",
          "completed"
        )
        .required()

  });