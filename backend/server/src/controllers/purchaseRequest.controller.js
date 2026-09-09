import {
    createPurchaseRequestSchema,
    updatePurchaseRequestSchema,
    purchaseRequestIdParamSchema,
    purchaseRequestQuerySchema,
    submitPurchaseRequestSchema,
    approvePurchaseRequestSchema,
    rejectPurchaseRequestSchema,
    updatePurchaseRequestStatusSchema,
  } from "../validators/purchaseRequest.validator.js";
  
  import purchaseRequestService
    from "../services/purchaseRequest.service.js";
  
  import { ApiResponse }
    from "../utils/apiResponse.js";
  
  import { ApiError }
    from "../utils/apiError.js";
  
  import { asyncHandler }
    from "../utils/asyncHandler.js";
  
  
  /* ============================================================
     PURCHASE COMPANY CONTEXT
  ============================================================ */
  
  const companyIdForRequest = (req) => {
  
    const companyId =
      req.purchaseAccess?.companyId;
  
  
    if (
      !companyId
    ) {
  
      throw new ApiError(
        403,
        "Purchase company context missing."
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
     EMPLOYEE CODE
  ============================================================ */
  
  const employeeCodeForRequest = (req) =>
    req.user?.employeeCode ||
    req.purchaseAccess?.employeeCode ||
    "";
  
  
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
     CREATE PURCHASE REQUEST
  
     POST /purchase/requests
  ============================================================ */
  
  export const createPurchaseRequest =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const payload =
          validate(
            createPurchaseRequestSchema,
            req.body
          );
  
  
        const purchaseRequest =
          await purchaseRequestService
            .createPurchaseRequest({
  
              companyId:
                companyIdForRequest(req),
  
              userId:
                userIdForRequest(req),
  
              employeeCode:
                employeeCodeForRequest(req),
  
              payload,
  
            });
  
  
        return res
          .status(201)
          .json(
            new ApiResponse(
              201,
              purchaseRequest,
              "Purchase Request created successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     LIST PURCHASE REQUESTS
  
     GET /purchase/requests
  ============================================================ */
  
  export const getPurchaseRequests =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const query =
          validate(
            purchaseRequestQuerySchema,
            req.query
          );
  
  
        const purchaseRequests =
          await purchaseRequestService
            .listPurchaseRequests({
  
              companyId:
                companyIdForRequest(req),
  
              query,
  
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              purchaseRequests,
              "Purchase Requests fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     GET PURCHASE REQUEST
  
     GET /purchase/requests/:id
  ============================================================ */
  
  export const getPurchaseRequestById =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const params =
          validate(
            purchaseRequestIdParamSchema,
            req.params
          );
  
  
        const purchaseRequest =
          await purchaseRequestService
            .getPurchaseRequest({
  
              companyId:
                companyIdForRequest(req),
  
              purchaseRequestId:
                params.id,
  
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              purchaseRequest,
              "Purchase Request fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     UPDATE PURCHASE REQUEST
  
     PUT /purchase/requests/:id
  
     Only draft requests are editable.
  ============================================================ */
  
  export const updatePurchaseRequest =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const params =
          validate(
            purchaseRequestIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            updatePurchaseRequestSchema,
            req.body
          );
  
  
        const purchaseRequest =
          await purchaseRequestService
            .updatePurchaseRequest({
  
              companyId:
                companyIdForRequest(req),
  
              purchaseRequestId:
                params.id,
  
              userId:
                userIdForRequest(req),
  
              payload,
  
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              purchaseRequest,
              "Purchase Request updated successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     SUBMIT PURCHASE REQUEST
  
     PATCH /purchase/requests/:id/submit
  
     Workflow:
       draft -> pending_approval
  ============================================================ */
  
  export const submitPurchaseRequest =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const params =
          validate(
            purchaseRequestIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            submitPurchaseRequestSchema,
            req.body ||
              {}
          );
  
  
        const purchaseRequest =
          await purchaseRequestService
            .submitPurchaseRequest({
  
              companyId:
                companyIdForRequest(req),
  
              purchaseRequestId:
                params.id,
  
              userId:
                userIdForRequest(req),
  
              remarks:
                payload.remarks ||
                "",
  
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              purchaseRequest,
              "Purchase Request submitted for approval successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     APPROVE PURCHASE REQUEST
  
     PATCH /purchase/requests/:id/approve
  
     Workflow:
       pending_approval -> approved
  
     IMPORTANT:
     Approval permission will be enforced by Purchase route /
     middleware access controls, not by client payload.
  ============================================================ */
  
  export const approvePurchaseRequest =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const params =
          validate(
            purchaseRequestIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            approvePurchaseRequestSchema,
            req.body ||
              {}
          );
  
  
        const purchaseRequest =
          await purchaseRequestService
            .approvePurchaseRequest({
  
              companyId:
                companyIdForRequest(req),
  
              purchaseRequestId:
                params.id,
  
              userId:
                userIdForRequest(req),
  
              remarks:
                payload.remarks ||
                "",
  
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              purchaseRequest,
              "Purchase Request approved successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     REJECT PURCHASE REQUEST
  
     PATCH /purchase/requests/:id/reject
  
     Workflow:
       pending_approval -> rejected
  ============================================================ */
  
  export const rejectPurchaseRequest =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const params =
          validate(
            purchaseRequestIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            rejectPurchaseRequestSchema,
            req.body
          );
  
  
        const purchaseRequest =
          await purchaseRequestService
            .rejectPurchaseRequest({
  
              companyId:
                companyIdForRequest(req),
  
              purchaseRequestId:
                params.id,
  
              userId:
                userIdForRequest(req),
  
              rejectionReason:
                payload.rejectionReason,
  
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              purchaseRequest,
              "Purchase Request rejected successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     GENERIC STATUS UPDATE
  
     PATCH /purchase/requests/:id/status
  
     This exists because the current Angular Purchase service
     already exposes this endpoint.
  
     The service does NOT permit arbitrary status mutation.
  ============================================================ */
  
  export const updatePurchaseRequestStatus =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const params =
          validate(
            purchaseRequestIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            updatePurchaseRequestStatusSchema,
            req.body
          );
  
  
        const purchaseRequest =
          await purchaseRequestService
            .updatePurchaseRequestStatus({
  
              companyId:
                companyIdForRequest(req),
  
              purchaseRequestId:
                params.id,
  
              userId:
                userIdForRequest(req),
  
              status:
                payload.status,
  
              remarks:
                payload.remarks ||
                "",
  
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              purchaseRequest,
              "Purchase Request status updated successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     PURCHASE REQUEST STATUS COUNTS
  
     GET /purchase/requests/status-counts
  
     This provides the first real-data foundation for the
     Purchase Dashboard.
  ============================================================ */
  
  export const getPurchaseRequestStatusCounts =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const counts =
          await purchaseRequestService
            .getStatusCounts({
  
              companyId:
                companyIdForRequest(req),
  
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              counts,
              "Purchase Request status counts fetched successfully."
            )
          );
      }
    );