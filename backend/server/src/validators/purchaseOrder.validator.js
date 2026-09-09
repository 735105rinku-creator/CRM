import Joi from "joi";

import {
  PURCHASE_ORDER_STATUSES
} from "../models/PurchaseOrder.js";


/* ============================================================
   COMMON
============================================================ */

const objectIdSchema =
  Joi.string()
    .trim()
    .length(24)
    .hex()
    .messages({
      "string.length":
        "Invalid reference ID.",
      "string.hex":
        "Invalid reference ID."
    });


const optionalText =
  Joi.string()
    .trim()
    .allow("")
    .max(1500);


const moneySchema =
  Joi.number()
    .min(0)
    .precision(2);


const taxPercentSchema =
  Joi.number()
    .min(0)
    .max(100)
    .precision(4);


/* ============================================================
   PURCHASE ORDER ITEM
============================================================ */

const purchaseOrderItemSchema =
  Joi.object({

    itemId:
      objectIdSchema
        .allow(null)
        .optional(),

    itemName:
      Joi.string()
        .trim()
        .min(1)
        .max(250)
        .required(),

    description:
      Joi.string()
        .trim()
        .allow("")
        .max(1500)
        .optional(),

    orderedQuantity:
      Joi.number()
        .positive()
        .precision(4)
        .required(),

    unit:
      Joi.string()
        .trim()
        .min(1)
        .max(50)
        .required(),

    unitPrice:
      moneySchema
        .required(),

    taxPercent:
      taxPercentSchema
        .default(0),

    /*
     * Backend controlled totals / GRN quantities
     */

    lineSubtotal:
      Joi.forbidden(),

    lineTax:
      Joi.forbidden(),

    lineTotal:
      Joi.forbidden(),

    receivedQuantity:
      Joi.forbidden(),

    remainingQuantity:
      Joi.forbidden()

  })
  .unknown(false);


/* ============================================================
   CREATE
============================================================ */

export const createPurchaseOrderSchema =
  Joi.object({

    purchaseRequestId:
      objectIdSchema
        .required(),

    quotationId:
      objectIdSchema
        .required(),

    poDate:
      Joi.date()
        .iso()
        .optional(),

    items:
      Joi.array()
        .items(
          purchaseOrderItemSchema
        )
        .min(1)
        .required(),

    freightCharges:
      moneySchema
        .default(0),

    otherCharges:
      moneySchema
        .default(0),

    deliveryAddress:
      Joi.string()
        .trim()
        .allow("")
        .max(2000)
        .optional(),

    warehouseId:
      objectIdSchema
        .allow(null)
        .optional(),

    expectedDeliveryDate:
      Joi.date()
        .iso()
        .allow(null)
        .optional(),

    paymentTerms:
      Joi.string()
        .trim()
        .allow("")
        .max(1000)
        .optional(),

    remarks:
      optionalText
        .optional(),

    /*
     * Backend-controlled fields
     */

    poNumber:
      Joi.forbidden(),

    purchaseRequestNumber:
      Joi.forbidden(),

    quotationNumber:
      Joi.forbidden(),

    vendorEnquiryId:
      Joi.forbidden(),

    rfqNumber:
      Joi.forbidden(),

      vendorId:
      objectIdSchema
        .optional(),

    vendorName:
      Joi.forbidden(),

    vendorCode:
      Joi.forbidden(),

    warehouseName:
      Joi.forbidden(),

    subtotal:
      Joi.forbidden(),

    taxTotal:
      Joi.forbidden(),

    grandTotal:
      Joi.forbidden(),

    status:
      Joi.forbidden(),

    approvedAt:
      Joi.forbidden(),

    approvedBy:
      Joi.forbidden(),

    sentAt:
      Joi.forbidden(),

    sentBy:
      Joi.forbidden(),

    cancelledAt:
      Joi.forbidden(),

    cancelledBy:
      Joi.forbidden(),

    cancellationReason:
      Joi.forbidden(),

    companyId:
      Joi.forbidden(),

    createdBy:
      Joi.forbidden(),

    updatedBy:
      Joi.forbidden()

  })
  .custom(
    (
      value,
      helpers
    ) => {

      if (
        value.poDate &&
        value.expectedDeliveryDate
      ) {

        const poDate =
          new Date(
            value.poDate
          );


        const expectedDeliveryDate =
          new Date(
            value.expectedDeliveryDate
          );


        if (
          expectedDeliveryDate.getTime() <
          poDate.getTime()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "Expected delivery date cannot be before PO date."
            }
          );
        }

      }


      return value;
    }
  )
  .messages({
    "any.custom":
      "{{#message}}"
  })
  .unknown(false);


/* ============================================================
   UPDATE
============================================================ */

export const updatePurchaseOrderSchema =
  Joi.object({

    poDate:
      Joi.date()
        .iso()
        .optional(),

    items:
      Joi.array()
        .items(
          purchaseOrderItemSchema
        )
        .min(1)
        .optional(),

    freightCharges:
      moneySchema
        .optional(),

    otherCharges:
      moneySchema
        .optional(),

    deliveryAddress:
      Joi.string()
        .trim()
        .allow("")
        .max(2000)
        .optional(),

    warehouseId:
      objectIdSchema
        .allow(null)
        .optional(),

    expectedDeliveryDate:
      Joi.date()
        .iso()
        .allow(null)
        .optional(),

    paymentTerms:
      Joi.string()
        .trim()
        .allow("")
        .max(1000)
        .optional(),

    remarks:
      optionalText
        .optional(),

    /*
     * Immutable/backend-controlled references
     */

    purchaseRequestId:
      Joi.forbidden(),

    quotationId:
      Joi.forbidden(),

    poNumber:
      Joi.forbidden(),

    purchaseRequestNumber:
      Joi.forbidden(),

    quotationNumber:
      Joi.forbidden(),

    vendorEnquiryId:
      Joi.forbidden(),

    rfqNumber:
      Joi.forbidden(),

    vendorId:
      Joi.forbidden(),

    vendorName:
      Joi.forbidden(),

    vendorCode:
      Joi.forbidden(),

    warehouseName:
      Joi.forbidden(),

    subtotal:
      Joi.forbidden(),

    taxTotal:
      Joi.forbidden(),

    grandTotal:
      Joi.forbidden(),

    status:
      Joi.forbidden(),

    approvedAt:
      Joi.forbidden(),

    approvedBy:
      Joi.forbidden(),

    sentAt:
      Joi.forbidden(),

    sentBy:
      Joi.forbidden(),

    cancelledAt:
      Joi.forbidden(),

    cancelledBy:
      Joi.forbidden(),

    cancellationReason:
      Joi.forbidden(),

    companyId:
      Joi.forbidden(),

    createdBy:
      Joi.forbidden(),

    updatedBy:
      Joi.forbidden()

  })
  .min(1)
  .unknown(false);


/* ============================================================
   LIST / FILTER
============================================================ */

export const purchaseOrderQuerySchema =
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
          ...PURCHASE_ORDER_STATUSES
        )
        .optional(),

    vendorId:
      objectIdSchema
        .optional(),

    purchaseRequestId:
      objectIdSchema
        .optional(),

    quotationId:
      objectIdSchema
        .optional(),

    warehouseId:
      objectIdSchema
        .optional(),

    from:
      Joi.date()
        .iso()
        .optional(),

    to:
      Joi.date()
        .iso()
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
          "poDate",
          "-poDate",
          "createdAt",
          "-createdAt",
          "expectedDeliveryDate",
          "-expectedDeliveryDate",
          "grandTotal",
          "-grandTotal",
          "poNumber",
          "-poNumber",
          "vendorName",
          "-vendorName"
        )
        .default(
          "-poDate"
        )

  })
  .custom(
    (
      value,
      helpers
    ) => {

      if (
        value.from &&
        value.to
      ) {

        const from =
          new Date(
            value.from
          );


        const to =
          new Date(
            value.to
          );


        if (
          from.getTime() >
          to.getTime()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "From date cannot be after To date."
            }
          );
        }

      }


      return value;
    }
  )
  .messages({
    "any.custom":
      "{{#message}}"
  })
  .unknown(false);


/* ============================================================
   ID PARAM
============================================================ */

export const purchaseOrderIdParamSchema =
  Joi.object({

    id:
      objectIdSchema
        .required()

  })
  .unknown(false);


/* ============================================================
   APPROVE
============================================================ */

export const approvePurchaseOrderSchema =
  Joi.object({

    remarks:
      Joi.string()
        .trim()
        .allow("")
        .max(1000)
        .optional()

  })
  .unknown(false);


/* ============================================================
   SEND
============================================================ */

export const sendPurchaseOrderSchema =
  Joi.object({

    remarks:
      Joi.string()
        .trim()
        .allow("")
        .max(1000)
        .optional()

  })
  .unknown(false);


/* ============================================================
   CANCEL
============================================================ */

export const cancelPurchaseOrderSchema =
  Joi.object({

    reason:
      Joi.string()
        .trim()
        .min(1)
        .max(1000)
        .required()

  })
  .unknown(false);


/* ============================================================
   STATUS
   Only GRN/system controlled receipt states should use this
   internally later. Client-facing generic status is restricted.
============================================================ */

export const updatePurchaseOrderStatusSchema =
  Joi.object({

    status:
      Joi.string()
        .valid(
          "draft",
          "approved",
          "sent",
          "cancelled"
        )
        .required()

  })
  .unknown(false);