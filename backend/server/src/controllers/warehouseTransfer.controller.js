import { ROLES } from "../constants/roles.js";

import {
  createWarehouseTransferSchema,
  warehouseTransferQuerySchema,
} from "../validators/warehouseTransfer.validator.js";

import warehouseTransferService
  from "../services/warehouseTransfer.service.js";

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

  if (req.user?.role !== ROLES.SUPER_ADMIN) {
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
  const { value, error } = schema.validate(
    source,
    {
      abortEarly: false,
      stripUnknown: true,
    }
  );

  if (error) {
    throw new ApiError(
      400,
      error.details[0].message,
      error.details
    );
  }

  return value;
}

export const createWarehouseTransfer =
  asyncHandler(async (req, res) => {
    const payload = validate(
      createWarehouseTransferSchema,
      req.body
    );

    const result =
      await warehouseTransferService.createTransfer(
        {
          companyId:
            companyIdForRequest(req),

          userId:
            req.user?._id || null,

          employeeId:
            req.warehouseAccess?.employeeId ||
            null,

          payload,
        }
      );

    res.status(201).json(
      new ApiResponse(
        201,
        result,
        "Transfer created successfully"
      )
    );
  });

export const getWarehouseTransfers =
  asyncHandler(async (req, res) => {
    const query = validate(
      warehouseTransferQuerySchema,
      req.query
    );

    const result =
      await warehouseTransferService.listTransfers(
        {
          companyId:
            companyIdForRequest(req),
          query,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Transfers fetched successfully"
      )
    );
  });

export const getWarehouseTransferSummary =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseTransferService.getSummary({
        companyId:
          companyIdForRequest(req),
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Transfer summary fetched successfully"
      )
    );
  });

export const getWarehouseTransferById =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseTransferService.getTransfer(
        {
          companyId:
            companyIdForRequest(req),

          transferId:
            req.params.id,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Transfer fetched successfully"
      )
    );
  });

export const completeWarehouseTransfer =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseTransferService.complete({
        companyId:
          companyIdForRequest(req),

        transferId:
          req.params.id,

        userId:
          req.user?._id || null,

        employeeId:
          req.warehouseAccess?.employeeId ||
          null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Transfer completed successfully"
      )
    );
  });

export const cancelWarehouseTransfer =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseTransferService.cancel({
        companyId:
          companyIdForRequest(req),

        transferId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Transfer cancelled successfully"
      )
    );
  });

export const deleteWarehouseTransfer =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseTransferService.deleteTransfer(
        {
          companyId:
            companyIdForRequest(req),

          transferId:
            req.params.id,

          userId:
            req.user?._id || null,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Transfer deleted successfully"
      )
    );
  });