import {
    createVendorEnquirySchema,
    updateVendorEnquirySchema,
    vendorEnquiryQuerySchema,
    vendorEnquiryIdParamSchema,
    requestVendorEnquirySchema,
    receiveVendorEnquirySchema,
    updateVendorEnquiryStatusSchema,
  } from "../validators/vendorEnquiry.validator.js";
  
  import vendorEnquiryService
    from "../services/vendorEnquiry.service.js";
  
  import { ApiResponse }
    from "../utils/apiResponse.js";
  
  import { ApiError }
    from "../utils/apiError.js";
  
  import { asyncHandler }
    from "../utils/asyncHandler.js";
  
  
  /* ============================================================
     HELPERS
  ============================================================ */
  
  const companyIdForRequest = (
    req
  ) => {
  
    const companyId =
      req.purchaseAccess
        ?.companyId;
  
  
    if (
      !companyId
    ) {
  
      throw new ApiError(
        403,
        "Purchase company context is unavailable."
      );
    }
  
  
    return companyId;
  };
  
  
  const userIdForRequest = (
    req
  ) =>
    req.user?._id ||
    req.user?.id ||
    null;
  
  
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
  
      const message =
        error.details
          .map(
            (
              detail
            ) =>
              detail.message
          )
          .join(", ");
  
  
      throw new ApiError(
        400,
        message
      );
    }
  
  
    return value;
  };
  
  
  /* ============================================================
     CREATE
     POST /purchase/vendor-enquiries
  ============================================================ */
  
  export const createVendorEnquiry =
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
            createVendorEnquirySchema,
            req.body
          );
  
  
        const record =
          await vendorEnquiryService
            .createVendorEnquiry({
              companyId,
  
              userId:
                userIdForRequest(
                  req
                ),
  
              payload,
            });
  
  
        return res
          .status(201)
          .json(
            new ApiResponse(
              201,
              record,
              "Vendor enquiry created successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     LIST
     GET /purchase/vendor-enquiries
  ============================================================ */
  
  export const getVendorEnquiries =
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
            vendorEnquiryQuerySchema,
            req.query
          );
  
  
        const result =
          await vendorEnquiryService
            .listVendorEnquiries({
              companyId,
              query,
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              result,
              "Vendor enquiries fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     STATUS COUNTS
     GET /purchase/vendor-enquiries/status-counts
  ============================================================ */
  
  export const getVendorEnquiryStatusCounts =
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
          await vendorEnquiryService
            .getStatusCounts({
              companyId,
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              counts,
              "Vendor enquiry status counts fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     GET ONE
     GET /purchase/vendor-enquiries/:id
  ============================================================ */
  
  export const getVendorEnquiryById =
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
            vendorEnquiryIdParamSchema,
            req.params
          );
  
  
        const record =
          await vendorEnquiryService
            .getVendorEnquiry({
              companyId,
  
              vendorEnquiryId:
                params.id,
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              record,
              "Vendor enquiry fetched successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     UPDATE DRAFT
     PUT /purchase/vendor-enquiries/:id
  ============================================================ */
  
  export const updateVendorEnquiry =
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
            vendorEnquiryIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            updateVendorEnquirySchema,
            req.body
          );
  
  
        const record =
          await vendorEnquiryService
            .updateVendorEnquiry({
              companyId,
  
              vendorEnquiryId:
                params.id,
  
              userId:
                userIdForRequest(
                  req
                ),
  
              payload,
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              record,
              "Vendor enquiry updated successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     SEND RFQ
     PATCH /purchase/vendor-enquiries/:id/request
  ============================================================ */
  
  export const requestVendorEnquiry =
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
            vendorEnquiryIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            requestVendorEnquirySchema,
            req.body ||
            {}
          );
  
  
        const record =
          await vendorEnquiryService
            .requestVendorEnquiry({
              companyId,
  
              vendorEnquiryId:
                params.id,
  
              userId:
                userIdForRequest(
                  req
                ),
  
              remarks:
                payload.remarks,
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              record,
              "Vendor enquiry sent as RFQ successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     RECEIVE QUOTATION
     PATCH /purchase/vendor-enquiries/:id/receive
  ============================================================ */
  
  export const receiveVendorEnquiry =
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
            vendorEnquiryIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            receiveVendorEnquirySchema,
            req.body
          );
  
  
        const record =
          await vendorEnquiryService
            .receiveVendorEnquiry({
              companyId,
  
              vendorEnquiryId:
                params.id,
  
              userId:
                userIdForRequest(
                  req
                ),
  
              payload,
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              record,
              "Vendor quotation received successfully."
            )
          );
      }
    );
  
  
  /* ============================================================
     STATUS UPDATE
     PATCH /purchase/vendor-enquiries/:id/status
  ============================================================ */
  
  export const updateVendorEnquiryStatus =
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
            vendorEnquiryIdParamSchema,
            req.params
          );
  
  
        const payload =
          validate(
            updateVendorEnquiryStatusSchema,
            req.body
          );
  
  
        const record =
          await vendorEnquiryService
            .updateVendorEnquiryStatus({
              companyId,
  
              vendorEnquiryId:
                params.id,
  
              userId:
                userIdForRequest(
                  req
                ),
  
              status:
                payload.status,
  
              remarks:
                payload.remarks,
            });
  
  
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              record,
              "Vendor enquiry status updated successfully."
            )
          );
      }
    );