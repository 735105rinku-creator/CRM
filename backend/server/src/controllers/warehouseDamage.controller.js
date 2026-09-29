import { ROLES } from "../constants/roles.js";

import {
  createWarehouseDamageSchema,
  warehouseDamageQuerySchema,
} from "../validators/warehouseDamage.validator.js";

import warehouseDamageService
  from "../services/warehouseDamage.service.js";

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

export const createWarehouseDamage =
  asyncHandler(async (req, res) => {
    const payload = validate(
      createWarehouseDamageSchema,
      req.body
    );

    const result =
      await warehouseDamageService.createDamage(
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
        "Damage record created successfully"
      )
    );
  });

export const getWarehouseDamages =
  asyncHandler(async (req, res) => {
    const query = validate(
      warehouseDamageQuerySchema,
      req.query
    );

    const result =
      await warehouseDamageService.listDamages({
        companyId:
          companyIdForRequest(req),
        query,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Damage records fetched successfully"
      )
    );
  });

export const getWarehouseDamageSummary =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseDamageService.getSummary({
        companyId:
          companyIdForRequest(req),
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Damage summary fetched successfully"
      )
    );
  });

export const getWarehouseDamageById =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseDamageService.getDamage({
        companyId:
          companyIdForRequest(req),

        damageId:
          req.params.id,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Damage record fetched successfully"
      )
    );
  });

export const reviewWarehouseDamage =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseDamageService.markUnderReview(
        {
          companyId:
            companyIdForRequest(req),

          damageId:
            req.params.id,

          userId:
            req.user?._id || null,
        }
      );

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Damage record marked under review"
      )
    );
  });

export const approveWarehouseDamage =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseDamageService.approve({
        companyId:
          companyIdForRequest(req),

        damageId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Damage record approved"
      )
    );
  });

export const removeWarehouseDamage =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseDamageService.markRemoved({
        companyId:
          companyIdForRequest(req),

        damageId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Damage record marked removed from stock"
      )
    );
  });

export const deleteWarehouseDamage =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseDamageService.deleteDamage({
        companyId:
          companyIdForRequest(req),

        damageId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Damage record deleted successfully"
      )
    );
  });