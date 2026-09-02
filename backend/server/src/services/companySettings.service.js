import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { Employee } from "../models/Employee.js";
import { countEmployees } from "../repositories/employee.repository.js";
import { Designation as DesignationModel } from "../models/Designation.js";

import {
  createBranch,
  updateBranch,
  deleteBranch,
  findBranch,
  findBranchByCode,
  listBranches,

  createDepartment,
  updateDepartment,
  deleteDepartment,
  findDepartment,
  findDepartmentByCode,
  listDepartments,

  createDesignation,
  updateDesignation,
  deleteDesignation,
  findDesignation,
  listDesignations,

  createHoliday,
  updateHoliday,
  deleteHoliday,
  findHoliday,
  listHolidays,
} from "../repositories/companySettings.repository.js";

const getCompanyId = (currentUser, requestedCompanyId = null) => {
  if (currentUser.role === ROLES.SUPER_ADMIN && requestedCompanyId) {
    return requestedCompanyId;
  }

  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const canManageSettings = (currentUser) => {
  return [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN].includes(currentUser.role);
};

const canManageDepartmentStructure = (currentUser) => {
  return [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role);
};

const ensureManageAccess = (currentUser) => {
  if (!canManageSettings(currentUser)) {
    throw new ApiError(403, "You are not allowed to manage company settings.");
  }
};

const ensureDepartmentStructureAccess = (currentUser) => {
  if (!canManageDepartmentStructure(currentUser)) {
    throw new ApiError(403, "You are not allowed to manage departments and designations.");
  }
};

const ensureSameCompany = (currentUser, record) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) return;

  const userCompanyId = getCompanyId(currentUser).toString();
  const recordCompanyId = record.companyId.toString();

  if (userCompanyId !== recordCompanyId) {
    throw new ApiError(403, "You cannot access another company's data.");
  }
};

const cleanEmpty = (value) => {
  if (value === "" || value === undefined) return null;
  return value;
};

const normalizeCode = (value) => {
  if (!value) return null;
  return String(value).trim().toUpperCase();
};

const resolveBranchId = async (companyId, payload) => {
  if (payload.branchId) return payload.branchId;

  const branchCode = normalizeCode(payload.branchCode);
  if (!branchCode) return null;

  const branch = await findBranchByCode(companyId, branchCode);

  if (!branch) {
    throw new ApiError(404, `Branch not found for code: ${branchCode}`);
  }

  return branch._id;
};

const resolveDepartmentId = async (companyId, payload) => {
  if (payload.departmentId) return payload.departmentId;

  const departmentCode = normalizeCode(payload.departmentCode);
  if (!departmentCode) return null;

  const department = await findDepartmentByCode(companyId, departmentCode);

  if (!department) {
    throw new ApiError(404, `Department not found for code: ${departmentCode}`);
  }

  return department._id;
};

const removeDepartmentLookupFields = (payload) => {
  const cleaned = { ...payload };
  delete cleaned.branchCode;
  return cleaned;
};

const removeDesignationLookupFields = (payload) => {
  const cleaned = { ...payload };
  delete cleaned.departmentCode;
  return cleaned;
};

/* ---------------- Branch ---------------- */

export const createBranchService = async (currentUser, payload) => {
  ensureManageAccess(currentUser);

  const branch = await createBranch({
    ...payload,
    companyId: getCompanyId(currentUser),
    createdBy: currentUser._id,
  });

  return branch;
};

export const getBranchesService = async (currentUser, query = {}) => {
  return listBranches(getCompanyId(currentUser, query.companyId));
};

export const updateBranchService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const branch = await findBranch(id);

  if (!branch) {
    throw new ApiError(404, "Branch not found.");
  }

  ensureSameCompany(currentUser, branch);

  const updated = await updateBranch(id, {
    ...payload,
    updatedBy: currentUser._id,
  });

  return updated;
};

export const deleteBranchService = async (currentUser, id) => {
  ensureManageAccess(currentUser);

  const branch = await findBranch(id);

  if (!branch) {
    throw new ApiError(404, "Branch not found.");
  }

  ensureSameCompany(currentUser, branch);

  await deleteBranch(id);

  return true;
};

/* ---------------- Department ---------------- */

export const createDepartmentService = async (currentUser, payload) => {
  ensureDepartmentStructureAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const branchId = cleanEmpty(await resolveBranchId(companyId, payload));
  const cleanedPayload = removeDepartmentLookupFields(payload);

  const department = await createDepartment({
    ...cleanedPayload,
    branchId,
    companyId,
    createdBy: currentUser._id,
  });

  return department;
};

export const getDepartmentsService = async (currentUser, query = {}) => {
  return listDepartments(getCompanyId(currentUser, query.companyId));
};

export const updateDepartmentService = async (currentUser, id, payload) => {
  ensureDepartmentStructureAccess(currentUser);

  const department = await findDepartment(id);

  if (!department) {
    throw new ApiError(404, "Department not found.");
  }

  ensureSameCompany(currentUser, department);

  const companyId = getCompanyId(currentUser);
  const cleanedPayload = removeDepartmentLookupFields(payload);

  if (Object.prototype.hasOwnProperty.call(payload, "branchCode")) {
    cleanedPayload.branchId = cleanEmpty(await resolveBranchId(companyId, payload));
  } else if (Object.prototype.hasOwnProperty.call(payload, "branchId")) {
    cleanedPayload.branchId = cleanEmpty(payload.branchId);
  }

  const updated = await updateDepartment(id, {
    ...cleanedPayload,
    updatedBy: currentUser._id,
  });

  return updated;
};

export const deleteDepartmentService = async (currentUser, id) => {
  ensureDepartmentStructureAccess(currentUser);

  const department = await findDepartment(id);

  if (!department) {
    throw new ApiError(404, "Department not found.");
  }

  ensureSameCompany(currentUser, department);

  const [designationCount, employeeCount] = await Promise.all([
    DesignationModel.countDocuments({ companyId: department.companyId, departmentId: department._id }),
    countEmployees({ companyId: department.companyId, departmentId: department._id }),
  ]);

  if (designationCount > 0) {
    throw new ApiError(409, "Department has designations. Delete or move those designations first.");
  }

  if (employeeCount > 0) {
    throw new ApiError(409, "Department is assigned to employees. Move employees before deleting this department.");
  }

  await deleteDepartment(id);

  return true;
};

/* ---------------- Designation ---------------- */

export const createDesignationService = async (currentUser, payload) => {
  ensureDepartmentStructureAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const departmentId = cleanEmpty(await resolveDepartmentId(companyId, payload));
  const cleanedPayload = removeDesignationLookupFields(payload);

  const designation = await createDesignation({
    ...cleanedPayload,
    departmentId,
    companyId,
    createdBy: currentUser._id,
  });

  return designation;
};

export const getDesignationsService = async (currentUser, query = {}) => {
  return listDesignations(getCompanyId(currentUser, query.companyId));
};

export const updateDesignationService = async (currentUser, id, payload) => {
  ensureDepartmentStructureAccess(currentUser);

  const designation = await findDesignation(id);

  if (!designation) {
    throw new ApiError(404, "Designation not found.");
  }

  ensureSameCompany(currentUser, designation);

  const companyId = getCompanyId(currentUser);
  const cleanedPayload = removeDesignationLookupFields(payload);

  if (Object.prototype.hasOwnProperty.call(payload, "departmentCode")) {
    cleanedPayload.departmentId = cleanEmpty(
      await resolveDepartmentId(companyId, payload)
    );
  } else if (Object.prototype.hasOwnProperty.call(payload, "departmentId")) {
    cleanedPayload.departmentId = cleanEmpty(payload.departmentId);
  }

  const updated = await updateDesignation(id, {
    ...cleanedPayload,
    updatedBy: currentUser._id,
  });

  return updated;
};

export const deleteDesignationService = async (currentUser, id) => {
  ensureDepartmentStructureAccess(currentUser);

  const designation = await findDesignation(id);

  if (!designation) {
    throw new ApiError(404, "Designation not found.");
  }

  ensureSameCompany(currentUser, designation);

  const employeeCount = await countEmployees({
    companyId: designation.companyId,
    designationId: designation._id,
  });

  if (employeeCount > 0) {
    throw new ApiError(409, "Designation is assigned to employees. Move employees before deleting this designation.");
  }

  await deleteDesignation(id);

  return true;
};

/* ---------------- Holiday ---------------- */

export const createHolidayService = async (currentUser, payload) => {
  ensureManageAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const branchId = cleanEmpty(await resolveBranchId(companyId, payload));
  const cleanedPayload = removeDepartmentLookupFields(payload);

  const holiday = await createHoliday({
    ...cleanedPayload,
    branchId,
    companyId,
    createdBy: currentUser._id,
  });

  return holiday;
};

export const getHolidaysService = async (currentUser, query = {}) => {
  return listHolidays(getCompanyId(currentUser, query.companyId));
};

export const updateHolidayService = async (currentUser, id, payload) => {
  ensureManageAccess(currentUser);

  const holiday = await findHoliday(id);

  if (!holiday) {
    throw new ApiError(404, "Holiday not found.");
  }

  ensureSameCompany(currentUser, holiday);

  const companyId = getCompanyId(currentUser);
  const cleanedPayload = removeDepartmentLookupFields(payload);

  if (Object.prototype.hasOwnProperty.call(payload, "branchCode")) {
    cleanedPayload.branchId = cleanEmpty(await resolveBranchId(companyId, payload));
  } else if (Object.prototype.hasOwnProperty.call(payload, "branchId")) {
    cleanedPayload.branchId = cleanEmpty(payload.branchId);
  }

  const updated = await updateHoliday(id, {
    ...cleanedPayload,
    updatedBy: currentUser._id,
  });

  return updated;
};

export const deleteHolidayService = async (currentUser, id) => {
  ensureManageAccess(currentUser);

  const holiday = await findHoliday(id);

  if (!holiday) {
    throw new ApiError(404, "Holiday not found.");
  }

  ensureSameCompany(currentUser, holiday);

  await deleteHoliday(id);

  return true;
};


