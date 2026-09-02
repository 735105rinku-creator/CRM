import { ROLES } from "../constants/roles.js";
import {
  createLogisticsChaSchema,
  updateLogisticsChaSchema,
  updateLogisticsChaStatusSchema,
  logisticsChaQuerySchema,
} from "../validators/logisticsCha.validator.js";

import logisticsChaService from "../services/logisticsCha.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

export const createLogisticsCha =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        createLogisticsChaSchema,
        req.body
      );

    const record =
      await logisticsChaService.createCase({
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
        record,
        "CHA case created successfully"
      )
    );
  });

export const getLogisticsChaCases =
  asyncHandler(async (req, res) => {
    const query =
      validate(
        logisticsChaQuerySchema,
        req.query
      );

    const result =
      await logisticsChaService.listCases({
        companyId:
          companyIdForRequest(req),
        query,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "CHA cases fetched successfully"
      )
    );
  });

export const getLogisticsChaSummary =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsChaService.getSummary({
        companyId:
          companyIdForRequest(req),
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "CHA summary fetched successfully"
      )
    );
  });

export const getLogisticsChaById =
  asyncHandler(async (req, res) => {
    const record =
      await logisticsChaService.getCase({
        companyId:
          companyIdForRequest(req),
        chaId:
          req.params.id,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        record,
        "CHA case fetched successfully"
      )
    );
  });

export const updateLogisticsCha =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        updateLogisticsChaSchema,
        req.body
      );

    const record =
      await logisticsChaService.updateCase({
        companyId:
          companyIdForRequest(req),

        chaId:
          req.params.id,

        userId:
          req.user?._id || null,

        payload,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        record,
        "CHA case updated successfully"
      )
    );
  });

export const updateLogisticsChaStatus =
  asyncHandler(async (req, res) => {
    const payload =
      validate(
        updateLogisticsChaStatusSchema,
        req.body
      );

    const record =
      await logisticsChaService.updateStatus({
        companyId:
          companyIdForRequest(req),

        chaId:
          req.params.id,

        userId:
          req.user?._id || null,

        status:
          payload.status,

        statusOther:
          payload.statusOther,

        remarks:
          payload.remarks,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        record,
        "CHA status updated successfully"
      )
    );
  });

export const deleteLogisticsCha =
  asyncHandler(async (req, res) => {
    const result =
      await logisticsChaService.deleteCase({
        companyId:
          companyIdForRequest(req),

        chaId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "CHA case deleted successfully"
      )
    );
  });