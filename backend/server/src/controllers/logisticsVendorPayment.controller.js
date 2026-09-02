import { ROLES }
  from "../constants/roles.js";

import {
  createLogisticsVendorPaymentSchema,
  updateLogisticsVendorPaymentSchema,
  addVendorPaymentTransactionSchema,
  logisticsVendorPaymentQuerySchema,
} from "../validators/logisticsVendorPayment.validator.js";

import logisticsVendorPaymentService
  from "../services/logisticsVendorPayment.service.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";

const companyIdForRequest = (req) => {
  const authCompanyId =
    req.auth?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId;

  if (
    req.user?.role !==
    ROLES.SUPER_ADMIN
  ) {
    if (!authCompanyId) {
      throw new ApiError(
        403,
        "Company context missing"
      );
    }

    return authCompanyId;
  }

  const requestedCompanyId =
    req.query?.companyId ||
    req.body?.companyId ||
    authCompanyId;

  if (!requestedCompanyId) {
    throw new ApiError(
      400,
      "companyId is required for Super Admin"
    );
  }

  return requestedCompanyId;
};

function validate(
  schema,
  source
) {
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
      }
    );

  if (error) {
    throw new ApiError(
      400,
      error.details[0]
        .message,
      error.details
    );
  }

  return value;
}

export const createLogisticsVendorPayment =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        createLogisticsVendorPaymentSchema,
        req.body
      );

    const result =
      await logisticsVendorPaymentService
        .createPaymentRecord({
          companyId:
            companyIdForRequest(
              req
            ),

          userId:
            req.user?._id ||
            null,

          employeeId:
            req.logisticsAccess
              ?.employeeId ||
            null,

          payload,
        });

    res.status(201).json(
      new ApiResponse(
        201,
        result,
        "Vendor payment record created successfully"
      )
    );
  });

export const getLogisticsVendorPayments =
  asyncHandler(async (req, res) => {
    const query =
      validate(
        logisticsVendorPaymentQuerySchema,
        req.query
      );

    const result =
      await logisticsVendorPaymentService
        .listPaymentRecords({
          companyId:
            companyIdForRequest(
              req
            ),

          query,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Vendor payment records fetched successfully"
      )
    );
  });

export const getLogisticsVendorPaymentSummary =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsVendorPaymentService
        .getSummary({
          companyId:
            companyIdForRequest(
              req
            ),
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Vendor payment summary fetched successfully"
      )
    );
  });

export const getLogisticsVendorPaymentById =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsVendorPaymentService
        .getPaymentRecord({
          companyId:
            companyIdForRequest(
              req
            ),

          paymentId:
            req.params.id,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Vendor payment record fetched successfully"
      )
    );
  });

export const updateLogisticsVendorPayment =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        updateLogisticsVendorPaymentSchema,
        req.body
      );

    const result =
      await logisticsVendorPaymentService
        .updatePaymentRecord({
          companyId:
            companyIdForRequest(
              req
            ),

          paymentId:
            req.params.id,

          userId:
            req.user?._id ||
            null,

          payload,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Vendor payment record updated successfully"
      )
    );
  });

export const addLogisticsVendorPaymentTransaction =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        addVendorPaymentTransactionSchema,
        req.body
      );

    const result =
      await logisticsVendorPaymentService
        .addPayment({
          companyId:
            companyIdForRequest(
              req
            ),

          paymentId:
            req.params.id,

          userId:
            req.user?._id ||
            null,

          payload,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Vendor payment added successfully"
      )
    );
  });

export const deleteLogisticsVendorPayment =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsVendorPaymentService
        .deletePaymentRecord({
          companyId:
            companyIdForRequest(
              req
            ),

          paymentId:
            req.params.id,

          userId:
            req.user?._id ||
            null,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Vendor payment record deleted successfully"
      )
    );
  });
