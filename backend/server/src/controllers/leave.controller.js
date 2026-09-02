import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  createLeavePolicySchema,
  updateLeavePolicySchema,
  createLeaveBalanceSchema,
  updateLeaveBalanceSchema,
  applyLeaveSchema,
  updateLeaveRequestStatusSchema,
} from "../validators/leave.validator.js";

import {
  createLeaveTypeService,
  getLeaveTypesService,
  updateLeaveTypeService,
  deleteLeaveTypeService,

  createLeavePolicyService,
  getLeavePoliciesService,
  updateLeavePolicyService,
  deleteLeavePolicyService,

  createLeaveBalanceService,
  getLeaveBalancesService,
  getMyLeaveBalancesService,
  updateLeaveBalanceService,

  applyLeaveService,
  applyMyLeaveService,
  getLeaveRequestsService,
  getMyLeaveRequestsService,
  updateLeaveRequestStatusService,

  getLeaveCalendarService,
  getLeaveDashboardService,
} from "../services/leave.service.js";

/* ================= LEAVE TYPE ================= */

export const createLeaveType = asyncHandler(async (req, res) => {
  const { value, error } = createLeaveTypeSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createLeaveTypeService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Leave type created successfully"));
});

export const getLeaveTypes = asyncHandler(async (req, res) => {
  const data = await getLeaveTypesService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Leave types fetched successfully"));
});

export const updateLeaveType = asyncHandler(async (req, res) => {
  const { value, error } = updateLeaveTypeSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateLeaveTypeService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Leave type updated successfully"));
});

export const deleteLeaveType = asyncHandler(async (req, res) => {
  await deleteLeaveTypeService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, null, "Leave type deleted successfully"));
});

/* ================= LEAVE POLICY ================= */

export const createLeavePolicy = asyncHandler(async (req, res) => {
  const { value, error } = createLeavePolicySchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createLeavePolicyService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Leave policy created successfully"));
});

export const getLeavePolicies = asyncHandler(async (req, res) => {
  const data = await getLeavePoliciesService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Leave policies fetched successfully"));
});

export const updateLeavePolicy = asyncHandler(async (req, res) => {
  const { value, error } = updateLeavePolicySchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateLeavePolicyService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Leave policy updated successfully"));
});

export const deleteLeavePolicy = asyncHandler(async (req, res) => {
  await deleteLeavePolicyService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, null, "Leave policy deleted successfully"));
});

/* ================= LEAVE BALANCE ================= */

export const createLeaveBalance = asyncHandler(async (req, res) => {
  const { value, error } = createLeaveBalanceSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createLeaveBalanceService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Leave balance created successfully"));
});

export const getLeaveBalances = asyncHandler(async (req, res) => {
  const data = await getLeaveBalancesService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Leave balances fetched successfully"));
});

export const getMyLeaveBalances = asyncHandler(async (req, res) => {
  const data = await getMyLeaveBalancesService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "My leave balances fetched successfully"));
});

export const updateLeaveBalance = asyncHandler(async (req, res) => {
  const { value, error } = updateLeaveBalanceSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateLeaveBalanceService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Leave balance updated successfully"));
});

/* ================= LEAVE REQUEST ================= */

export const applyLeave = asyncHandler(async (req, res) => {
  const { value, error } = applyLeaveSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await applyLeaveService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Leave applied successfully"));
});

export const applyMyLeave = asyncHandler(async (req, res) => {
  const { value, error } = applyLeaveSchema.validate({
    leaveCode: "CL",
    employeeCode: req.user.employeeCode,
    ...req.body,
  });
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await applyMyLeaveService(req.user, value);

  res.status(201).json(new ApiResponse(201, data, "Leave applied successfully"));
});

export const getLeaveRequests = asyncHandler(async (req, res) => {
  const data = await getLeaveRequestsService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Leave requests fetched successfully"));
});

export const getMyLeaveRequests = asyncHandler(async (req, res) => {
  const data = await getMyLeaveRequestsService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "My leave requests fetched successfully"));
});

export const updateLeaveRequestStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateLeaveRequestStatusSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateLeaveRequestStatusService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, data, "Leave request status updated successfully"));
});

/* ================= DASHBOARD / CALENDAR ================= */

export const getLeaveCalendar = asyncHandler(async (req, res) => {
  const data = await getLeaveCalendarService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, data, "Leave calendar fetched successfully"));
});

export const getLeaveDashboard = asyncHandler(async (req, res) => {
  const data = await getLeaveDashboardService(req.user);

  res.status(200).json(new ApiResponse(200, data, "Leave dashboard fetched successfully"));
});
