import { ROLES }
  from "../constants/roles.js";

import {
  createLogisticsProductServiceSchema,
  updateLogisticsProductServiceSchema,
  logisticsProductServiceQuerySchema,
} from "../validators/logisticsProductService.validator.js";

import logisticsProductServiceService
  from "../services/logisticsProductService.service.js";

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

function validate(schema, source) {
  const { value, error } =
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

export const createLogisticsProductService =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        createLogisticsProductServiceSchema,
        req.body
      );

    const result =
      await logisticsProductServiceService
        .createItem({
          companyId:
            companyIdForRequest(req),

          userId:
            req.user?._id || null,

          employeeId:
            req.logisticsAccess
              ?.employeeId || null,

          payload,
        });

    res.status(201).json(
      new ApiResponse(
        201,
        result,
        "Product/Service created successfully"
      )
    );
  });

export const getLogisticsProductServices =
  asyncHandler(async (req, res) => {
    const query =
      validate(
        logisticsProductServiceQuerySchema,
        req.query
      );

    const result =
      await logisticsProductServiceService
        .listItems({
          companyId:
            companyIdForRequest(req),

          query,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Products/Services fetched successfully"
      )
    );
  });

export const getLogisticsProductServiceSummary =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsProductServiceService
        .getSummary({
          companyId:
            companyIdForRequest(req),
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Products/Services summary fetched successfully"
      )
    );
  });

export const getLogisticsProductServiceById =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsProductServiceService
        .getItem({
          companyId:
            companyIdForRequest(req),

          itemId:
            req.params.id,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Product/Service fetched successfully"
      )
    );
  });

export const updateLogisticsProductService =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        updateLogisticsProductServiceSchema,
        req.body
      );

    const result =
      await logisticsProductServiceService
        .updateItem({
          companyId:
            companyIdForRequest(req),

          itemId:
            req.params.id,

          userId:
            req.user?._id || null,

          payload,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Product/Service updated successfully"
      )
    );
  });

export const deleteLogisticsProductService =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsProductServiceService
        .deleteItem({
          companyId:
            companyIdForRequest(req),

          itemId:
            req.params.id,

          userId:
            req.user?._id || null,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Product/Service deleted successfully"
      )
    );
  });
