import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createBranchSchema,
  updateBranchSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createDesignationSchema,
  updateDesignationSchema,
  createHolidaySchema,
  updateHolidaySchema,
} from "../validators/companySettings.validator.js";

import {
  createBranchService,
  getBranchesService,
  updateBranchService,
  deleteBranchService,

  createDepartmentService,
  getDepartmentsService,
  updateDepartmentService,
  deleteDepartmentService,

  createDesignationService,
  getDesignationsService,
  updateDesignationService,
  deleteDesignationService,

  createHolidayService,
  getHolidaysService,
  updateHolidayService,
  deleteHolidayService,
} from "../services/companySettings.service.js";

/* ---------------- Branch ---------------- */

export const createBranch = asyncHandler(async (req, res) => {
  const { value, error } = createBranchSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const branch = await createBranchService(req.user, value);

  res
    .status(201)
    .json(new ApiResponse(201, branch, "Branch created successfully"));
});

export const getBranches = asyncHandler(async (req, res) => {
  const branches = await getBranchesService(req.user, req.query);

  res
    .status(200)
    .json(new ApiResponse(200, branches, "Branches fetched successfully"));
});

export const updateBranch = asyncHandler(async (req, res) => {
  const { value, error } = updateBranchSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const branch = await updateBranchService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, branch, "Branch updated successfully"));
});

export const deleteBranch = asyncHandler(async (req, res) => {
  await deleteBranchService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Branch deleted successfully"));
});

/* ---------------- Department ---------------- */

export const createDepartment = asyncHandler(async (req, res) => {
  const { value, error } = createDepartmentSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const department = await createDepartmentService(req.user, value);

  res
    .status(201)
    .json(new ApiResponse(201, department, "Department created successfully"));
});

export const getDepartments = asyncHandler(async (req, res) => {
  const departments = await getDepartmentsService(req.user, req.query);

  res
    .status(200)
    .json(new ApiResponse(200, departments, "Departments fetched successfully"));
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const { value, error } = updateDepartmentSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const department = await updateDepartmentService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, department, "Department updated successfully"));
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  await deleteDepartmentService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Department deleted successfully"));
});

/* ---------------- Designation ---------------- */

export const createDesignation = asyncHandler(async (req, res) => {
  const { value, error } = createDesignationSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const designation = await createDesignationService(req.user, value);

  res
    .status(201)
    .json(new ApiResponse(201, designation, "Designation created successfully"));
});

export const getDesignations = asyncHandler(async (req, res) => {
  const designations = await getDesignationsService(req.user, req.query);

  res
    .status(200)
    .json(
      new ApiResponse(200, designations, "Designations fetched successfully")
    );
});

export const updateDesignation = asyncHandler(async (req, res) => {
  const { value, error } = updateDesignationSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const designation = await updateDesignationService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(new ApiResponse(200, designation, "Designation updated successfully"));
});

export const deleteDesignation = asyncHandler(async (req, res) => {
  await deleteDesignationService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Designation deleted successfully"));
});

/* ---------------- Holiday ---------------- */

export const createHoliday = asyncHandler(async (req, res) => {
  const { value, error } = createHolidaySchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const holiday = await createHolidayService(req.user, value);

  res
    .status(201)
    .json(new ApiResponse(201, holiday, "Holiday created successfully"));
});

export const getHolidays = asyncHandler(async (req, res) => {
  const holidays = await getHolidaysService(req.user, req.query);

  res
    .status(200)
    .json(new ApiResponse(200, holidays, "Holidays fetched successfully"));
});

export const updateHoliday = asyncHandler(async (req, res) => {
  const { value, error } = updateHolidaySchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const holiday = await updateHolidayService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, holiday, "Holiday updated successfully"));
});

export const deleteHoliday = asyncHandler(async (req, res) => {
  await deleteHolidayService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Holiday deleted successfully"));
});
