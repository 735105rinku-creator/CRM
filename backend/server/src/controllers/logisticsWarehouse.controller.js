import { ROLES } from "../constants/roles.js";

import {
  createLogisticsWarehouseSchema,
  updateLogisticsWarehouseSchema,
  createWarehouseReceiptSchema,
  updateWarehouseReceiptSchema,
  logisticsWarehouseQuerySchema,
} from "../validators/logisticsWarehouse.validator.js";

import logisticsWarehouseService
  from "../services/logisticsWarehouse.service.js";

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
  const {
    value,
    error,
  } = schema.validate(
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

export const createLogisticsWarehouse =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        createLogisticsWarehouseSchema,
        req.body
      );

    const result =
      await logisticsWarehouseService.createWarehouse({
        companyId:
          companyIdForRequest(req),

        userId:
          req.user?._id || null,

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
        "Warehouse created successfully"
      )
    );
  });

export const getLogisticsWarehouses =
  asyncHandler(async (req, res) => {
    const query =
      validate(
        logisticsWarehouseQuerySchema,
        req.query
      );

    const result =
      await logisticsWarehouseService.listWarehouses({
        companyId:
          companyIdForRequest(req),
        query,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouses fetched successfully"
      )
    );
  });

export const getLogisticsWarehouseSummary =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsWarehouseService.getSummary({
        companyId:
          companyIdForRequest(req),
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse summary fetched successfully"
      )
    );
  });

export const getLogisticsWarehouseById =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsWarehouseService.getWarehouse({
        companyId:
          companyIdForRequest(req),

        warehouseId:
          req.params.id,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse fetched successfully"
      )
    );
  });

export const updateLogisticsWarehouse =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        updateLogisticsWarehouseSchema,
        req.body
      );

    const result =
      await logisticsWarehouseService.updateWarehouse({
        companyId:
          companyIdForRequest(req),

        warehouseId:
          req.params.id,

        userId:
          req.user?._id || null,

        payload,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse updated successfully"
      )
    );
  });

export const addWarehouseReceipt =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        createWarehouseReceiptSchema,
        req.body
      );

    const result =
      await logisticsWarehouseService.addReceipt({
        companyId:
          companyIdForRequest(req),

        warehouseId:
          req.params.id,

        userId:
          req.user?._id || null,

        payload,
      });

    res.status(201).json(
      new ApiResponse(
        201,
        result,
        "Warehouse receipt created successfully"
      )
    );
  });

export const updateWarehouseReceipt =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        updateWarehouseReceiptSchema,
        req.body
      );

    const result =
      await logisticsWarehouseService.updateReceipt({
        companyId:
          companyIdForRequest(req),

        warehouseId:
          req.params.id,

        receiptId:
          req.params.receiptId,

        userId:
          req.user?._id || null,

        payload,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse receipt updated successfully"
      )
    );
  });

export const deleteLogisticsWarehouse =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsWarehouseService.deleteWarehouse({
        companyId:
          companyIdForRequest(req),

        warehouseId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse deleted successfully"
      )
    );
  });