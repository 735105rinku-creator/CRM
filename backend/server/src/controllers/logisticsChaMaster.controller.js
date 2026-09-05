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

const validate = (schema, source) => {
  const { value, error } = schema.validate(source, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new ApiError(400, error.details[0].message, error.details);
  }

  return value;
};


const CHA_MASTER_STATUSES = new Set(["active", "inactive", "blocked", "other"]);

export const validateChaMasterStatusPayload = (body = {}) => {
  const status = String(body?.status || "").trim();
  const statusOther = String(body?.statusOther || "").trim();

  if (!CHA_MASTER_STATUSES.has(status)) {
    throw new ApiError(400, "Invalid CHA status");
  }

  if (status === "other" && !statusOther) {
    throw new ApiError(400, "CHA status is required when Other is selected");
  }

  return {
    status,
    statusOther: status === "other" ? statusOther : "",
  };
};

const assertChaVendor = (vendor) => {
  if (!vendor || vendor.vendorType !== "cha") {
    throw new ApiError(404, "CHA master record not found");
  }
  return vendor;
};

export const createLogisticsChaMaster = asyncHandler(async (req, res) => {
  const payload = validate(createLogisticsVendorSchema, {
    ...req.body,
    vendorType: "cha",
    serviceCategory: req.body?.serviceCategory || "customs_cha",
  });

  const result = await logisticsVendorService.createVendor({
    companyId: companyIdForRequest(req),
    userId: req.user?._id || null,
    employeeId: req.logisticsAccess?.employeeId || null,
    payload,
  });

  res
    .status(201)
    .json(new ApiResponse(201, result, "CHA master created successfully"));
});

export const getLogisticsChaMasters = asyncHandler(async (req, res) => {
  const query = validate(logisticsVendorQuerySchema, {
    ...req.query,
    vendorType: "cha",
  });

  const result = await logisticsVendorService.listVendors({
    companyId: companyIdForRequest(req),
    query,
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, "CHA masters fetched successfully"));
});

export const getLogisticsChaMasterById = asyncHandler(async (req, res) => {
  const result = assertChaVendor(
    await logisticsVendorService.getVendor({
      companyId: companyIdForRequest(req),
      vendorId: req.params.id,
    })
  );

  res
    .status(200)
    .json(new ApiResponse(200, result, "CHA master fetched successfully"));
});

export const updateLogisticsChaMaster = asyncHandler(async (req, res) => {
  const companyId = companyIdForRequest(req);

  assertChaVendor(
    await logisticsVendorService.getVendor({
      companyId,
      vendorId: req.params.id,
    })
  );

  const payload = validate(updateLogisticsVendorSchema, {
    ...req.body,
    vendorType: "cha",
  });

  const result = await logisticsVendorService.updateVendor({
    companyId,
    vendorId: req.params.id,
    userId: req.user?._id || null,
    payload,
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, "CHA master updated successfully"));
});

export const updateLogisticsChaMasterStatus = asyncHandler(async (req, res) => {
  const companyId = companyIdForRequest(req);

  assertChaVendor(
    await logisticsVendorService.getVendor({
      companyId,
      vendorId: req.params.id,
    })
  );

  const payload = validateChaMasterStatusPayload(req.body);

  const result = await logisticsVendorService.updateVendor({
    companyId,
    vendorId: req.params.id,
    userId: req.user?._id || null,
    payload,
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, "CHA master status updated successfully"));
});

export const deleteLogisticsChaMaster = asyncHandler(async (req, res) => {
  const companyId = companyIdForRequest(req);

  assertChaVendor(
    await logisticsVendorService.getVendor({
      companyId,
      vendorId: req.params.id,
    })
  );

  const result = await logisticsVendorService.deleteVendor({
    companyId,
    vendorId: req.params.id,
    userId: req.user?._id || null,
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, "CHA master deleted successfully"));
});
