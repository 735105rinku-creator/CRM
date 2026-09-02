import bcrypt from "bcryptjs";

import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import {
  ROLE_PERMISSIONS,
  ROLES,
  USER_STATUS,
} from "../constants/roles.js";

import { EMPLOYEE_STATUS } from "../models/Employee.js";
import { LEAVE_CATEGORY } from "../models/LeaveType.js";
import { Company } from "../models/Company.js";
import { getUpcomingHolidays } from "../repositories/holiday.repository.js";
import {
  createBranch as createBranchSetting,
  createDepartment as createDepartmentSetting,
  createDesignation as createDesignationSetting,
} from "../repositories/companySettings.repository.js";
import {
  createLeaveTypeRecord,
  findLeaveTypeByCode,
  createLeaveBalanceRecord,
  findLeaveBalance,
  updateLeaveBalanceById,
} from "../repositories/leave.repository.js";

import {
  createUserRecord,
  deleteUserById,
  findUserByEmail,
  findUserById,
  updateUserById,
} from "../repositories/user.repository.js";

import { sendWelcomeEmployeeEmail } from "./email.service.js";
import { ensureEmployeeLimit } from "./subscriptionLimit.service.js";

import {
  createEmployeeRecord,
  findEmployeeById,
  findEmployeeByCode,
  findEmployeeProfile,
  findEmployeeByOfficialEmail,
  findEmployeeByMobile,
  findLastEmployeeByCompany,
  updateEmployeeById,
  softDeleteEmployeeById,
  listEmployees,

  findBranchById,
  findBranchByCode,
  findDepartmentById,
  findDepartmentByCode,
  findDesignationById,
  findDesignationByCode,
  findShiftById,
  findShiftByCode,
  findAttendancePolicyById,
  findAttendancePolicyByCode,
  findLeavePolicyById,
  findLeavePolicyByCode,
  findSalaryStructureById,
  findSalaryStructureByCode,

  upsertEmployeeFamily,
  findEmployeeFamily,

  upsertEmployeeBank,
  findEmployeeBank,

  upsertEmployeeStatutory,
  findEmployeeStatutory,

  upsertEmployeeDocuments,
  findEmployeeDocuments,

  countEmployees,
  getUpcomingBirthdays,
} from "../repositories/employee.repository.js";

const CODE_FIELDS = [
  "userEmail",
  "branchCode",
  "departmentCode",
  "designationCode",
  "reportingManagerCode",
  "reportingManagerEmployeeCode",
  "shiftCode",
  "attendancePolicyCode",
  "leavePolicyCode",
  "salaryStructureCode",
  "structureCode",
  "createLoginAccount",
  "password",
  "companyId",
  "bankDetails",
  "statutoryDetails",
  "leaveBalances",
];

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const hasValue = (value) => {
  return value !== undefined && value !== null && value !== "";
};

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const canManageHR = (currentUser) => {
  return [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role);
};

const ensureManageAccess = (currentUser) => {
  if (!canManageHR(currentUser)) {
    throw new ApiError(403, "You are not allowed to manage employees.");
  }
};

const ensureCompanyAdminAccess = (currentUser) => {
  if (![ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN].includes(currentUser.role)) {
    throw new ApiError(403, "Only Company Admin can approve Work From Home attendance.");
  }
};

const hasBankDetails = (bankDetails = {}) => {
  return [
    bankDetails.bankName,
    bankDetails.branchName,
    bankDetails.accountHolderName,
    bankDetails.accountNumber,
    bankDetails.ifscCode,
    bankDetails.upiId,
    bankDetails.cancelledChequeUrl,
  ].some((value) => hasValue(value));
};

const hasStatutoryDetails = (statutoryDetails = {}) => {
  return [
    statutoryDetails.panNumber,
    statutoryDetails.aadhaarNumber,
    statutoryDetails.uanNumber,
    statutoryDetails.pfNumber,
    statutoryDetails.esiNumber,
    statutoryDetails.professionalTaxNumber,
  ].some((value) => hasValue(value));
};

const LEAVE_BALANCE_TYPES = Object.freeze({
  casual: { code: "CL", leaveName: "Casual Leave", category: LEAVE_CATEGORY.CASUAL, paid: true },
  sick: { code: "SL", leaveName: "Sick Leave", category: LEAVE_CATEGORY.SICK, paid: true },
  earned: { code: "EL", leaveName: "Earned Leave", category: LEAVE_CATEGORY.EARNED, paid: true },
  lwp: { code: "LWP", leaveName: "Leave Without Pay", category: LEAVE_CATEGORY.LWP, paid: false },
});

const ensureEmployeeLeaveType = async (companyId, config, currentUser) => {
  let leaveType = await findLeaveTypeByCode(companyId, config.code);

  if (!leaveType) {
    leaveType = await createLeaveTypeRecord({
      companyId,
      leaveName: config.leaveName,
      leaveCode: config.code,
      category: config.category,
      description: `${config.leaveName} auto-created from employee profile.`,
      paid: config.paid,
      allowHalfDay: true,
      requireApproval: true,
      isActive: true,
      createdBy: currentUser._id,
    });
  }

  return leaveType;
};

const saveEmployeeLeaveBalances = async ({ companyId, employeeId, leaveBalances = {}, currentUser }) => {
  const year = Number(leaveBalances.year || new Date().getFullYear());

  for (const [key, config] of Object.entries(LEAVE_BALANCE_TYPES)) {
    const amount = Number(leaveBalances[key] ?? 0);
    const leaveType = await ensureEmployeeLeaveType(companyId, config, currentUser);
    const existing = await findLeaveBalance({
      companyId,
      employeeId,
      leaveTypeId: leaveType._id,
      year,
    });
    const payload = {
      openingBalance: amount,
      credited: 0,
      availableBalance: amount,
      remarks: "Set while creating employee profile.",
      updatedBy: currentUser._id,
    };

    if (existing) {
      await updateLeaveBalanceById(existing._id, payload);
      continue;
    }

    await createLeaveBalanceRecord({
      companyId,
      employeeId,
      leaveTypeId: leaveType._id,
      year,
      ...payload,
      createdBy: currentUser._id,
    });
  }
};

const saveEmployeeProfileExtras = async ({ employee, companyId, bankDetails, statutoryDetails, leaveBalances, currentUser }) => {
  if (hasBankDetails(bankDetails)) {
    await upsertEmployeeBank(employee._id, {
      companyId: employee.companyId || companyId,
      employeeId: employee._id,
      ...bankDetails,
      updatedBy: currentUser._id,
    });
  }

  if (hasStatutoryDetails(statutoryDetails)) {
    await upsertEmployeeStatutory(employee._id, {
      companyId: employee.companyId || companyId,
      employeeId: employee._id,
      ...statutoryDetails,
      updatedBy: currentUser._id,
    });
  }

  await saveEmployeeLeaveBalances({
    companyId: employee.companyId || companyId,
    employeeId: employee._id,
    leaveBalances,
    currentUser,
  });
};

const saveEmployeeProfileExtrasSafely = async (context) => {
  try {
    await saveEmployeeProfileExtras(context);
  } catch (error) {
    console.error("[employee] Employee profile saved, but profile extras failed:", error);
  }
};

const ensureSameCompany = (currentUser, employee) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) return;

  const userCompanyId = getCompanyId(currentUser).toString();
  const employeeCompanyId = employee.companyId.toString();

  if (userCompanyId !== employeeCompanyId) {
    throw new ApiError(403, "You cannot access another company's employee.");
  }
};

const normalizeCode = (value) => {
  if (!hasValue(value)) return null;
  return String(value).trim().toUpperCase();
};

const labelFromCode = (value, fallback) => {
  const text = String(value || fallback || "").trim();
  if (!text) return fallback;

  return text
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const normalizeOptionalId = (value) => {
  if (!hasValue(value)) return null;
  return value;
};

const removeHelperFields = (payload) => {
  const clean = { ...payload };

  for (const field of CODE_FIELDS) {
    delete clean[field];
  }

  return clean;
};

const ensureDocumentCompany = (document, companyId, message) => {
  if (!document || document.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, message);
  }
};

const shouldResolveReference = (payload, idField, codeFields = [], partial) => {
  if (!partial) return true;

  if (hasOwn(payload, idField)) return true;

  return codeFields.some((field) => hasOwn(payload, field));
};

const resolveUserReference = async (
  companyId,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "userId",
    ["userEmail"],
    partial
  );

  if (!shouldResolve) return;

  const userId = normalizeOptionalId(payload.userId);
  const userEmail = payload.userEmail?.trim().toLowerCase();

  if (!userId && !userEmail) {
    payload.userId = null;
    return;
  }

  const user = userEmail
    ? await findUserByEmail(userEmail)
    : await findUserById(userId);

  if (
    !user ||
    !user.companyId ||
    user.companyId.toString() !== companyId.toString()
  ) {
    throw new ApiError(400, "Invalid user for this company.");
  }

  payload.userId = user._id;
};

const resolveBranchReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "branchId",
    ["branchCode"],
    partial
  );

  if (!shouldResolve) return;

  const branchId = normalizeOptionalId(payload.branchId);
  const branchCode = normalizeCode(payload.branchCode);

  if (!branchId && !branchCode) {
    resolved.branchId = null;
    return;
  }

  let branch = branchCode
    ? await findBranchByCode(companyId, branchCode)
    : await findBranchById(branchId);

  if (!branch && branchCode && !partial) {
    branch = await createBranchSetting({
      companyId,
      branchName: labelFromCode(payload.branchCode, branchCode),
      branchCode,
      createdBy: payload.createdBy || null,
    });
  }

  ensureDocumentCompany(branch, companyId, "Invalid branch for this company.");
  resolved.branchId = branch._id;
};

const resolveDepartmentReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "departmentId",
    ["departmentCode"],
    partial
  );

  if (!shouldResolve) return;

  const departmentId = normalizeOptionalId(payload.departmentId);
  const departmentCode = normalizeCode(payload.departmentCode);

  if (!departmentId && !departmentCode) {
    resolved.departmentId = null;
    return;
  }

  let department = departmentCode
    ? await findDepartmentByCode(companyId, departmentCode)
    : await findDepartmentById(departmentId);

  if (!department && departmentCode && !partial) {
    department = await createDepartmentSetting({
      companyId,
      branchId: resolved.branchId || null,
      departmentName: labelFromCode(payload.departmentCode, departmentCode),
      departmentCode,
      createdBy: payload.createdBy || null,
    });
  }

  ensureDocumentCompany(
    department,
    companyId,
    "Invalid department for this company."
  );

  resolved.departmentId = department._id;
};

const resolveDesignationReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "designationId",
    ["designationCode"],
    partial
  );

  if (!shouldResolve) return;

  const designationId = normalizeOptionalId(payload.designationId);
  const designationCode = normalizeCode(payload.designationCode);

  if (!designationId && !designationCode) {
    resolved.designationId = null;
    return;
  }

  let designation = designationCode
    ? await findDesignationByCode(companyId, designationCode)
    : await findDesignationById(designationId);

  if (!designation && designationCode && !partial) {
    designation = await createDesignationSetting({
      companyId,
      departmentId: resolved.departmentId || null,
      designationName: labelFromCode(payload.designationCode, designationCode),
      designationCode,
      createdBy: payload.createdBy || null,
    });
  }

  ensureDocumentCompany(
    designation,
    companyId,
    "Invalid designation for this company."
  );

  resolved.designationId = designation._id;
};

const resolveReportingManagerReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "reportingManagerId",
    ["reportingManagerCode", "reportingManagerEmployeeCode"],
    partial
  );

  if (!shouldResolve) return;

  const reportingManagerId = normalizeOptionalId(payload.reportingManagerId);
  const reportingManagerCode = normalizeCode(
    payload.reportingManagerCode || payload.reportingManagerEmployeeCode
  );

  if (!reportingManagerId && !reportingManagerCode) {
    resolved.reportingManagerId = null;
    return;
  }

  const manager = reportingManagerCode
    ? await findEmployeeByCode(companyId, reportingManagerCode)
    : await findEmployeeById(reportingManagerId);

  ensureDocumentCompany(
    manager,
    companyId,
    "Invalid reporting manager for this company."
  );

  resolved.reportingManagerId = manager._id;
};

const resolveShiftReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "shiftId",
    ["shiftCode"],
    partial
  );

  if (!shouldResolve) return;

  const shiftId = normalizeOptionalId(payload.shiftId);
  const shiftCode = normalizeCode(payload.shiftCode);

  if (!shiftId && !shiftCode) {
    resolved.shiftId = null;
    return;
  }

  const shift = shiftCode
    ? await findShiftByCode(companyId, shiftCode)
    : await findShiftById(shiftId);

  ensureDocumentCompany(shift, companyId, "Invalid shift for this company.");
  resolved.shiftId = shift._id;
};

const resolveAttendancePolicyReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "attendancePolicyId",
    ["attendancePolicyCode"],
    partial
  );

  if (!shouldResolve) return;

  const attendancePolicyId = normalizeOptionalId(payload.attendancePolicyId);
  const attendancePolicyCode = normalizeCode(payload.attendancePolicyCode);

  if (!attendancePolicyId && !attendancePolicyCode) {
    resolved.attendancePolicyId = null;
    return;
  }

  const attendancePolicy = attendancePolicyCode
    ? await findAttendancePolicyByCode(companyId, attendancePolicyCode)
    : await findAttendancePolicyById(attendancePolicyId);

  ensureDocumentCompany(
    attendancePolicy,
    companyId,
    "Invalid attendance policy for this company."
  );

  resolved.attendancePolicyId = attendancePolicy._id;
};

const resolveLeavePolicyReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "leavePolicyId",
    ["leavePolicyCode"],
    partial
  );

  if (!shouldResolve) return;

  const leavePolicyId = normalizeOptionalId(payload.leavePolicyId);
  const leavePolicyCode = normalizeCode(payload.leavePolicyCode);

  if (!leavePolicyId && !leavePolicyCode) {
    resolved.leavePolicyId = null;
    return;
  }

  const leavePolicy = leavePolicyCode
    ? await findLeavePolicyByCode(companyId, leavePolicyCode)
    : await findLeavePolicyById(leavePolicyId);

  ensureDocumentCompany(
    leavePolicy,
    companyId,
    "Invalid leave policy for this company."
  );

  resolved.leavePolicyId = leavePolicy._id;
};

const resolveSalaryStructureReference = async (
  companyId,
  resolved,
  payload,
  { partial = false } = {}
) => {
  const shouldResolve = shouldResolveReference(
    payload,
    "salaryStructureId",
    ["salaryStructureCode", "structureCode"],
    partial
  );

  if (!shouldResolve) return;

  const salaryStructureId = normalizeOptionalId(payload.salaryStructureId);
  const salaryStructureCode = normalizeCode(
    payload.salaryStructureCode || payload.structureCode
  );

  if (!salaryStructureId && !salaryStructureCode) {
    resolved.salaryStructureId = null;
    return;
  }

  const salaryStructure = salaryStructureCode
    ? await findSalaryStructureByCode(companyId, salaryStructureCode)
    : await findSalaryStructureById(salaryStructureId);

  ensureDocumentCompany(
    salaryStructure,
    companyId,
    "Invalid salary structure for this company."
  );

  resolved.salaryStructureId = salaryStructure._id;
};

const resolveEmployeeReferences = async (
  companyId,
  payload,
  { partial = false } = {}
) => {
  const resolved = { ...payload };

  await resolveUserReference(companyId, resolved, { partial });

  await resolveBranchReference(companyId, resolved, payload, { partial });
  await resolveDepartmentReference(companyId, resolved, payload, { partial });
  await resolveDesignationReference(companyId, resolved, payload, { partial });
  await resolveReportingManagerReference(companyId, resolved, payload, {
    partial,
  });
  await resolveShiftReference(companyId, resolved, payload, { partial });
  await resolveAttendancePolicyReference(companyId, resolved, payload, {
    partial,
  });
  await resolveLeavePolicyReference(companyId, resolved, payload, { partial });
  await resolveSalaryStructureReference(companyId, resolved, payload, {
    partial,
  });

  return removeHelperFields(resolved);
};

const getCompanyCode = async (companyId) => {
  const company = await Company.findById(companyId).select("companyCode");

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company.companyCode;
};

const generateEmployeeCode = async (companyId) => {
  const companyCode = await getCompanyCode(companyId);
  const lastEmployee = await findLastEmployeeByCompany(companyId);

  if (!lastEmployee?.employeeCode) {
    return `${companyCode}-EMP-000001`;
  }

  const lastNumber = Number(lastEmployee.employeeCode.split("-").pop()) || 0;
  const nextNumber = lastNumber + 1;

  return `${companyCode}-EMP-${String(nextNumber).padStart(6, "0")}`;
};

const buildEmployeeDisplayName = (payload) => {
  return [payload.firstName, payload.middleName, payload.lastName]
    .filter(Boolean)
    .join(" ");
};

const resolveEmployeeFilterReferences = async (companyId, query = {}) => {
  const resolvedQuery = { ...query };

  if (query.branchCode && !query.branchId) {
    const branch = await findBranchByCode(companyId, query.branchCode);

    if (!branch) {
      throw new ApiError(404, "Branch not found.");
    }

    resolvedQuery.branchId = branch._id;
  }

  if (query.departmentCode && !query.departmentId) {
    const department = await findDepartmentByCode(
      companyId,
      query.departmentCode
    );

    if (!department) {
      throw new ApiError(404, "Department not found.");
    }

    resolvedQuery.departmentId = department._id;
  }

  if (query.designationCode && !query.designationId) {
    const designation = await findDesignationByCode(
      companyId,
      query.designationCode
    );

    if (!designation) {
      throw new ApiError(404, "Designation not found.");
    }

    resolvedQuery.designationId = designation._id;
  }

  return resolvedQuery;
};

const buildEmployeeFilter = (companyId, query = {}) => {
  const filter = {
    companyId,
    isActive: query.includeInactive === "true" ? { $in: [true, false] } : true,
  };

  if (query.employeeStatus) filter.employeeStatus = query.employeeStatus;
  if (query.branchId) filter.branchId = query.branchId;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.designationId) filter.designationId = query.designationId;

  if (query.search) {
    filter.$or = [
      { employeeCode: { $regex: query.search, $options: "i" } },
      { displayName: { $regex: query.search, $options: "i" } },
      { officialEmail: { $regex: query.search, $options: "i" } },
      { mobile: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const ensureNoDuplicates = async (
  companyId,
  payload,
  currentEmployeeId = null
) => {
  if (payload.employeeCode) {
    const existingCode = await findEmployeeByCode(
      companyId,
      payload.employeeCode
    );

    if (
      existingCode &&
      (!currentEmployeeId ||
        existingCode._id.toString() !== currentEmployeeId.toString())
    ) {
      throw new ApiError(409, "Employee code already exists.");
    }
  }

  if (payload.officialEmail) {
    const existingEmail = await findEmployeeByOfficialEmail(
      companyId,
      payload.officialEmail
    );

    if (
      existingEmail &&
      (!currentEmployeeId ||
        existingEmail._id.toString() !== currentEmployeeId.toString())
    ) {
      throw new ApiError(409, "Official email already exists.");
    }
  }

  if (payload.mobile) {
    const existingMobile = await findEmployeeByMobile(companyId, payload.mobile);

    if (
      existingMobile &&
      (!currentEmployeeId ||
        existingMobile._id.toString() !== currentEmployeeId.toString())
    ) {
      throw new ApiError(409, "Mobile number already exists.");
    }
  }
};

const toPlainEmployee = (employee) =>
  typeof employee?.toObject === "function" ? employee.toObject() : employee;

const syncUserReportingTo = async ({ employee, reportingManagerId, updatedBy }) => {
  if (!employee?.userId) return;

  let reportingTo = null;
  if (reportingManagerId) {
    const manager = await findEmployeeById(reportingManagerId);
    reportingTo = manager?.userId || null;
  }

  await updateUserById(employee.userId, {
    reportingTo,
    updatedBy,
  });
};

const createOrLinkEmployeeLoginAccount = async ({
  currentUser,
  companyId,
  employee,
  finalPayload,
  password,
  rollbackEmployeeOnFailure = false,
}) => {
  if (!finalPayload.officialEmail) {
    throw new ApiError(
      400,
      "Official email is required to create employee login account."
    );
  }

  if (!password) {
    throw new ApiError(
      400,
      "Password is required to create employee login account."
    );
  }

  let createdUser = null;

  try {
    const existingUser = await findUserByEmail(finalPayload.officialEmail);

    if (existingUser) {
      const existingUserCompanyId =
        existingUser.companyId?._id || existingUser.companyId;

      if (
        existingUser.role !== ROLES.EMPLOYEE ||
        existingUserCompanyId?.toString() !== companyId.toString()
      ) {
        throw new ApiError(
          409,
          "A different user account already exists with this official email."
        );
      }

      const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
      const linkedUser = await updateUserById(existingUser._id, {
        name:
          employee.displayName ||
          buildEmployeeDisplayName(finalPayload) ||
          existingUser.name,
        mobile: finalPayload.mobile || existingUser.mobile || "",
        passwordHash,
        employeeCode: employee.employeeCode,
        employee: employee._id,
        status: USER_STATUS.ACTIVE,
        isEmailVerified: true,
        forcePasswordChange: false,
        reportingTo: finalPayload.reportingManagerId ? (await findEmployeeById(finalPayload.reportingManagerId))?.userId || null : null,
        updatedBy: currentUser._id,
      });

      const updatedEmployee = await updateEmployeeById(employee._id, {
        userId: linkedUser._id,
        updatedBy: currentUser._id,
      });

      return {
        ...toPlainEmployee(updatedEmployee || employee),
        userId: linkedUser._id,
        loginAccountCreated: true,
        loginEmailSentTo: linkedUser.email,
      };
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const displayName =
      employee.displayName || buildEmployeeDisplayName(finalPayload);

    createdUser = await createUserRecord({
      companyId,
      isPlatformUser: false,

      name: displayName,
      email: finalPayload.officialEmail,
      mobile: finalPayload.mobile || "",

      passwordHash,

      role: ROLES.EMPLOYEE,
      permissions: ROLE_PERMISSIONS[ROLES.EMPLOYEE] || [],

      employeeCode: employee.employeeCode,
      employee: employee._id,

      department: finalPayload.department || "",
      designation: finalPayload.designation || "",

      status: USER_STATUS.ACTIVE,

      isEmailVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,

      forcePasswordChange: false,

      createdBy: currentUser._id,
    });

    const updatedEmployee = await updateEmployeeById(employee._id, {
      userId: createdUser._id,
      updatedBy: currentUser._id,
    });

    const loginUrl = `${env.CLIENT_ORIGIN}/login`;
    let emailWarning = null;

    try {
      await sendWelcomeEmployeeEmail({
        to: createdUser.email,
        name: createdUser.name,
        employeeCode: employee.employeeCode,
        temporaryPassword: password,
        loginUrl,
      });
    } catch (emailError) {
      emailWarning =
        "Employee and login account were created, but welcome email could not be sent.";
      console.error("[createEmployee] Welcome email failed:", {
        to: createdUser.email,
        code: emailError.code,
        command: emailError.command,
        responseCode: emailError.responseCode,
        message: emailError.message,
      });
    }

    return {
      ...toPlainEmployee(updatedEmployee || employee),
      userId: createdUser._id,
      loginAccountCreated: true,
      loginEmailSentTo: createdUser.email,
      temporaryPassword: env.NODE_ENV !== "production" ? password : undefined,
      ...(emailWarning ? { emailWarning } : {}),
    };
  } catch (error) {
    if (createdUser?._id) {
      await deleteUserById(createdUser._id);
    }

    if (rollbackEmployeeOnFailure) {
      await updateEmployeeById(employee._id, {
        userId: null,
        updatedBy: currentUser._id,
      });
    }

    throw error instanceof ApiError
      ? error
      : new ApiError(
          502,
          `Employee profile was created, but login account/email setup failed. Login user was rolled back. ${error.message}`
        );
  }
};

export const createEmployeeService = async (currentUser, payload) => {
  ensureManageAccess(currentUser);

  if (currentUser.role === ROLES.COMPANY_ADMIN) {
    throw new ApiError(403, "Company Admin can create HR users. HR creates employees for this company.");
  }

  const companyId = currentUser.role === ROLES.SUPER_ADMIN
    ? payload.companyId
    : getCompanyId(currentUser);
  const bankDetails = payload.bankDetails || {};
  const statutoryDetails = payload.statutoryDetails || {};
  const leaveBalances = payload.leaveBalances || {};

  if (!companyId) {
    throw new ApiError(400, "Company is required to create employee.");
  }

  await ensureEmployeeLimit(companyId);

  const resolvedPayload = await resolveEmployeeReferences(companyId, payload, {
    partial: false,
  });

  const employeeCode =
    normalizeCode(resolvedPayload.employeeCode) ||
    (await generateEmployeeCode(companyId));

  const finalPayload = {
    ...resolvedPayload,
    employeeCode,
  };

  const shouldCreateLoginAccount = payload.createLoginAccount === true;

  if (shouldCreateLoginAccount && !finalPayload.officialEmail) {
    throw new ApiError(
      400,
      "Official email is required to create employee login account."
    );
  }

  if (shouldCreateLoginAccount && !payload.password) {
    throw new ApiError(
      400,
      "Password is required to create employee login account."
    );
  }

  if (shouldCreateLoginAccount && finalPayload.officialEmail) {
    const existingEmployee = await findEmployeeByOfficialEmail(
      companyId,
      finalPayload.officialEmail
    );

    if (existingEmployee) {
      if (existingEmployee.userId) {
        throw new ApiError(
          409,
          "Employee already exists with a login account."
        );
      }

      const employee = await createOrLinkEmployeeLoginAccount({
        currentUser,
        companyId,
        employee: existingEmployee,
        finalPayload: {
          ...toPlainEmployee(existingEmployee),
          ...finalPayload,
          employeeCode: existingEmployee.employeeCode,
        },
        password: payload.password,
      });

      await saveEmployeeProfileExtrasSafely({
        employee,
        companyId,
        bankDetails,
        statutoryDetails,
        leaveBalances,
        currentUser,
      });

      return employee;
    }
  }

  await ensureNoDuplicates(companyId, finalPayload);

  const employee = await createEmployeeRecord({
    ...finalPayload,
    companyId,
    createdBy: currentUser._id,
  });

  if (!shouldCreateLoginAccount) {
    await saveEmployeeProfileExtrasSafely({
      employee,
      companyId,
      bankDetails,
      statutoryDetails,
      leaveBalances,
      currentUser,
    });

    return employee;
  }

  const employeeWithLogin = await createOrLinkEmployeeLoginAccount({
    currentUser,
    companyId,
    employee,
    finalPayload,
    password: payload.password,
    rollbackEmployeeOnFailure: true,
  });

  await saveEmployeeProfileExtrasSafely({
    employee: employeeWithLogin,
    companyId,
    bankDetails,
    statutoryDetails,
    leaveBalances,
    currentUser,
  });

  return employeeWithLogin;
};

export const getEmployeesService = async (currentUser, query = {}) => {
  const companyId = currentUser.role === ROLES.SUPER_ADMIN && query.companyId
    ? query.companyId
    : getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const resolvedQuery = await resolveEmployeeFilterReferences(companyId, query);
  const filter = buildEmployeeFilter(companyId, resolvedQuery);

  return listEmployees({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
    currentUser,
  });
};

export const checkEmployeeCodeAvailabilityService = async (
  currentUser,
  query = {}
) => {
  const companyId = currentUser.role === ROLES.SUPER_ADMIN && query.companyId
    ? query.companyId
    : getCompanyId(currentUser);
  const employeeCode = normalizeCode(query.employeeCode);

  if (!employeeCode) {
    throw new ApiError(400, "Employee ID is required.");
  }

  const employee = await findEmployeeByCode(companyId, employeeCode);

  return {
    employeeCode,
    available: !employee,
  };
};

export const getEmployeeByIdService = async (currentUser, id) => {
  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  return employee;
};

export const updateEmployeeService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  const resolvedPayload = await resolveEmployeeReferences(companyId, payload, {
    partial: true,
  });

  if (
    resolvedPayload.reportingManagerId &&
    resolvedPayload.reportingManagerId.toString() === employee._id.toString()
  ) {
    throw new ApiError(400, "Employee cannot be their own reporting manager.");
  }

  await ensureNoDuplicates(companyId, resolvedPayload, employee._id);

  const updated = await updateEmployeeById(id, {
    ...resolvedPayload,
    updatedBy: currentUser._id,
  });

  if (Object.prototype.hasOwnProperty.call(resolvedPayload, "reportingManagerId")) {
    await syncUserReportingTo({
      employee: updated,
      reportingManagerId: resolvedPayload.reportingManagerId,
      updatedBy: currentUser._id,
    });
  }

  return updated;
};

export const updateEmployeePhotoService = async (currentUser, id, employeePhoto) => {
  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  const isOwnEmployee =
    currentUser.employee?.toString?.() === employee._id.toString() ||
    currentUser.employee?.toString?.() === id ||
    currentUser._id?.toString?.() === employee.userId?.toString?.();

  if (!isOwnEmployee) {
    ensureManageAccess(currentUser);
  }

  return updateEmployeeById(id, {
    employeePhoto,
    updatedBy: currentUser._id,
  });
};


export const updateWorkFromHomeAttendanceService = async (currentUser, id, payload) => {
  ensureCompanyAdminAccess(currentUser);

  const employee = await findEmployeeById(id);
  if (!employee) throw new ApiError(404, "Employee not found.");
  ensureSameCompany(currentUser, employee);

  const allowed = payload.workFromHomeAttendanceAllowed === true;
  const updated = await updateEmployeeById(id, {
    workFromHomeAttendanceAllowed: allowed,
    workFromHomeAttendanceAllowedBy: allowed ? currentUser._id : null,
    workFromHomeAttendanceAllowedAt: allowed ? new Date() : null,
    updatedBy: currentUser._id,
  });

  return updated;
};
export const updateEmployeeStatusService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  const updatePayload = {
    employeeStatus: payload.employeeStatus,
    updatedBy: currentUser._id,
  };

  if (
    [
      EMPLOYEE_STATUS.INACTIVE,
      EMPLOYEE_STATUS.RESIGNED,
      EMPLOYEE_STATUS.TERMINATED,
      EMPLOYEE_STATUS.ABSCONDED,
      EMPLOYEE_STATUS.RETIRED,
    ].includes(payload.employeeStatus)
  ) {
    updatePayload.exitDate = payload.exitDate || new Date();
    updatePayload.exitReason = payload.exitReason || "";
    updatePayload.isActive = false;
  }

  if (
    [
      EMPLOYEE_STATUS.ACTIVE,
      EMPLOYEE_STATUS.PROBATION,
      EMPLOYEE_STATUS.CONFIRMED,
      EMPLOYEE_STATUS.NOTICE_PERIOD,
    ].includes(payload.employeeStatus)
  ) {
    updatePayload.isActive = true;
  }

  const updated = await updateEmployeeById(id, updatePayload);

  if (employee.userId) {
    await updateUserById(employee.userId, {
      status: [EMPLOYEE_STATUS.ACTIVE, EMPLOYEE_STATUS.PROBATION, EMPLOYEE_STATUS.CONFIRMED, EMPLOYEE_STATUS.NOTICE_PERIOD].includes(payload.employeeStatus) ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE,
      updatedBy: currentUser._id,
    });
  }

  return updated;
};

export const deleteEmployeeService = async (currentUser, id) => {
  ensureManageAccess(currentUser);

  const employee = await findEmployeeById(id);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  ensureSameCompany(currentUser, employee);

  const updated = await softDeleteEmployeeById(id, currentUser._id);

  if (employee.userId) {
    await updateUserById(employee.userId, {
      status: USER_STATUS.INACTIVE,
      updatedBy: currentUser._id,
    });
  }

  return updated;
};

/* ---------------- Employee Details ---------------- */

export const upsertEmployeeFamilyService = async (
  currentUser,
  employeeId,
  payload
) => {
  ensureManageAccess(currentUser);

  const employee = await getEmployeeByIdService(currentUser, employeeId);

  return upsertEmployeeFamily(employee._id, {
    companyId: employee.companyId,
    employeeId: employee._id,
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const getEmployeeFamilyService = async (currentUser, employeeId) => {
  await getEmployeeByIdService(currentUser, employeeId);
  return findEmployeeFamily(employeeId);
};

export const upsertEmployeeBankService = async (
  currentUser,
  employeeId,
  payload
) => {
  ensureManageAccess(currentUser);

  const employee = await getEmployeeByIdService(currentUser, employeeId);

  return upsertEmployeeBank(employee._id, {
    companyId: employee.companyId,
    employeeId: employee._id,
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const getEmployeeBankService = async (currentUser, employeeId) => {
  await getEmployeeByIdService(currentUser, employeeId);
  return findEmployeeBank(employeeId);
};

export const upsertEmployeeStatutoryService = async (
  currentUser,
  employeeId,
  payload
) => {
  ensureManageAccess(currentUser);

  const employee = await getEmployeeByIdService(currentUser, employeeId);

  return upsertEmployeeStatutory(employee._id, {
    companyId: employee.companyId,
    employeeId: employee._id,
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const getEmployeeStatutoryService = async (currentUser, employeeId) => {
  await getEmployeeByIdService(currentUser, employeeId);
  return findEmployeeStatutory(employeeId);
};

export const upsertEmployeeDocumentsService = async (
  currentUser,
  employeeId,
  payload
) => {
  ensureManageAccess(currentUser);

  const employee = await getEmployeeByIdService(currentUser, employeeId);

  return upsertEmployeeDocuments(employee._id, {
    companyId: employee.companyId,
    employeeId: employee._id,
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const getEmployeeDocumentsService = async (currentUser, employeeId) => {
  await getEmployeeByIdService(currentUser, employeeId);
  return findEmployeeDocuments(employeeId);
};

/* ---------------- Dashboard ---------------- */

export const getEmployeeDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [
    employeeProfile,
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    resignedEmployees,
    upcomingBirthdays,
    upcomingHolidays,
    companyProfile,
  ] = await Promise.all([
    findEmployeeProfile({
      companyId,
      employeeId: currentUser.employee,
      userId: currentUser._id,
      employeeCode: currentUser.employeeCode,
    }),
    countEmployees({ companyId }),
    countEmployees({ companyId, isActive: true }),
    countEmployees({ companyId, isActive: false }),
    countEmployees({ companyId, employeeStatus: EMPLOYEE_STATUS.RESIGNED }),
    getUpcomingBirthdays(companyId, 10),
    getUpcomingHolidays(companyId, 24),
    Company.findById(companyId).select("companyName companyCode logo settings").lean(),
  ]);

  return {
    employee: employeeProfile,
    company: companyProfile || currentUser.companyId || null,
    user: {
      id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      mobile: currentUser.mobile,
      role: currentUser.role,
      employeeCode: currentUser.employeeCode,
      department: currentUser.department,
      designation: currentUser.designation,
      status: currentUser.status,
    },
    summary: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      resignedEmployees,
    },
    upcomingBirthdays,
    holidays: {
      upcoming: upcomingHolidays,
    },
  };
};








