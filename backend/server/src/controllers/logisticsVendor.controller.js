import { ROLES } from "../constants/roles.js";
import {
  createLogisticsVendorSchema,
  updateLogisticsVendorSchema,
  logisticsVendorQuerySchema,
} from "../validators/logisticsVendor.validator.js";
import logisticsVendorService from "../services/logisticsVendor.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const companyIdForRequest = (req) => {
  const authCompanyId = req.auth?.companyId || req.user?.companyId?._id || req.user?.companyId;
  if (req.user?.role !== ROLES.SUPER_ADMIN) {
    if (!authCompanyId) throw new ApiError(403, "Company context missing");
    return authCompanyId;
  }
  const requestedCompanyId = req.query?.companyId || req.body?.companyId || authCompanyId;
  if (!requestedCompanyId) throw new ApiError(400, "companyId is required for Super Admin");
  return requestedCompanyId;
};

function validate(schema, source) {
  const { value, error } = schema.validate(source, { abortEarly: false, stripUnknown: true });
  if (error) throw new ApiError(400, error.details[0].message, error.details);
  return value;
}

export const createLogisticsVendor = asyncHandler(async (req, res) => {
  const payload = validate(createLogisticsVendorSchema, req.body);
  const result = await logisticsVendorService.createVendor({
    companyId: companyIdForRequest(req),
    userId: req.user?._id || null,
    employeeId: req.logisticsAccess?.employeeId || null,
    payload,
  });
  res.status(201).json(new ApiResponse(201, result, "Logistics vendor created successfully"));
});

export const getLogisticsVendors = asyncHandler(async (req, res) => {
  const query = validate(logisticsVendorQuerySchema, req.query);
  const result = await logisticsVendorService.listVendors({ companyId: companyIdForRequest(req), query });
  res.status(200).json(new ApiResponse(200, result, "Logistics vendors fetched successfully"));
});

export const getLogisticsVendorSummary = asyncHandler(async (req, res) => {
  const result = await logisticsVendorService.getSummary({ companyId: companyIdForRequest(req) });
  res.status(200).json(new ApiResponse(200, result, "Logistics vendor summary fetched successfully"));
});

export const getLogisticsVendorById = asyncHandler(async (req, res) => {
  const result = await logisticsVendorService.getVendor({
    companyId: companyIdForRequest(req), vendorId: req.params.id,
  });
  res.status(200).json(new ApiResponse(200, result, "Logistics vendor fetched successfully"));
});

export const updateLogisticsVendor = asyncHandler(async (req, res) => {
  const payload = validate(updateLogisticsVendorSchema, req.body);
  const result = await logisticsVendorService.updateVendor({
    companyId: companyIdForRequest(req), vendorId: req.params.id,
    userId: req.user?._id || null, payload,
  });
  res.status(200).json(new ApiResponse(200, result, "Logistics vendor updated successfully"));
});

export const deleteLogisticsVendor = asyncHandler(async (req, res) => {
  const result = await logisticsVendorService.deleteVendor({
    companyId: companyIdForRequest(req), vendorId: req.params.id, userId: req.user?._id || null,
  });
  res.status(200).json(new ApiResponse(200, result, "Logistics vendor deleted successfully"));
});
