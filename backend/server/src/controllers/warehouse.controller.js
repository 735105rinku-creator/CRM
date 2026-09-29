import { ROLES } from "../constants/roles.js";

import {
  createWarehouseSchema,
  updateWarehouseSchema,
  warehouseQuerySchema,
} from "../validators/warehouse.validator.js";

import warehouseService
  from "../services/warehouse.service.js";

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

export const createWarehouse =
  asyncHandler(async (req, res) => {
    const payload = validate(
      createWarehouseSchema,
      req.body
    );

    const result =
      await warehouseService.createWarehouse({
        companyId:
          companyIdForRequest(req),

        userId:
          req.user?._id || null,

        employeeId:
          req.warehouseAccess?.employeeId ||
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

export const getWarehouses =
  asyncHandler(async (req, res) => {
    const query = validate(
      warehouseQuerySchema,
      req.query
    );

    const result =
      await warehouseService.listWarehouses({
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

export const getWarehouseSummary =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseService.getSummary({
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

export const getWarehouseById =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseService.getWarehouse({
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

export const updateWarehouse =
  asyncHandler(async (req, res) => {
    const payload = validate(
      updateWarehouseSchema,
      req.body
    );

    const result =
      await warehouseService.updateWarehouse({
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

export const deleteWarehouse =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseService.deleteWarehouse({
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