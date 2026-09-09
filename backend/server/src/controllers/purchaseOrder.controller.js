import {
    approvePurchaseOrderSchema,
    cancelPurchaseOrderSchema,
    createPurchaseOrderSchema,
    purchaseOrderIdParamSchema,
    purchaseOrderQuerySchema,
    sendPurchaseOrderSchema,
    updatePurchaseOrderSchema
  } from "../validators/purchaseOrder.validator.js";
  
  import purchaseOrderService
    from "../services/purchaseOrder.service.js";
  
  import {
    ApiResponse
  } from "../utils/apiResponse.js";
  
  import {
    ApiError
  } from "../utils/apiError.js";
  
  import {
    asyncHandler
  } from "../utils/asyncHandler.js";
  
  
  /* ============================================================
     HELPERS
  ============================================================ */
  
  const companyIdForRequest =
    req => {
  
      const companyId =
        req.purchaseAccess?.companyId;
  
  
      if (
        !companyId
      ) {
  
        throw new ApiError(
          403,
          "Purchase company access could not be resolved."
        );
      }
  
  
      return companyId;
    };
  
  
  const validate =
    (
      schema,
      source
    ) => {
  
      const {
        value,
        error
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
            .map(
              detail =>
                detail.message
            )
            .join(
              ", "
            );
  
  
        throw new ApiError(
          400,
          message
        );
      }
  
  
      return value;
    };
  
  
  /* ============================================================
     CREATE
  ============================================================ */
  
  export const createPurchaseOrder =
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
            createPurchaseOrderSchema,
            req.body
          );
  
  
        const purchaseOrder =
          await purchaseOrderService
            .create(
              companyId,
              req.user,
              payload
            );
  
  
        return res
          .status(
            201
          )
          .json(
            new ApiResponse(
              201,
              purchaseOrder,
              "Purchase Order created successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     LIST
  ============================================================ */
  
  export const listPurchaseOrders =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const query =
          validate(
            purchaseOrderQuerySchema,
            req.query
          );
  
  
        const result =
          await purchaseOrderService
            .list(
              companyId,
              query
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              result,
              "Purchase Orders fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     GET BY ID
  ============================================================ */
  
  export const getPurchaseOrderById =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const params =
          validate(
            purchaseOrderIdParamSchema,
            req.params
          );
  
  
        const purchaseOrder =
          await purchaseOrderService
            .getById(
              companyId,
              params.id
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              purchaseOrder,
              "Purchase Order fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     UPDATE
  ============================================================ */
  
  export const updatePurchaseOrder =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const params =
          validate(
            purchaseOrderIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            updatePurchaseOrderSchema,
            req.body
          );
  
  
        const purchaseOrder =
          await purchaseOrderService
            .update(
              companyId,
              params.id,
              req.user,
              payload
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              purchaseOrder,
              "Purchase Order updated successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     APPROVE
     Purchase Senior only.
  ============================================================ */
  
  export const approvePurchaseOrder =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const params =
          validate(
            purchaseOrderIdParamSchema,
            req.params
          );
  
  
        /*
         * Schema currently accepts optional remarks.
         * Approval workflow state is controlled by service/repository.
         */
        validate(
          approvePurchaseOrderSchema,
          req.body ||
          {}
        );
  
  
        const purchaseOrder =
          await purchaseOrderService
            .approve(
              companyId,
              params.id,
              req.user
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              purchaseOrder,
              "Purchase Order approved successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     SEND TO VENDOR
  ============================================================ */
  
  export const sendPurchaseOrder =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const params =
          validate(
            purchaseOrderIdParamSchema,
            req.params
          );
  
  
        validate(
          sendPurchaseOrderSchema,
          req.body ||
          {}
        );
  
  
        const purchaseOrder =
          await purchaseOrderService
            .send(
              companyId,
              params.id,
              req.user
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              purchaseOrder,
              "Purchase Order marked as sent successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     CANCEL
  ============================================================ */
  
  export const cancelPurchaseOrder =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const params =
          validate(
            purchaseOrderIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            cancelPurchaseOrderSchema,
            req.body
          );
  
  
        const purchaseOrder =
          await purchaseOrderService
            .cancel(
              companyId,
              params.id,
              req.user,
              payload.reason
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              purchaseOrder,
              "Purchase Order cancelled successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     STATUS COUNTS
  ============================================================ */
  
  export const getPurchaseOrderStatusCounts =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const counts =
          await purchaseOrderService
            .statusCounts(
              companyId
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              counts,
              "Purchase Order status counts fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     DELIVERY SUMMARY
  ============================================================ */
  
  export const getPurchaseOrderDeliverySummary =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const summary =
          await purchaseOrderService
            .deliverySummary(
              companyId
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              summary,
              "Purchase Order delivery summary fetched successfully."
            )
          );
      }
    );