import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";

import {
  findBranchById,
  findBranchByCode,
} from "../repositories/employee.repository.js";

import {
  createHolidayRecord,
  findHolidayById,
  findHolidayByDateName,
  listHolidays,
  updateHolidayById,
  deleteHolidayById,
  getUpcomingHolidays,
  countHolidays,
} from "../repositories/holiday.repository.js";

const hasValue = (value) => {
  return value !== undefined && value !== null && value !== "";
};

const normalizeCode = (value) => {
  if (!hasValue(value)) return null;
  return String(value).trim().toUpperCase();
};

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureHolidayAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage holidays.");
  }
};

const ensureSameCompany = (companyId, record, message = "Holiday not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const resolveBranch = async (companyId, payload = {}) => {
  const branchId = payload.branchId;
  const branchCode = normalizeCode(payload.branchCode);

  if (!hasValue(branchId) && !branchCode) {
    return null;
  }

  let branch = null;

  if (hasValue(branchId)) {
    branch = await findBranchById(branchId);
  }

  if (!branch && branchCode) {
    branch = await findBranchByCode(companyId, branchCode);
  }

  if (!branch || branch.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, "Invalid branch for this company.");
  }

  return branch;
};

const normalizeHolidayPayload = async (companyId, payload = {}, partial = false) => {
  const normalized = { ...payload };

  if (!partial || "branchId" in payload || "branchCode" in payload) {
    const branch = await resolveBranch(companyId, payload);
    normalized.branchId = branch?._id || null;
  }

  if (payload.date) {
    normalized.date = normalizeDate(payload.date);
  }

  delete normalized.branchCode;

  return normalized;
};

export const createHolidayService = async (currentUser, payload) => {
  ensureHolidayAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const normalizedPayload = await normalizeHolidayPayload(
    companyId,
    payload,
    false
  );

  const date = normalizeDate(normalizedPayload.date);

  const exists = await findHolidayByDateName({
    companyId,
    branchId: normalizedPayload.branchId || null,
    date,
    holidayName: normalizedPayload.holidayName,
  });

  if (exists) {
    throw new ApiError(409, "Holiday already exists for this date.");
  }

  return createHolidayRecord({
    ...normalizedPayload,
    companyId,
    date,
    createdBy: currentUser._id,
  });
};

export const getHolidaysService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.branchId) {
    filter.branchId = query.branchId;
  }

  if (query.branchCode) {
    const branch = await resolveBranch(companyId, {
      branchCode: query.branchCode,
    });

    filter.branchId = branch._id;
  }

  if (query.type) {
    filter.type = query.type;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.from || query.to) {
    filter.date = {};

    if (query.from) {
      filter.date.$gte = normalizeDate(query.from);
    }

    if (query.to) {
      filter.date.$lte = normalizeDate(query.to);
    }
  }

  if (query.search) {
    filter.holidayName = { $regex: query.search, $options: "i" };
  }

  return listHolidays({
    filter,
    page,
    limit,
    sort: { date: 1 },
  });
};

export const getHolidayByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);

  const holiday = await findHolidayById(id);

  ensureSameCompany(companyId, holiday);

  return holiday;
};

export const updateHolidayService = async (currentUser, id, payload) => {
  ensureHolidayAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const holiday = await findHolidayById(id);

  ensureSameCompany(companyId, holiday);

  const normalizedPayload = await normalizeHolidayPayload(
    companyId,
    payload,
    true
  );

  return updateHolidayById(id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });
};

export const deleteHolidayService = async (currentUser, id) => {
  ensureHolidayAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const holiday = await findHolidayById(id);

  ensureSameCompany(companyId, holiday);

  await deleteHolidayById(id);

  return true;
};

export const getHolidayDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const totalHolidays = await countHolidays({
    companyId,
    isActive: true,
  });

  const upcomingHolidays = await getUpcomingHolidays(companyId, 10);

  return {
    totalHolidays,
    upcomingHolidays,
  };
};