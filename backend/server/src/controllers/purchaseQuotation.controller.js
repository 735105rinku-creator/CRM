import {
    createPurchaseQuotationSchema,
    purchaseQuotationComparisonSchema,
    purchaseQuotationIdParamSchema,
    purchaseQuotationQuerySchema,
    rejectPurchaseQuotationSchema,
    selectPurchaseQuotationSchema,
    updatePurchaseQuotationSchema,
    updatePurchaseQuotationStatusSchema
  } from "../validators/purchaseQuotation.validator.js";
  
  import purchaseQuotationService
    from "../services/purchaseQuotation.service.js";
  
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
  
        throw new ApiError(
          400,
          error.details
            .map(
              detail =>
                detail.message
            )
            .join(
              ", "
            )
        );
      }
  
  
      return value;
    };
  
  
  /* ============================================================
     CREATE
  ============================================================ */
  
  export const createPurchaseQuotation =
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
            createPurchaseQuotationSchema,
            req.body
          );
  
  
        const quotation =
          await purchaseQuotationService
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
              quotation,
              "Purchase quotation created successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     LIST
  ============================================================ */
  
  export const listPurchaseQuotations =
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
            purchaseQuotationQuerySchema,
            req.query
          );
  
  
        const result =
          await purchaseQuotationService
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
              "Purchase quotations fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     GET BY ID
  ============================================================ */
  
  export const getPurchaseQuotationById =
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
            purchaseQuotationIdParamSchema,
            req.params
          );
  
  
        const quotation =
          await purchaseQuotationService
            .getById(
              companyId,
              id
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              quotation,
              "Purchase quotation fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     UPDATE
  ============================================================ */
  
  export const updatePurchaseQuotation =
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
            purchaseQuotationIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            updatePurchaseQuotationSchema,
            req.body
          );
  
  
        const quotation =
          await purchaseQuotationService
            .update(
              companyId,
              id,
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
              quotation,
              "Purchase quotation updated successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     COMPARISON
  ============================================================ */
  
  export const comparePurchaseQuotations =
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
          purchaseRequestId
        } =
          validate(
            purchaseQuotationComparisonSchema,
            req.query
          );
  
  
        const rows =
          await purchaseQuotationService
            .comparison(
              companyId,
              purchaseRequestId
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              rows,
              "Quotation comparison fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     SELECT
  ============================================================ */
  
  export const selectPurchaseQuotation =
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
            purchaseQuotationIdParamSchema,
            req.params
          );
  
  
        validate(
          selectPurchaseQuotationSchema,
          req.body || {}
        );
  
  
        const quotation =
          await purchaseQuotationService
            .select(
              companyId,
              id,
              req.user
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              quotation,
              "Purchase quotation selected successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     REJECT
  ============================================================ */
  
  export const rejectPurchaseQuotation =
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
            purchaseQuotationIdParamSchema,
            req.params
          );
  
  
        const {
          reason = ""
        } =
          validate(
            rejectPurchaseQuotationSchema,
            req.body || {}
          );
  
  
        const quotation =
          await purchaseQuotationService
            .reject(
              companyId,
              id,
              req.user,
              reason
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              quotation,
              "Purchase quotation rejected successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     UPDATE OPERATIONAL STATUS
  ============================================================ */
  
  export const updatePurchaseQuotationStatus =
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
            purchaseQuotationIdParamSchema,
            req.params
          );
  
  
        const {
          status
        } =
          validate(
            updatePurchaseQuotationStatusSchema,
            req.body
          );
  
  
        const quotation =
          await purchaseQuotationService
            .updateStatus(
              companyId,
              id,
              req.user,
              status
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              quotation,
              "Purchase quotation status updated successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     STATUS COUNTS
  ============================================================ */
  
  export const getPurchaseQuotationStatusCounts =
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
          await purchaseQuotationService
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
              "Purchase quotation status counts fetched successfully."
            )
          );
      }
    );