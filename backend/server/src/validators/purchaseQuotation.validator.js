import Joi from "joi";

import {
  PURCHASE_QUOTATION_STATUSES
} from "../models/PurchaseQuotation.js";


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
    .max(1000);


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
   ITEM
============================================================ */

const quotationItemSchema =
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

    quantity:
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
     * Backend calculates these.
     * Client must never control them.
     */

    lineSubtotal:
      Joi.forbidden(),

    lineTax:
      Joi.forbidden(),

    lineTotal:
      Joi.forbidden()

  })
  .unknown(false);


/* ============================================================
   CREATE
============================================================ */

export const createPurchaseQuotationSchema =
  Joi.object({

    purchaseRequestId:
      objectIdSchema
        .allow(null)
        .optional(),

    vendorEnquiryId:
      objectIdSchema
        .allow(null)
        .optional(),

    vendorId:
      objectIdSchema
        .required(),

    quotationDate:
      Joi.date()
        .iso()
        .optional(),

    items:
      Joi.array()
        .items(
          quotationItemSchema
        )
        .min(1)
        .required(),

    freightCharges:
      moneySchema
        .default(0),

    otherCharges:
      moneySchema
        .default(0),

    deliveryTime:
      Joi.string()
        .trim()
        .allow("")
        .max(250)
        .optional(),

    paymentTerms:
      Joi.string()
        .trim()
        .allow("")
        .max(1000)
        .optional(),

    validUntil:
      Joi.date()
        .iso()
        .allow(null)
        .optional(),

    remarks:
      optionalText
        .optional(),

    /*
     * Backend-controlled fields
     */

    quotationNumber:
      Joi.forbidden(),

    rfqNumber:
      Joi.forbidden(),

    vendorName:
      Joi.forbidden(),

    vendorCode:
      Joi.forbidden(),

    subtotal:
      Joi.forbidden(),

    taxTotal:
      Joi.forbidden(),

    grandTotal:
      Joi.forbidden(),

    status:
      Joi.forbidden(),

    selectedAt:
      Joi.forbidden(),

    selectedBy:
      Joi.forbidden(),

    rejectedAt:
      Joi.forbidden(),

    rejectedBy:
      Joi.forbidden(),

    rejectionReason:
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
        value.validUntil &&
        value.quotationDate
      ) {

        const validUntil =
          new Date(
            value.validUntil
          );

        const quotationDate =
          new Date(
            value.quotationDate
          );


        if (
          validUntil.getTime() <
          quotationDate.getTime()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "Quotation validity date cannot be before quotation date."
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

export const updatePurchaseQuotationSchema =
  Joi.object({

    purchaseRequestId:
      objectIdSchema
        .allow(null)
        .optional(),

    vendorEnquiryId:
      objectIdSchema
        .allow(null)
        .optional(),

    vendorId:
      objectIdSchema
        .optional(),

    quotationDate:
      Joi.date()
        .iso()
        .optional(),

    items:
      Joi.array()
        .items(
          quotationItemSchema
        )
        .min(1)
        .optional(),

    freightCharges:
      moneySchema
        .optional(),

    otherCharges:
      moneySchema
        .optional(),

    deliveryTime:
      Joi.string()
        .trim()
        .allow("")
        .max(250)
        .optional(),

    paymentTerms:
      Joi.string()
        .trim()
        .allow("")
        .max(1000)
        .optional(),

    validUntil:
      Joi.date()
        .iso()
        .allow(null)
        .optional(),

    remarks:
      optionalText
        .optional(),

    /*
     * Backend-controlled
     */

    quotationNumber:
      Joi.forbidden(),

    rfqNumber:
      Joi.forbidden(),

    vendorName:
      Joi.forbidden(),

    vendorCode:
      Joi.forbidden(),

    subtotal:
      Joi.forbidden(),

    taxTotal:
      Joi.forbidden(),

    grandTotal:
      Joi.forbidden(),

    status:
      Joi.forbidden(),

    selectedAt:
      Joi.forbidden(),

    selectedBy:
      Joi.forbidden(),

    rejectedAt:
      Joi.forbidden(),

    rejectedBy:
      Joi.forbidden(),

    rejectionReason:
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

export const purchaseQuotationQuerySchema =
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
          ...PURCHASE_QUOTATION_STATUSES
        )
        .optional(),

    vendorId:
      objectIdSchema
        .optional(),

    purchaseRequestId:
      objectIdSchema
        .optional(),

    vendorEnquiryId:
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
          "quotationDate",
          "-quotationDate",
          "createdAt",
          "-createdAt",
          "grandTotal",
          "-grandTotal",
          "quotationNumber",
          "-quotationNumber",
          "vendorName",
          "-vendorName"
        )
        .default(
          "-quotationDate"
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

export const purchaseQuotationIdParamSchema =
  Joi.object({

    id:
      objectIdSchema
        .required()

  })
  .unknown(false);


/* ============================================================
   COMPARISON QUERY
============================================================ */

export const purchaseQuotationComparisonSchema =
  Joi.object({

    purchaseRequestId:
      objectIdSchema
        .required()

  })
  .unknown(false);


/* ============================================================
   SELECT
============================================================ */

export const selectPurchaseQuotationSchema =
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
   REJECT
============================================================ */

export const rejectPurchaseQuotationSchema =
  Joi.object({

    reason:
      Joi.string()
        .trim()
        .allow("")
        .max(1000)
        .optional()

  })
  .unknown(false);


/* ============================================================
   STATUS
============================================================ */

export const updatePurchaseQuotationStatusSchema =
  Joi.object({

    status:
      Joi.string()
        .valid(
          "requested",
          "received"
        )
        .required()

  })
  .unknown(false);