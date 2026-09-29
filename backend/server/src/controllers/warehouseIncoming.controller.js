import { ROLES } from "../constants/roles.js";

import {
  createWarehouseIncomingSchema,
  updateWarehouseIncomingSchema,
  warehouseIncomingQuerySchema,
} from "../validators/warehouseIncoming.validator.js";

import warehouseIncomingService
  from "../services/warehouseIncoming.service.js";

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

export const createWarehouseIncoming =
  asyncHandler(async (req, res) => {
    const payload = validate(
      createWarehouseIncomingSchema,
      req.body
    );

    const result =
      await warehouseIncomingService.createIncoming(
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
        "Incoming record created successfully"
      )
    );
  });

export const getWarehouseIncoming =
  asyncHandler(async (req, res) => {
    const query = validate(
      warehouseIncomingQuerySchema,
      req.query
    );

    const result =
      await warehouseIncomingService.listIncoming(
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
        "Incoming records fetched successfully"
      )
    );
  });

export const getWarehouseIncomingSummary =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseIncomingService.getSummary({
        companyId:
          companyIdForRequest(req),
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Incoming summary fetched successfully"
      )
    );
  });

export const getWarehouseIncomingById =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseIncomingService.getIncoming(
        {
          companyId:
            companyIdForRequest(req),

          incomingId:
            req.params.id,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Incoming record fetched successfully"
      )
    );
  });

export const updateWarehouseIncoming =
  asyncHandler(async (req, res) => {
    const payload = validate(
      updateWarehouseIncomingSchema,
      req.body
    );

    const result =
      await warehouseIncomingService.updateIncoming(
        {
          companyId:
            companyIdForRequest(req),

          incomingId:
            req.params.id,

          userId:
            req.user?._id || null,

          payload,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Incoming record updated successfully"
      )
    );
  });

export const markWarehouseIncomingReceived =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseIncomingService.markReceived(
        {
          companyId:
            companyIdForRequest(req),

          incomingId:
            req.params.id,

          userId:
            req.user?._id || null,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Incoming record marked as received"
      )
    );
  });

export const confirmWarehouseIncoming =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseIncomingService.confirm({
        companyId:
          companyIdForRequest(req),

        incomingId:
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
        "Incoming record confirmed"
      )
    );
  });

export const cancelWarehouseIncoming =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseIncomingService.cancel({
        companyId:
          companyIdForRequest(req),

        incomingId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Incoming record cancelled"
      )
    );
  });

export const deleteWarehouseIncoming =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseIncomingService.deleteIncoming(
        {
          companyId:
            companyIdForRequest(req),

          incomingId:
            req.params.id,

          userId:
            req.user?._id || null,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Incoming record deleted successfully"
      )
    );
  });