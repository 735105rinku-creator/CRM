import { ROLES } from "../constants/roles.js";

import {
  createWarehouseOutgoingSchema,
  updateWarehouseOutgoingSchema,
  warehouseOutgoingQuerySchema,
} from "../validators/warehouseOutgoing.validator.js";

import warehouseOutgoingService
  from "../services/warehouseOutgoing.service.js";

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

export const createWarehouseOutgoing =
  asyncHandler(async (req, res) => {
    const payload = validate(
      createWarehouseOutgoingSchema,
      req.body
    );

    const result =
      await warehouseOutgoingService.createOutgoing(
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
        "Outgoing record created successfully"
      )
    );
  });

export const getWarehouseOutgoing =
  asyncHandler(async (req, res) => {
    const query = validate(
      warehouseOutgoingQuerySchema,
      req.query
    );

    const result =
      await warehouseOutgoingService.listOutgoing(
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
        "Outgoing records fetched successfully"
      )
    );
  });

export const getWarehouseOutgoingSummary =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseOutgoingService.getSummary({
        companyId:
          companyIdForRequest(req),
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Outgoing summary fetched successfully"
      )
    );
  });

export const getWarehouseOutgoingById =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseOutgoingService.getOutgoing(
        {
          companyId:
            companyIdForRequest(req),

          outgoingId:
            req.params.id,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Outgoing record fetched successfully"
      )
    );
  });

export const updateWarehouseOutgoing =
  asyncHandler(async (req, res) => {
    const payload = validate(
      updateWarehouseOutgoingSchema,
      req.body
    );

    const result =
      await warehouseOutgoingService.updateOutgoing(
        {
          companyId:
            companyIdForRequest(req),

          outgoingId:
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
        "Outgoing record updated successfully"
      )
    );
  });

export const dispatchWarehouseOutgoing =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseOutgoingService.dispatch({
        companyId:
          companyIdForRequest(req),

        outgoingId:
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
        "Outgoing record dispatched"
      )
    );
  });

export const deliverWarehouseOutgoing =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseOutgoingService.markDelivered(
        {
          companyId:
            companyIdForRequest(req),

          outgoingId:
            req.params.id,

          userId:
            req.user?._id || null,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Outgoing record marked delivered"
      )
    );
  });

export const cancelWarehouseOutgoing =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseOutgoingService.cancel({
        companyId:
          companyIdForRequest(req),

        outgoingId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Outgoing record cancelled"
      )
    );
  });

export const deleteWarehouseOutgoing =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseOutgoingService.deleteOutgoing(
        {
          companyId:
            companyIdForRequest(req),

          outgoingId:
            req.params.id,

          userId:
            req.user?._id || null,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Outgoing record deleted successfully"
      )
    );
  });