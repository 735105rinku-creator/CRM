import {
  createGoodsReceiptSchema,
  goodsReceiptIdParamSchema,
  goodsReceiptPurchaseOrderParamSchema,
  goodsReceiptQuerySchema,
  approveGoodsReceiptSchema,
  rejectGoodsReceiptSchema
} from "../validators/goodsReceipt.validator.js";

import goodsReceiptService from "../services/goodsReceipt.service.js";

import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


/* ============================================================
   HELPERS
============================================================ */

const companyIdForRequest = (
  req
) => {

  const companyId =
    req.purchaseAccess?.companyId;


  if (
    !companyId
  ) {

    throw new ApiError(
      403,
      "Purchase company access is required."
    );
  }


  return companyId;
};


const validate = (
  schema,
  source
) => {

  const {
    error,
    value
  } =
    schema.validate(
      source,
      {
        abortEarly:
          false,

        stripUnknown:
          true,

        convert:
          true
      }
    );


  if (
    error
  ) {

    const message =
      error.details
        ?.map(
          (
            detail
          ) =>
            detail.message
        )
        .join(
          ", "
        ) ||
      error.message ||
      "Validation failed.";


    throw new ApiError(
      400,
      message
    );
  }


  return value;
};


/* ============================================================
   CREATE GRN
============================================================ */

export const createGoodsReceipt =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const payload =
        validate(
          createGoodsReceiptSchema,
          req.body
        );


      const goodsReceipt =
        await goodsReceiptService
          .create(
            companyId,
            payload,
            req.user,
            req.purchaseAccess
          );


      return res
        .status(
          201
        )
        .json(
          new ApiResponse(
            201,
            goodsReceipt,
            "Goods Receipt created successfully."
          )
        );

    }
  );


/* ============================================================
   LIST GRNs
============================================================ */

export const listGoodsReceipts =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const filters =
        validate(
          goodsReceiptQuerySchema,
          req.query
        );


      const result =
        await goodsReceiptService
          .list(
            companyId,
            filters,
            req.purchaseAccess,
            req.user
          );


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Goods Receipts fetched successfully."
          )
        );

    }
  );


/* ============================================================
   GET GRN BY ID

   Junior:
   - own GRN only.

   Senior:
   - may open own/team GRNs.
============================================================ */

export const getGoodsReceiptById =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const {
        id
      } =
        validate(
          goodsReceiptIdParamSchema,
          req.params
        );


      const goodsReceipt =
        await goodsReceiptService
          .getById(
            companyId,
            id,
            req.purchaseAccess,
            req.user
          );


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            goodsReceipt,
            "Goods Receipt fetched successfully."
          )
        );

    }
  );


/* ============================================================
   GET ALL GRNs FOR PURCHASE ORDER

   Junior:
   - own GRN history.

   Senior:
   - complete team GRN history.
============================================================ */

export const getGoodsReceiptsByPurchaseOrder =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const {
        purchaseOrderId
      } =
        validate(
          goodsReceiptPurchaseOrderParamSchema,
          req.params
        );


      const goodsReceipts =
        await goodsReceiptService
          .getByPurchaseOrder(
            companyId,
            purchaseOrderId,
            req.purchaseAccess,
            req.user
          );


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            goodsReceipts,
            "Purchase Order Goods Receipts fetched successfully."
          )
        );

    }
  );


/* ============================================================
   PURCHASE ORDER RECEIPT SUMMARY

   Operational summary:
   intentionally not employee-scoped.
============================================================ */

export const getPurchaseOrderReceiptSummary =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const {
        purchaseOrderId
      } =
        validate(
          goodsReceiptPurchaseOrderParamSchema,
          req.params
        );


      const summary =
        await goodsReceiptService
          .purchaseOrderReceiptSummary(
            companyId,
            purchaseOrderId
          );


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            summary,
            "Purchase Order receipt summary fetched successfully."
          )
        );

    }
  );


/* ============================================================
   STATUS COUNTS

   Junior:
   - own counts.

   Senior:
   - Team Work by default.
   - My Work when scope=my.
============================================================ */

export const getGoodsReceiptStatusCounts =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const filters =
        validate(
          goodsReceiptQuerySchema,
          req.query
        );


      const counts =
        await goodsReceiptService
          .statusCounts(
            companyId,
            req.purchaseAccess,
            req.user,
            filters
          );


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            counts,
            "Goods Receipt status counts fetched successfully."
          )
        );

    }
  );


/* ============================================================
   APPROVE GRN

   Purchase Senior only.
============================================================ */

export const approveGoodsReceipt =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const {
        id
      } =
        validate(
          goodsReceiptIdParamSchema,
          req.params
        );


      validate(
        approveGoodsReceiptSchema,
        req.body ||
        {}
      );


      const goodsReceipt =
        await goodsReceiptService
          .approve(
            companyId,
            id,
            req.user,
            req.purchaseAccess
          );


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            goodsReceipt,
            "Goods Receipt approved successfully."
          )
        );

    }
  );


/* ============================================================
   REJECT GRN

   Purchase Senior only.
============================================================ */

export const rejectGoodsReceipt =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const {
        id
      } =
        validate(
          goodsReceiptIdParamSchema,
          req.params
        );


      const payload =
        validate(
          rejectGoodsReceiptSchema,
          req.body ||
          {}
        );


      const goodsReceipt =
        await goodsReceiptService
          .reject(
            companyId,
            id,
            payload.reason,
            req.user,
            req.purchaseAccess
          );


      return res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            goodsReceipt,
            "Goods Receipt rejected successfully."
          )
        );

    }
  );