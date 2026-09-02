import { ROLES } from "../constants/roles.js";

import {
  createLogisticsTransporterSchema,
  updateLogisticsTransporterSchema,
  logisticsTransporterQuerySchema,
} from "../validators/logisticsTransporter.validator.js";

import logisticsTransporterService
  from "../services/logisticsTransporter.service.js";

import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const companyIdForRequest = (req) => {
  const authCompanyId =
    req.auth?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId;

  if (req.user?.role !== ROLES.SUPER_ADMIN) {
    if (!authCompanyId) {
      throw new ApiError(403, "Company context missing");
    }
    return authCompanyId;
  }

  const requestedCompanyId =
    req.query?.companyId ||
    req.body?.companyId ||
    authCompanyId;

  if (!requestedCompanyId) {
    throw new ApiError(400, "companyId is required for Super Admin");
  }

  return requestedCompanyId;
};

function validate(schema, source) {
  const { value, error } = schema.validate(source, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new ApiError(400, error.details[0].message, error.details);
  }

  return value;
}

export const createLogisticsTransporter = asyncHandler(async (req, res) => {
  const payload = validate(createLogisticsTransporterSchema, req.body);

  const result = await logisticsTransporterService.createTransporter({
    companyId: companyIdForRequest(req),
    userId: req.user?._id || null,
    employeeId: req.logisticsAccess?.employeeId || null,
    payload,
  });

  res.status(201).json(
    new ApiResponse(201, result, "Transporter created successfully")
  );
});

export const getLogisticsTransporters = asyncHandler(async (req, res) => {
  const query = validate(logisticsTransporterQuerySchema, req.query);

  const result = await logisticsTransporterService.listTransporters({
    companyId: companyIdForRequest(req),
    query,
  });

  res.status(200).json(
    new ApiResponse(200, result, "Transporters fetched successfully")
  );
});

export const getLogisticsTransporterSummary = asyncHandler(
  async (req, res) => {
    const result = await logisticsTransporterService.getSummary({
      companyId: companyIdForRequest(req),
    });

    res.status(200).json(
      new ApiResponse(200, result, "Transporter summary fetched successfully")
    );
  }
);

export const getLogisticsTransporterById = asyncHandler(async (req, res) => {
  const result = await logisticsTransporterService.getTransporter({
    companyId: companyIdForRequest(req),
    transporterId: req.params.id,
  });

  res.status(200).json(
    new ApiResponse(200, result, "Transporter fetched successfully")
  );
});

export const updateLogisticsTransporter = asyncHandler(async (req, res) => {
  const payload = validate(updateLogisticsTransporterSchema, req.body);

  const result = await logisticsTransporterService.updateTransporter({
    companyId: companyIdForRequest(req),
    transporterId: req.params.id,
    userId: req.user?._id || null,
    payload,
  });

  res.status(200).json(
    new ApiResponse(200, result, "Transporter updated successfully")
  );
});

export const deleteLogisticsTransporter = asyncHandler(async (req, res) => {
  const result = await logisticsTransporterService.deleteTransporter({
    companyId: companyIdForRequest(req),
    transporterId: req.params.id,
    userId: req.user?._id || null,
  });

  res.status(200).json(
    new ApiResponse(200, result, "Transporter deleted successfully")
  );
});