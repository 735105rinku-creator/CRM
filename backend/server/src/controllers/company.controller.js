import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createCompanySchema,
  updateCompanySchema,
  updateCompanyStatusSchema,
  createCompanyAdminSchema,
} from "../validators/company.validator.js";

import {
  createCompanyService,
  getCompaniesService,
  getCompanyByIdService,
  updateCompanyService,
  updateCompanyStatusService,
  deleteCompanyService,
  createCompanyAdminService,
  getMyCompanyProfileService,
  updateMyCompanyProfileService,
} from "../services/company.service.js";

export const createCompany = asyncHandler(async (req, res) => {
  const { value, error } = createCompanySchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const company = await createCompanyService(req.user, value);

  res
    .status(201)
    .json(new ApiResponse(201, company, "Company created successfully"));
});

export const getCompanies = asyncHandler(async (req, res) => {
  const companies = await getCompaniesService(req.user, req.query);

  res
    .status(200)
    .json(new ApiResponse(200, companies, "Companies fetched successfully"));
});

export const getCompanyById = asyncHandler(async (req, res) => {
  const company = await getCompanyByIdService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, company, "Company fetched successfully"));
});

export const updateCompany = asyncHandler(async (req, res) => {
  const { value, error } = updateCompanySchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const company = await updateCompanyService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, company, "Company updated successfully"));
});

export const updateCompanyStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateCompanyStatusSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const company = await updateCompanyStatusService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, company, "Company status updated successfully"));
});

export const deleteCompany = asyncHandler(async (req, res) => {
  await deleteCompanyService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Company deleted successfully"));
});

export const createCompanyAdmin = asyncHandler(async (req, res) => {
  const { value, error } = createCompanyAdminSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const user = await createCompanyAdminService(req.user, req.params.id, value);

  res
    .status(201)
    .json(new ApiResponse(201, user, "Company admin created successfully"));
});

export const getMyCompanyProfile = asyncHandler(async (req, res) => {
  const company = await getMyCompanyProfileService(req.user);

  res
    .status(200)
    .json(new ApiResponse(200, company, "Company profile fetched successfully"));
});

export const updateMyCompanyProfile = asyncHandler(async (req, res) => {
  const { value, error } = updateCompanySchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const company = await updateMyCompanyProfileService(req.user, value);

  res
    .status(200)
    .json(new ApiResponse(200, company, "Company profile updated successfully"));
});