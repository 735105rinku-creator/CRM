import {
  createVoucherSchema,
  updateVoucherSchema,
  voucherIdParamSchema,
  voucherQuerySchema,
} from "../validators/voucher.validator.js";

import voucherService
  from "../services/voucher.service.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";


/* ============================================================
   ACCOUNTING COMPANY CONTEXT
============================================================ */

const companyIdForRequest = (req) => {

  const companyId =
    req.accountingAccess?.companyId;


  if (
    !companyId
  ) {

    throw new ApiError(
      403,
      "Accounting company context missing."
    );

  }


  return companyId;

};


/* ============================================================
   CURRENT USER
============================================================ */

const userIdForRequest = (req) =>
  req.user?._id ||
  req.auth?.userId ||
  null;


/* ============================================================
   JOI VALIDATION
============================================================ */

const validate = (
  schema,
  source
) => {

  const {
    value,
    error,
  } =
    schema.validate(
      source,
      {
        abortEarly:
          false,

        stripUnknown:
          true,

        convert:
          true,
      }
    );


  if (
    error
  ) {

    throw new ApiError(
      400,
      error.details?.[0]?.message ||
        "Invalid request.",
      error.details
    );

  }


  return value;

};


/* ============================================================
   CREATE VOUCHER

   POST /accounting/vouchers
============================================================ */

export const createVoucher =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const payload =
        validate(
          createVoucherSchema,
          req.body
        );


      const voucher =
        await voucherService
          .createVoucher({

            companyId:
              companyIdForRequest(
                req
              ),

            userId:
              userIdForRequest(
                req
              ),

            payload,

          });


      return res
        .status(
          201
        )
        .json(
          new ApiResponse(
            201,
            voucher,
            "Voucher created successfully."
          )
        );

    }
  );


/* ============================================================
   LIST VOUCHERS

   GET /accounting/vouchers
============================================================ */

export const getVouchers =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const query =
        validate(
          voucherQuerySchema,
          req.query
        );


      const vouchers =
        await voucherService
          .getVouchers({

            companyId:
              companyIdForRequest(
                req
              ),

            query,

          });


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            vouchers,
            "Vouchers fetched successfully."
          )
        );

    }
  );


/* ============================================================
   GET VOUCHER BY ID

   GET /accounting/vouchers/:voucherId
============================================================ */

export const getVoucherById =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const params =
        validate(
          voucherIdParamSchema,
          req.params
        );


      const voucher =
        await voucherService
          .getVoucherById({

            companyId:
              companyIdForRequest(
                req
              ),

            voucherId:
              params.voucherId,

          });


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            voucher,
            "Voucher fetched successfully."
          )
        );

    }
  );


/* ============================================================
   UPDATE DRAFT VOUCHER

   PATCH /accounting/vouchers/:voucherId
============================================================ */

export const updateVoucher =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const params =
        validate(
          voucherIdParamSchema,
          req.params
        );


      const payload =
        validate(
          updateVoucherSchema,
          req.body
        );


      const voucher =
        await voucherService
          .updateDraftVoucher({

            companyId:
              companyIdForRequest(
                req
              ),

            voucherId:
              params.voucherId,

            userId:
              userIdForRequest(
                req
              ),

            payload,

          });


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            voucher,
            "Voucher updated successfully."
          )
        );

    }
  );

/* ============================================================
   POST VOUCHER

   POST /accounting/vouchers/:voucherId/post
============================================================ */

export const postVoucher =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const params =
        validate(
          voucherIdParamSchema,
          req.params
        );


      const voucher =
        await voucherService
          .postVoucher({

            companyId:
              companyIdForRequest(
                req
              ),

            voucherId:
              params.voucherId,

            userId:
              userIdForRequest(
                req
              ),

          });


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            voucher,
            "Voucher posted successfully."
          )
        );

    }
  );


/* ============================================================
   VOID VOUCHER

   POST /accounting/vouchers/:voucherId/void
============================================================ */

export const voidVoucher =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const params =
        validate(
          voucherIdParamSchema,
          req.params
        );


      const voucher =
        await voucherService
          .voidVoucher({

            companyId:
              companyIdForRequest(
                req
              ),

            voucherId:
              params.voucherId,

            userId:
              userIdForRequest(
                req
              ),

            reason:
              req.body?.reason,

          });


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            voucher,
            "Voucher voided successfully."
          )
        );

    }
  );

/* ============================================================
   ADD VOUCHER ATTACHMENTS

   POST /accounting/vouchers/:voucherId/attachments
============================================================ */

export const addVoucherAttachments =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const voucher =
        await voucherService
          .addAttachments({

            companyId:
              companyIdForRequest(
                req
              ),

            voucherId:
              req.params.voucherId,

            userId:
              userIdForRequest(
                req
              ),

            files:
              req.files || [],

          });


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            voucher,
            "Voucher proof uploaded successfully."
          )
        );

    }
  );


/* ============================================================
   REMOVE VOUCHER ATTACHMENT

   DELETE /accounting/vouchers/:voucherId/attachments/:attachmentId
============================================================ */

export const removeVoucherAttachment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const voucher =
        await voucherService
          .removeAttachment({

            companyId:
              companyIdForRequest(
                req
              ),

            voucherId:
              req.params.voucherId,

            attachmentId:
              req.params.attachmentId,

            userId:
              userIdForRequest(
                req
              ),

          });


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            voucher,
            "Voucher proof removed successfully."
          )
        );

    }
  );
