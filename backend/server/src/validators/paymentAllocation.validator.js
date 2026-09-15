import Joi from "joi";


/* ============================================================
   COMMON OBJECT ID
============================================================ */

const objectId =
  Joi.string()
    .hex()
    .length(24)
    .required();


/* ============================================================
   PAYMENT VOUCHER PARAMS
============================================================ */

export const paymentVoucherParamSchema =
  Joi.object({

    voucherId:
      objectId

  });


/* ============================================================
   PURCHASE PAYMENT CONTEXT PARAMS

   Used before creating a Payment Voucher.

   Flow:
   Incoming Purchase Invoice
      ->
   Resolve trusted Purchase payment context
      ->
   Create balanced Payment Voucher
============================================================ */

export const purchasePaymentContextParamSchema =
  Joi.object({

    purchaseInvoiceId:
      objectId

  });


/* ============================================================
   CREATE PURCHASE PAYMENT ALLOCATIONS
============================================================ */

export const createPaymentAllocationsSchema =
  Joi.object({

    allocations:
      Joi.array()
        .items(

          Joi.object({

            purchaseInvoiceId:
              objectId,

            allocatedAmount:
              Joi.number()
                .positive()
                .precision(2)
                .required()

          })

        )
        .min(1)
        .required()

  });