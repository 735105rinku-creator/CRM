import paymentAllocationService from "../services/paymentAllocation.service.js";

import {
  createPaymentAllocationsSchema,
  paymentVoucherParamSchema,
  purchasePaymentContextParamSchema
} from "../validators/paymentAllocation.validator.js";

import {
  ApiError
} from "../utils/apiError.js";

import {
  ApiResponse
} from "../utils/apiResponse.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";


/* ============================================================
   VALIDATION
============================================================ */

const validate = (
  schema,
  source
) => {

  const {
    value,
    error
  } = schema.validate(
    source,
    {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    }
  );


  if (error) {

    throw new ApiError(
      400,
      error.details?.[0]?.message ||
        "Invalid allocation request.",
      error.details
    );

  }


  return value;
};


/* ============================================================
   ACCOUNTING COMPANY CONTEXT
============================================================ */

const companyId = req => {

  if (
    !req.accountingAccess
      ?.companyId
  ) {

    throw new ApiError(
      403,
      "Accounting company context missing."
    );

  }


  return req.accountingAccess
    .companyId;
};


/* ============================================================
   PURCHASE PAYMENT CONTEXT

   GET
   /accounting/vouchers/purchase-payment-context/:purchaseInvoiceId

   Read-only endpoint used when Accounts opens a verified
   Purchase Invoice for payment.

   It resolves the trusted:
     - Purchase Invoice
     - outstanding amount
     - Purchase Voucher
     - Vendor/AP party account
     - Company Admin approval

   It does not create or modify accounting records.
============================================================ */

export const getPurchasePaymentContext =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const params =
        validate(
          purchasePaymentContextParamSchema,
          req.params
        );


      const result =
        await paymentAllocationService
          .purchasePaymentContext(
            companyId(req),
            params.purchaseInvoiceId
          );


      res.json(
        new ApiResponse(
          200,
          result,
          "Purchase payment context fetched."
        )
      );

    }
  );


/* ============================================================
   PURCHASE PAYMENT ALLOCATION OPTIONS

   Existing endpoint.

   partyAccountId remains intentionally hidden from this
   generic allocation-options response.

   The dedicated purchase-payment-context endpoint above is
   responsible for exposing the trusted payable account when
   building a new Payment Voucher.
============================================================ */

export const getPaymentAllocationOptions =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const params =
        validate(
          paymentVoucherParamSchema,
          req.params
        );


      const rows =
        await paymentAllocationService
          .options(
            companyId(req),
            params.voucherId
          );


      const result =
        rows.map(
          ({
            partyAccountId:
              _partyAccountId,
            ...row
          }) =>
            row
        );


      res.json(
        new ApiResponse(
          200,
          result,
          "Outstanding Purchase Invoices fetched."
        )
      );

    }
  );


/* ============================================================
   CREATE PURCHASE PAYMENT ALLOCATIONS
============================================================ */

export const createPaymentAllocations =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const params =
        validate(
          paymentVoucherParamSchema,
          req.params
        );


      const payload =
        validate(
          createPaymentAllocationsSchema,
          req.body
        );


      const rows =
        await paymentAllocationService
          .allocate({

            companyId:
              companyId(req),

            paymentVoucherId:
              params.voucherId,

            userId:
              req.user?._id ||
              req.auth?.userId ||
              null,

            allocations:
              payload.allocations

          });


      res.status(201)
        .json(
          new ApiResponse(
            201,
            rows,
            "Payment allocations recorded."
          )
        );

    }
  );