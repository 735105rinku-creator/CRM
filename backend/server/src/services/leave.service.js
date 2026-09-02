import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { LEAVE_REQUEST_STATUS, LEAVE_DAY_TYPE } from "../models/LeaveRequest.js";
import { LEAVE_CATEGORY } from "../models/LeaveType.js";
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPE } from "../models/Notification.js";
import { User } from "../models/User.js";

import {
  createEmployeeRecord,
  findEmployeeById,
  findEmployeeByCode,
  findEmployeeProfile,
} from "../repositories/employee.repository.js";

import {
  createLeaveTypeRecord,
  findLeaveTypeById,
  findLeaveTypeByCode,
  listLeaveTypes,
  updateLeaveTypeById,
  deleteLeaveTypeById,

  createLeavePolicyRecord,
  findLeavePolicyById,
  findLeavePolicyByCode,
  listLeavePolicies,
  updateLeavePolicyById,
  deleteLeavePolicyById,

  createLeaveBalanceRecord,
  findLeaveBalance,
  findLeaveBalanceById,
  updateLeaveBalanceById,
  listLeaveBalances,

  createLeaveRequestRecord,
  findLeaveRequestById,
  listLeaveRequests,
  updateLeaveRequestById,
  countLeaveRequests,
  getLeaveCalendar,
} from "../repositories/leave.repository.js";
import { createNotificationRecord } from "../repositories/communication.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureLeaveAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage leave.");
  }
};

const ensureSameCompany = (companyId, record, message = "Record not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const calculateLeaveDays = (fromDate, toDate, dayType) => {
  if (dayType !== LEAVE_DAY_TYPE.FULL_DAY) return 0.5;

  const from = new Date(fromDate);
  const to = new Date(toDate);

  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  const diff = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;

  if (diff <= 0) {
    throw new ApiError(400, "Invalid leave date range.");
  }

  return diff;
};

const resolveEmployee = async (companyId, payloadOrCode) => {
  let employeeId = null;
  let employeeCode = null;

  if (typeof payloadOrCode === "string") {
    employeeCode = payloadOrCode;
  } else {
    employeeId = payloadOrCode.employeeId || payloadOrCode.approverEmployeeId;
    employeeCode =
      payloadOrCode.employeeCode || payloadOrCode.approverEmployeeCode;
  }

  let employee = null;

  if (employeeId) {
    employee = await findEmployeeById(employeeId);
  }

  if (!employee && employeeCode) {
    employee = await findEmployeeByCode(companyId, employeeCode);
  }

  if (!employee || employee.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, "Employee not found.");
  }

  return employee;
};

const splitUserName = (name = "Team Member") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Team",
    lastName: parts.slice(1).join(" ") || "Member",
  };
};

const ensureSelfEmployee = async (currentUser) => {
  if ([ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN].includes(currentUser.role)) {
    throw new ApiError(403, "Admin roles are not employee profiles.");
  }

  const companyId = getCompanyId(currentUser);
  const findExistingSelfEmployee = () => findEmployeeProfile({
    companyId,
    employeeId: currentUser.employee,
    userId: currentUser._id,
    employeeCode: currentUser.employeeCode,
    officialEmail: currentUser.email,
  });
  const existingEmployee = await findExistingSelfEmployee();

  if (existingEmployee) {
    currentUser.employeeCode = existingEmployee.employeeCode;
    currentUser.employee = existingEmployee._id;
    return existingEmployee;
  }

  const { firstName, lastName } = splitUserName(currentUser.name);
  const rolePrefix = currentUser.role === ROLES.HR ? "HR" : currentUser.role === ROLES.COMPANY_ADMIN ? "ADM" : "EMP";
  const employeeCode = `${rolePrefix}-${currentUser._id.toString().slice(-6).toUpperCase()}`;

  let employee;

  try {
    employee = await createEmployeeRecord({
      companyId,
      userId: currentUser._id,
      employeeCode,
      firstName,
      lastName,
      displayName: currentUser.name,
      officialEmail: currentUser.email,
      mobile: currentUser.mobile || "0000000000",
      joiningDate: currentUser.createdAt || new Date(),
      departmentId: null,
      designationId: null,
      employeeStatus: "active",
      isActive: true,
      workMode: "office",
      createdBy: currentUser._id,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    employee = await findExistingSelfEmployee();
    if (!employee) throw error;
  }

  currentUser.employeeCode = employee.employeeCode;
  currentUser.employee = employee._id;
  if (typeof currentUser.save === "function") {
    await currentUser.save();
  }

  return employee;
};

const ensureDefaultLeaveType = async (companyId, currentUser) => {
  let leaveType = await findLeaveTypeByCode(companyId, "CL");

  if (!leaveType) {
    leaveType = await createLeaveTypeRecord({
      companyId,
      leaveName: "Casual Leave",
      leaveCode: "CL",
      category: LEAVE_CATEGORY.CASUAL,
      description: "Default casual leave for employee self-service.",
      paid: true,
      allowHalfDay: true,
      requireApproval: true,
      isActive: true,
      createdBy: currentUser._id,
    });
  }

  return leaveType;
};

const CORE_LEAVE_TYPES = Object.freeze({
  CL: { leaveName: "Casual Leave", category: LEAVE_CATEGORY.CASUAL },
  SL: { leaveName: "Sick Leave", category: LEAVE_CATEGORY.SICK },
  EL: { leaveName: "Earned Leave", category: LEAVE_CATEGORY.EARNED },
});

const ensureCoreLeaveType = async (companyId, leaveCode, currentUser) => {
  const code = String(leaveCode || "").trim().toUpperCase();
  const config = CORE_LEAVE_TYPES[code];

  if (!config) return null;

  let leaveType = await findLeaveTypeByCode(companyId, code);

  if (!leaveType) {
    leaveType = await createLeaveTypeRecord({
      companyId,
      leaveName: config.leaveName,
      leaveCode: code,
      category: config.category,
      description: `${config.leaveName} auto-created for HR self-service.`,
      paid: true,
      allowHalfDay: true,
      requireApproval: true,
      isActive: true,
      createdBy: currentUser._id,
    });
  }

  return leaveType;
};

const ensureDefaultLeaveBalance = async ({ companyId, employeeId, leaveTypeId, year, currentUser }) => {
  let balance = await findLeaveBalance({ companyId, employeeId, leaveTypeId, year });

  if (!balance) {
    balance = await createLeaveBalanceRecord({
      companyId,
      employeeId,
      leaveTypeId,
      year,
      openingBalance: 12,
      credited: 0,
      availableBalance: 12,
      remarks: "Auto-created default leave balance.",
      createdBy: currentUser._id,
    });
  }

  return balance;
};

const notifyCompanyHrUsers = async ({ companyId, senderUserId, leaveRequest, employee }) => {
  const recipients = await User.find({
    companyId,
    role: { $in: [ROLES.HR, ROLES.COMPANY_ADMIN] },
    status: "active",
  }).select("_id");

  await Promise.all(
    recipients.map((recipient) =>
      createNotificationRecord({
        companyId,
        recipientUserId: recipient._id,
        senderUserId,
        type: NOTIFICATION_TYPE.LEAVE,
        priority: NOTIFICATION_PRIORITY.HIGH,
        title: "New leave request",
        message: `${employee.displayName || employee.employeeCode} applied for leave.`,
        entityType: "leave_request",
        entityId: leaveRequest._id,
        actionUrl: "/hr-dashboard",
        createdBy: senderUserId,
      })
    )
  );
};

const notifyLeaveEmployee = async ({ companyId, senderUserId, leaveRequest, status, remarks }) => {
  const employee = await findEmployeeById(leaveRequest.employeeId);
  if (!employee?.userId) return;

  await createNotificationRecord({
    companyId,
    recipientUserId: employee.userId,
    senderUserId,
    type: NOTIFICATION_TYPE.LEAVE,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    title: `Leave ${status}`,
    message: remarks ? `Your leave was ${status}. Remark: ${remarks}` : `Your leave was ${status}.`,
    entityType: "leave_request",
    entityId: leaveRequest._id,
    actionUrl: "/employee-dashboard",
    createdBy: senderUserId,
  });
};

const resolveLeaveType = async (companyId, payload = {}) => {
  const leaveTypeId = payload.leaveTypeId;
  const leaveTypeCode = payload.leaveTypeCode || payload.leaveCode;

  let leaveType = null;

  if (leaveTypeId) {
    leaveType = await findLeaveTypeById(leaveTypeId);
  }

  if (!leaveType && leaveTypeCode) {
    leaveType = await findLeaveTypeByCode(companyId, leaveTypeCode);
  }

  ensureSameCompany(companyId, leaveType, "Leave type not found.");

  return leaveType;
};

const resolveLeavePolicy = async (companyId, payload = {}) => {
  const leavePolicyId = payload.leavePolicyId;
  const leavePolicyCode = payload.leavePolicyCode || payload.policyCode;

  if (!leavePolicyId && !leavePolicyCode) return null;

  let leavePolicy = null;

  if (leavePolicyId) {
    leavePolicy = await findLeavePolicyById(leavePolicyId);
  }

  if (!leavePolicy && leavePolicyCode) {
    leavePolicy = await findLeavePolicyByCode(companyId, leavePolicyCode);
  }

  ensureSameCompany(companyId, leavePolicy, "Leave policy not found.");

  return leavePolicy;
};

const normalizePolicyRules = async (companyId, rules = []) => {
  const normalizedRules = [];

  for (const rule of rules) {
    const leaveType = await resolveLeaveType(companyId, rule);

    normalizedRules.push({
      ...rule,
      leaveTypeId: leaveType._id,
      leaveTypeCode: undefined,
      leaveCode: undefined,
    });
  }

  return normalizedRules;
};

const normalizeApprovalLevels = async (companyId, approvalLevels = []) => {
  const normalizedLevels = [];

  for (const level of approvalLevels) {
    let approverEmployeeId = level.approverEmployeeId || null;

    if (level.approverType === "specific_employee") {
      if (!approverEmployeeId && level.approverEmployeeCode) {
        const employee = await resolveEmployee(companyId, {
          employeeCode: level.approverEmployeeCode,
        });

        approverEmployeeId = employee._id;
      }

      if (!approverEmployeeId) {
        throw new ApiError(
          400,
          "approverEmployeeId or approverEmployeeCode is required for specific employee approver."
        );
      }
    }

    normalizedLevels.push({
      ...level,
      approverEmployeeId,
      approverEmployeeCode: undefined,
    });
  }

  return normalizedLevels;
};

/* ================= LEAVE TYPE ================= */

export const createLeaveTypeService = async (currentUser, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findLeaveTypeByCode(companyId, payload.leaveCode);

  if (exists) {
    throw new ApiError(409, "Leave type code already exists.");
  }

  return createLeaveTypeRecord({
    ...payload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getLeaveTypesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.category) filter.category = query.category;

  if (query.search) {
    filter.$or = [
      { leaveName: { $regex: query.search, $options: "i" } },
      { leaveCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listLeaveTypes({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateLeaveTypeService = async (currentUser, id, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const leaveType = await findLeaveTypeById(id);

  ensureSameCompany(companyId, leaveType, "Leave type not found.");

  return updateLeaveTypeById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const deleteLeaveTypeService = async (currentUser, id) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const leaveType = await findLeaveTypeById(id);

  ensureSameCompany(companyId, leaveType, "Leave type not found.");

  await deleteLeaveTypeById(id);
  return true;
};

/* ================= LEAVE POLICY ================= */

export const createLeavePolicyService = async (currentUser, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findLeavePolicyByCode(companyId, payload.policyCode);

  if (exists) {
    throw new ApiError(409, "Leave policy code already exists.");
  }

  const rules = await normalizePolicyRules(companyId, payload.rules || []);
  const approvalLevels = await normalizeApprovalLevels(
    companyId,
    payload.approvalLevels || []
  );

  return createLeavePolicyRecord({
    ...payload,
    rules,
    approvalLevels,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getLeavePoliciesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.search) {
    filter.$or = [
      { policyName: { $regex: query.search, $options: "i" } },
      { policyCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listLeavePolicies({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateLeavePolicyService = async (currentUser, id, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const policy = await findLeavePolicyById(id);

  ensureSameCompany(companyId, policy, "Leave policy not found.");

  const updatePayload = { ...payload };

  if (payload.rules) {
    updatePayload.rules = await normalizePolicyRules(companyId, payload.rules);
  }

  if (payload.approvalLevels) {
    updatePayload.approvalLevels = await normalizeApprovalLevels(
      companyId,
      payload.approvalLevels
    );
  }

  return updateLeavePolicyById(id, {
    ...updatePayload,
    updatedBy: currentUser._id,
  });
};

export const deleteLeavePolicyService = async (currentUser, id) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const policy = await findLeavePolicyById(id);

  ensureSameCompany(companyId, policy, "Leave policy not found.");

  await deleteLeavePolicyById(id);
  return true;
};

/* ================= LEAVE BALANCE ================= */

export const createLeaveBalanceService = async (currentUser, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const employee = await resolveEmployee(companyId, payload);
  const leaveType = await resolveLeaveType(companyId, payload);
  const leavePolicy = await resolveLeavePolicy(companyId, payload);

  const employeeId = employee._id;
  const leaveTypeId = leaveType._id;
  const leavePolicyId = leavePolicy?._id || null;

  const exists = await findLeaveBalance({
    companyId,
    employeeId,
    leaveTypeId,
    year: payload.year,
  });

  if (exists) {
    throw new ApiError(409, "Leave balance already exists.");
  }

  const availableBalance =
    payload.availableBalance ??
    payload.openingBalance +
      payload.credited +
      payload.carryForward -
      payload.availed;

  return createLeaveBalanceRecord({
    ...payload,
    employeeId,
    leaveTypeId,
    leavePolicyId,
    employeeCode: undefined,
    leaveTypeCode: undefined,
    leaveCode: undefined,
    leavePolicyCode: undefined,
    policyCode: undefined,
    companyId,
    availableBalance,
    createdBy: currentUser._id,
  });
};

export const getLeaveBalancesService = async (currentUser, query = {}) => {
  const companyId =
    currentUser.role === ROLES.SUPER_ADMIN && query.companyId
      ? query.companyId
      : getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }

  if (query.employeeCode) {
    const employee = await resolveEmployee(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.leaveTypeId) {
    filter.leaveTypeId = query.leaveTypeId;
  }

  if (query.leaveTypeCode || query.leaveCode) {
    const leaveType = await resolveLeaveType(companyId, {
      leaveTypeCode: query.leaveTypeCode,
      leaveCode: query.leaveCode,
    });

    filter.leaveTypeId = leaveType._id;
  }

  if (query.year) {
    filter.year = Number(query.year);
  }

  return listLeaveBalances({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getMyLeaveBalancesService = async (currentUser, query = {}) => {
  const selfEmployee = await ensureSelfEmployee(currentUser);

  return getLeaveBalancesService(currentUser, {
    ...query,
    employeeCode: selfEmployee.employeeCode,
    year: query.year || new Date().getFullYear(),
  });
};

export const updateLeaveBalanceService = async (currentUser, id, payload) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const balance = await findLeaveBalanceById(id);

  ensureSameCompany(companyId, balance, "Leave balance not found.");

  const updatePayload = { ...payload };

  if (payload.employeeId || payload.employeeCode) {
    const employee = await resolveEmployee(companyId, payload);
    updatePayload.employeeId = employee._id;
  }

  if (payload.leaveTypeId || payload.leaveTypeCode || payload.leaveCode) {
    const leaveType = await resolveLeaveType(companyId, payload);
    updatePayload.leaveTypeId = leaveType._id;
  }

  if (payload.leavePolicyId || payload.leavePolicyCode || payload.policyCode) {
    const leavePolicy = await resolveLeavePolicy(companyId, payload);
    updatePayload.leavePolicyId = leavePolicy?._id || null;
  }

  delete updatePayload.employeeCode;
  delete updatePayload.leaveTypeCode;
  delete updatePayload.leaveCode;
  delete updatePayload.leavePolicyCode;
  delete updatePayload.policyCode;

  return updateLeaveBalanceById(id, {
    ...updatePayload,
    updatedBy: currentUser._id,
  });
};

/* ================= LEAVE REQUEST ================= */

export const applyLeaveService = async (currentUser, payload) => {
  const companyId = getCompanyId(currentUser);

  if (!payload.employeeCode && [ROLES.EMPLOYEE, ROLES.HR, ROLES.COMPANY_ADMIN].includes(currentUser.role)) {
    const selfEmployee = await ensureSelfEmployee(currentUser);
    payload.employeeCode = selfEmployee.employeeCode;
  }

  const employee = await resolveEmployee(companyId, payload);
  const leaveType = await resolveLeaveType(companyId, payload);
  const leavePolicy = await resolveLeavePolicy(companyId, payload);

  const employeeId = employee._id;
  const leaveTypeId = leaveType._id;
  const leavePolicyId = leavePolicy?._id || null;

  const totalDays = calculateLeaveDays(
    payload.fromDate,
    payload.toDate,
    payload.dayType
  );

  const year = new Date(payload.fromDate).getFullYear();

  const balance = await findLeaveBalance({
    companyId,
    employeeId,
    leaveTypeId,
    year,
  });

  if (!balance) {
    throw new ApiError(
      400,
      `${leaveType.leaveName || leaveType.leaveCode} is not assigned to this employee.`
    );
  }

  const availableAfterPending = Math.max(
    0,
    Number(balance.availableBalance || 0) - Number(balance.pending || 0)
  );

  if (availableAfterPending < totalDays) {
    throw new ApiError(
      400,
      `Insufficient ${leaveType.leaveCode} leave balance. Available: ${availableAfterPending}, requested: ${totalDays}.`
    );
  }

  const leaveRequest = await createLeaveRequestRecord({
    ...payload,
    employeeId,
    leaveTypeId,
    leavePolicyId,
    employeeCode: undefined,
    leaveTypeCode: undefined,
    leaveCode: undefined,
    leavePolicyCode: undefined,
    policyCode: undefined,
    companyId,
    totalDays,
    status: LEAVE_REQUEST_STATUS.PENDING,
    createdBy: currentUser._id,
  });

  await updateLeaveBalanceById(balance._id, {
    pending: Number(balance.pending || 0) + totalDays,
    updatedBy: currentUser._id,
  });

  await notifyCompanyHrUsers({
    companyId,
    senderUserId: currentUser._id,
    leaveRequest,
    employee,
  });

  return leaveRequest;
};

export const applyMyLeaveService = async (currentUser, payload) => {
  const selfEmployee = await ensureSelfEmployee(currentUser);

  return applyLeaveService(currentUser, {
    ...payload,
    employeeCode: selfEmployee.employeeCode,
  });
};

export const getLeaveRequestsService = async (currentUser, query = {}) => {
  const companyId =
    currentUser.role === ROLES.SUPER_ADMIN && query.companyId
      ? query.companyId
      : getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }

  if (query.employeeCode) {
    const employee = await resolveEmployee(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.leaveTypeId) {
    filter.leaveTypeId = query.leaveTypeId;
  }

  if (query.leaveTypeCode || query.leaveCode) {
    const leaveType = await resolveLeaveType(companyId, {
      leaveTypeCode: query.leaveTypeCode,
      leaveCode: query.leaveCode,
    });

    filter.leaveTypeId = leaveType._id;
  }

  if (query.status) {
    filter.status = query.status;
  }

  return listLeaveRequests({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getMyLeaveRequestsService = async (currentUser, query = {}) => {
  const selfEmployee = await ensureSelfEmployee(currentUser);

  return getLeaveRequestsService(currentUser, {
    ...query,
    employeeCode: selfEmployee.employeeCode,
  });
};

export const updateLeaveRequestStatusService = async (
  currentUser,
  id,
  payload
) => {
  ensureLeaveAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const request = await findLeaveRequestById(id);

  ensureSameCompany(companyId, request, "Leave request not found.");

  if (request.status !== LEAVE_REQUEST_STATUS.PENDING) {
    throw new ApiError(400, "Only pending leave requests can be updated.");
  }

  const year = new Date(request.fromDate).getFullYear();

  const balance = await findLeaveBalance({
    companyId,
    employeeId: request.employeeId,
    leaveTypeId: request.leaveTypeId,
    year,
  });

  if (!balance) {
    throw new ApiError(400, "Leave balance not found.");
  }

  const updatePayload = {
    status: payload.status,
    approverRemarks: payload.approverRemarks || "",
    updatedBy: currentUser._id,
  };

  const balanceUpdate = {
    pending: Math.max(0, balance.pending - request.totalDays),
    updatedBy: currentUser._id,
  };

  if (payload.status === LEAVE_REQUEST_STATUS.APPROVED) {
    updatePayload.approvedBy = currentUser._id;
    updatePayload.approvedAt = new Date();

    balanceUpdate.availed = Number(balance.availed || 0) + request.totalDays;
    balanceUpdate.availableBalance = Math.max(
      0,
      Number(balance.availableBalance || 0) - request.totalDays
    );
  }

  if (payload.status === LEAVE_REQUEST_STATUS.REJECTED) {
    updatePayload.rejectedBy = currentUser._id;
    updatePayload.rejectedAt = new Date();

    balanceUpdate.rejected = Number(balance.rejected || 0) + request.totalDays;
  }

  if (payload.status === LEAVE_REQUEST_STATUS.CANCELLED) {
    updatePayload.cancelledBy = currentUser._id;
    updatePayload.cancelledAt = new Date();
    updatePayload.cancellationReason = payload.cancellationReason || "";

  }

  await updateLeaveBalanceById(balance._id, balanceUpdate);

  const updatedRequest = await updateLeaveRequestById(id, updatePayload);

  await notifyLeaveEmployee({
    companyId,
    senderUserId: currentUser._id,
    leaveRequest: updatedRequest,
    status: payload.status,
    remarks: payload.approverRemarks || payload.cancellationReason || "",
  });

  return updatedRequest;
};

/* ================= DASHBOARD / CALENDAR ================= */

export const getLeaveCalendarService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const from = query.from ? new Date(query.from) : new Date();
  const to = query.to ? new Date(query.to) : new Date();

  return getLeaveCalendar({ companyId, from, to });
};

export const getLeaveDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [pending, approved, rejected, cancelled] = await Promise.all([
    countLeaveRequests({ companyId, status: LEAVE_REQUEST_STATUS.PENDING }),
    countLeaveRequests({ companyId, status: LEAVE_REQUEST_STATUS.APPROVED }),
    countLeaveRequests({ companyId, status: LEAVE_REQUEST_STATUS.REJECTED }),
    countLeaveRequests({ companyId, status: LEAVE_REQUEST_STATUS.CANCELLED }),
  ]);

  return {
    pending,
    approved,
    rejected,
    cancelled,
  };
};


