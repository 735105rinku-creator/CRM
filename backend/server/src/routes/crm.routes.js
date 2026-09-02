import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireTenant } from "../middleware/tenant.middleware.js";
import { CrmLead } from "../models/CrmLead.js";
import { CrmDeal } from "../models/CrmDeal.js";
import { CrmTask } from "../models/CrmTask.js";
import { CrmQuotation } from "../models/CrmQuotation.js";
import { EmployeeDailyTask } from "../models/EmployeeDailyTask.js";
import { Employee } from "../models/Employee.js";
import { withVisibleEmployeeFilter } from "../repositories/employee.repository.js";
import { EmployeeBank } from "../models/EmployeeBank.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../constants/roles.js";

const router = Router();
router.use(requireAuth);
router.use(requireTenant);

const models = {
  leads: CrmLead,
  deals: CrmDeal,
  tasks: CrmTask,
  quotations: CrmQuotation,
};

const responseKeys = {
  leads: "leads",
  deals: "deals",
  tasks: "tasks",
  quotations: "quotations",
};

const companyIdOf = (user, auth = {}) => auth.companyId || user?.companyId?._id || user?.companyId;
const getEmployeeCode = (user) => String(user?.employeeCode || "").trim().toUpperCase();
const isCompanyScopeUser = (user) => [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.HR].includes(user.role) || Number(user.roleRef?.level) <= 2;
const canCreateEmployeeCrm = (user) => user.role === ROLES.EMPLOYEE || Number(user.roleRef?.level) >= 4;

const scopeFilter = (req) => {
  const companyId = companyIdOf(req.user, req.auth);
  if (!companyId) throw new ApiError(403, "Company context missing.");

  const filter = { companyId };
  const requestedEmployeeCode = String(req.query.employeeCode || "").trim().toUpperCase();
  const currentEmployeeCode = getEmployeeCode(req.user);
  if (requestedEmployeeCode && isCompanyScopeUser(req.user)) {
    filter.assignedEmployeeCode = requestedEmployeeCode;
  }

  if (!isCompanyScopeUser(req.user)) {
    filter.$or = [
      { assignedUserId: req.user._id },
      { createdBy: req.user._id },
      { assignedEmployeeCode: currentEmployeeCode },
    ];
  }

  const { todayStart, tomorrowStart, monthStart, nextMonthStart } = periodBounds();
  const period = String(req.query.period || "").toLowerCase();
  if (period === "today") filter.createdAt = { $gte: todayStart, $lt: tomorrowStart };
  if (period === "month" || period === "monthly") filter.createdAt = { $gte: monthStart, $lt: nextMonthStart };

  return filter;
};

const clean = (payload, allowed) => allowed.reduce((acc, key) => {
  if (Object.prototype.hasOwnProperty.call(payload, key)) acc[key] = payload[key];
  return acc;
}, {});

const assignment = (req, payload = {}, forceDefault = true) => {
  const currentEmployeeCode = getEmployeeCode(req.user);
  const hasExplicitAssignment = Object.prototype.hasOwnProperty.call(payload, "assignedUserId") || Object.prototype.hasOwnProperty.call(payload, "assignedEmployeeCode");

  if (isCompanyScopeUser(req.user)) {
    if (!forceDefault && !hasExplicitAssignment) return {};
    return {
      assignedUserId: payload.assignedUserId || req.user._id,
      assignedEmployeeCode: String(payload.assignedEmployeeCode || currentEmployeeCode || "").toUpperCase(),
    };
  }

  return {
    assignedUserId: req.user._id,
    assignedEmployeeCode: currentEmployeeCode,
  };
};

const periodBounds = () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { todayStart, tomorrowStart, monthStart, nextMonthStart };
};

const applyDateRangeFilter = (filter, query = {}) => {
  const from = query.fromDate ? new Date(query.fromDate) : null;
  const to = query.toDate ? new Date(query.toDate) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    throw new ApiError(400, "Invalid date range.");
  }

  if (!from && !to) return filter;

  const createdAt = { ...(filter.createdAt || {}) };
  if (from) createdAt.$gte = from;
  if (to) {
    to.setHours(23, 59, 59, 999);
    createdAt.$lte = to;
  }
  filter.createdAt = createdAt;
  return filter;
};

const rowAmount = (row) => Number(row.value ?? row.amount ?? 0) || 0;
const employeeName = (employee = {}) => employee.displayName || [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.officialEmail || employee.employeeCode || "Employee";
const departmentName = (employee = {}) => employee.departmentId?.departmentName || employee.departmentId?.departmentCode || "Unassigned";
const designationName = (employee = {}) => employee.designationId?.designationName || employee.designationId?.designationCode || employee.organizationRole || "-";

const enrichRows = async (companyId, rows) => {
  const employeeCodes = Array.from(new Set(rows.map((row) => String(row.assignedEmployeeCode || "").toUpperCase()).filter(Boolean)));
  const employees = employeeCodes.length
    ? await Employee.find(await withVisibleEmployeeFilter({ companyId, employeeCode: { $in: employeeCodes } })).select("employeeCode displayName firstName lastName officialEmail").lean()
    : [];
  const employeesByCode = new Map(employees.map((employee) => [employee.employeeCode, employee]));
  const { todayStart, tomorrowStart, monthStart, nextMonthStart } = periodBounds();

  return rows.map((row) => {
    const employee = employeesByCode.get(String(row.assignedEmployeeCode || "").toUpperCase());
    const createdAt = row.createdAt ? new Date(row.createdAt) : null;
    const isToday = Boolean(createdAt && createdAt >= todayStart && createdAt < tomorrowStart);
    const isThisMonth = Boolean(createdAt && createdAt >= monthStart && createdAt < nextMonthStart);
    return {
      ...row,
      assignedEmployeeName: employee ? employeeName(employee) : row.assignedEmployeeCode || "Unassigned",
      createdDateStatus: isToday ? "Today" : isThisMonth ? "This month" : "Older",
      isToday,
      isThisMonth,
    };
  });
};

const dailyTaskSummary = (rows) => ({
  totalCount: rows.length,
  todayCount: rows.filter((row) => row.isToday).length,
  monthCount: rows.filter((row) => row.isThisMonth).length,
  completedCount: rows.filter((row) => row.status === "completed").length,
  blockedCount: rows.filter((row) => row.status === "blocked").length,
  totalHours: rows.reduce((sum, row) => sum + Number(row.hoursSpent || 0), 0),
  employeeCounts: buildSummary(rows).employeeCounts,
});
const buildSummary = (rows) => {
  const summary = {
    totalCount: rows.length,
    todayCount: 0,
    monthCount: 0,
    totalAmount: 0,
    todayAmount: 0,
    monthAmount: 0,
    statusCounts: {},
    employeeCounts: [],
  };
  const employeeMap = new Map();

  for (const row of rows) {
    const amount = rowAmount(row);
    const status = row.status || row.stage || "Open";
    const employeeKey = row.assignedEmployeeCode || row.assignedEmployeeName || "Unassigned";
    const employee = employeeMap.get(employeeKey) || { employeeCode: row.assignedEmployeeCode || "", employeeName: row.assignedEmployeeName || "Unassigned", total: 0, today: 0, month: 0, amount: 0 };

    summary.totalAmount += amount;
    summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
    employee.total += 1;
    employee.amount += amount;

    if (row.isToday) {
      summary.todayCount += 1;
      summary.todayAmount += amount;
      employee.today += 1;
    }

    if (row.isThisMonth) {
      summary.monthCount += 1;
      summary.monthAmount += amount;
      employee.month += 1;
    }

    employeeMap.set(employeeKey, employee);
  }

  summary.employeeCounts = Array.from(employeeMap.values()).sort((a, b) => b.total - a.total || a.employeeName.localeCompare(b.employeeName));
  return summary;
};

const searchableFields = {
  leads: ["name", "company", "phone", "email", "source", "status", "businessCategory", "commodity", "originLocation", "destinationLocation"],
  deals: ["name", "company", "phone", "email", "stage", "status", "businessCategory", "commodity", "originLocation", "destinationLocation"],
  tasks: ["title", "description", "status", "priority", "employeeCode", "assignedEmployeeCode"],
  quotations: ["quotationNumber", "clientName", "status", "notes"],
};

const applySearchFilter = (filter, moduleName, search) => {
  const q = String(search || "").trim();
  if (!q) return filter;
  const fields = searchableFields[moduleName] || [];
  if (!fields.length) return filter;
  return {
    ...filter,
    $or: fields.map((field) => ({ [field]: { $regex: q, $options: "i" } })),
  };
};

const listRecords = (moduleName) => asyncHandler(async (req, res) => {
  const Model = models[moduleName];
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 200);
  const companyId = companyIdOf(req.user);
  const filter = applySearchFilter(applyDateRangeFilter(scopeFilter(req), req.query), moduleName, req.query.search);
  const [rows, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);
  const enrichedRows = await enrichRows(companyId, rows);
  const pagination = { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) };
  console.log('[CRM][backend] list', {
    moduleName,
    userRole: req.user?.role,
    companyId,
    employeeCode: req.query.employeeCode,
    filter,
    count: enrichedRows.length,
    pagination,
    rows: enrichedRows.slice(0, 5)
  });
  res.json(new ApiResponse(200, { [responseKeys[moduleName]]: enrichedRows, summary: buildSummary(enrichedRows), pagination }, `${moduleName} fetched.`));
});

const createRecord = (moduleName, allowed) => asyncHandler(async (req, res) => {
  if (["leads", "deals"].includes(moduleName) && !canCreateEmployeeCrm(req.user) && !isCompanyScopeUser(req.user)) {
    throw new ApiError(403, "Only employees and company-scope roles can create CRM leads and deals.");
  }
  const Model = models[moduleName];
  const payload = clean(req.body || {}, allowed);
  const row = await Model.create({
    ...payload,
    ...assignment(req, req.body),
    companyId: companyIdOf(req.user),
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  console.log('[CRM][backend] create', {
    moduleName,
    userRole: req.user?.role,
    companyId: companyIdOf(req.user),
    payload,
    assignment: assignment(req, req.body),
    createdRow: row
  });
  res.status(201).json(new ApiResponse(201, row, `${moduleName.slice(0, -1)} created.`));
});

const updateRecord = (moduleName, allowed) => asyncHandler(async (req, res) => {
  if (["leads", "deals"].includes(moduleName) && req.user.role === ROLES.HR) {
    throw new ApiError(403, "HR can only view employee CRM leads and deals.");
  }
  const Model = models[moduleName];
  const row = await Model.findOneAndUpdate(
    { _id: req.params.id, ...scopeFilter(req) },
    { ...clean(req.body || {}, allowed), ...assignment(req, req.body, false), updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!row) throw new ApiError(404, `${moduleName.slice(0, -1)} not found.`);
  res.json(new ApiResponse(200, row, `${moduleName.slice(0, -1)} updated.`));
});

router.get("/leads", listRecords("leads"));
router.post("/leads", createRecord("leads", ["name", "company", "phone", "email", "source", "businessCategory", "tradeType", "commodity", "quantity", "originLocation", "destinationLocation", "routeType", "logisticsRequired", "shipmentMode", "incoterm", "status", "notes"]));
router.patch("/leads/:id", updateRecord("leads", ["name", "company", "phone", "email", "source", "businessCategory", "tradeType", "commodity", "quantity", "originLocation", "destinationLocation", "routeType", "logisticsRequired", "shipmentMode", "incoterm", "status", "notes", "assignedUserId", "assignedEmployeeCode"]));

router.get("/deals", listRecords("deals"));
router.post("/deals", createRecord("deals", ["leadId", "clientName", "value", "stage", "businessCategory", "tradeType", "commodity", "quantity", "originLocation", "destinationLocation", "routeType", "logisticsRequired", "shipmentMode", "incoterm", "expectedClose", "notes"]));
router.patch("/deals/:id", updateRecord("deals", ["leadId", "clientName", "value", "stage", "businessCategory", "tradeType", "commodity", "quantity", "originLocation", "destinationLocation", "routeType", "logisticsRequired", "shipmentMode", "incoterm", "expectedClose", "notes", "assignedUserId", "assignedEmployeeCode"]));

router.get("/tasks", listRecords("tasks"));
router.post("/tasks", createRecord("tasks", ["title", "relatedTo", "taskType", "businessCategory", "routeType", "dueDate", "priority", "status"]));
router.patch("/tasks/:id", updateRecord("tasks", ["title", "relatedTo", "taskType", "businessCategory", "routeType", "dueDate", "priority", "status", "assignedUserId", "assignedEmployeeCode"]));

router.get("/contacts", asyncHandler(async (req, res) => {
  const companyId = companyIdOf(req.user);
  const limit = Math.min(Number(req.query.limit || 200), 300);
  const employees = await Employee.find(await withVisibleEmployeeFilter({ companyId, isActive: true }))
    .populate("departmentId", "departmentName departmentCode")
    .populate("designationId", "designationName designationCode")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const contacts = employees.map((employee) => ({
    _id: employee._id,
    employeeCode: employee.employeeCode,
    employeeName: employeeName(employee),
    officialEmail: employee.officialEmail,
    personalEmail: employee.personalEmail,
    mobile: employee.mobile,
    alternateMobile: employee.alternateMobile,
    department: departmentName(employee),
    designation: designationName(employee),
    workLocation: employee.workLocation,
    emergencyContact: employee.emergencyContact || {},
    employeeStatus: employee.employeeStatus,
    createdAt: employee.createdAt,
  }));

  res.json(new ApiResponse(200, { contacts, total: contacts.length }, "Employee contacts fetched."));
}));

router.get("/accounts", asyncHandler(async (req, res) => {
  const companyId = companyIdOf(req.user);
  const limit = Math.min(Number(req.query.limit || 200), 300);
  const employees = await Employee.find(await withVisibleEmployeeFilter({ companyId, isActive: true }))
    .populate("departmentId", "departmentName departmentCode")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const employeeIds = employees.map((employee) => employee._id);
  const banks = employeeIds.length
    ? await EmployeeBank.find({ companyId, employeeId: { $in: employeeIds } }).lean()
    : [];
  const bankByEmployee = new Map(banks.map((bank) => [String(bank.employeeId), bank]));

  const accounts = employees.map((employee) => {
    const bank = bankByEmployee.get(String(employee._id)) || {};
    return {
      _id: employee._id,
      employeeCode: employee.employeeCode,
      employeeName: employeeName(employee),
      department: departmentName(employee),
      officialEmail: employee.officialEmail,
      mobile: employee.mobile,
      bankName: bank.bankName || "",
      branchName: bank.branchName || "",
      accountHolderName: bank.accountHolderName || employeeName(employee),
      accountNumber: bank.accountNumber || "",
      ifscCode: bank.ifscCode || "",
      upiId: bank.upiId || "",
      paymentMode: bank.paymentMode || "",
      isSalaryAccount: bank.isSalaryAccount ?? false,
      hasBankDetails: Boolean(bank._id),
      createdAt: bank.createdAt || employee.createdAt,
    };
  });

  res.json(new ApiResponse(200, { accounts, total: accounts.length }, "Employee accounts fetched."));
}));

router.get("/daily-tasks", asyncHandler(async (req, res) => {
  const companyId = companyIdOf(req.user);
  const limit = Math.min(Number(req.query.limit || 150), 300);
  const filter = { companyId };
  const requestedEmployeeCode = String(req.query.employeeCode || "").trim().toUpperCase();
  if (requestedEmployeeCode && isCompanyScopeUser(req.user)) filter.employeeCode = requestedEmployeeCode;
  if (!isCompanyScopeUser(req.user)) {
    filter.$or = [
      { employeeUserId: req.user._id },
      { createdBy: req.user._id },
      { employeeCode: String(req.user.employeeCode || "").toUpperCase() },
    ];
  }
  const { todayStart, tomorrowStart, monthStart, nextMonthStart } = periodBounds();
  const period = String(req.query.period || "").toLowerCase();
  if (period === "today") filter.workDate = { $gte: todayStart, $lt: tomorrowStart };
  if (period === "month" || period === "monthly") filter.workDate = { $gte: monthStart, $lt: nextMonthStart };
  const rows = await EmployeeDailyTask.find(filter).sort({ workDate: -1, createdAt: -1 }).limit(limit).lean();
  const enriched = await enrichRows(companyId, rows.map((row) => ({ ...row, assignedEmployeeCode: row.employeeCode, createdAt: row.workDate || row.createdAt })));
  res.json(new ApiResponse(200, { dailyTasks: enriched, summary: dailyTaskSummary(enriched) }, "Daily CRM tasks fetched."));
}));

router.post("/daily-tasks", asyncHandler(async (req, res) => {
  if (!canCreateEmployeeCrm(req.user)) throw new ApiError(403, "Only employees can add daily CRM work. HR and Company Admin can only view it.");
  const title = String(req.body.title || "").trim();
  if (!title) throw new ApiError(400, "Daily task title is required.");
  const workDate = req.body.workDate ? new Date(req.body.workDate) : new Date();
  const row = await EmployeeDailyTask.create({
    companyId: companyIdOf(req.user),
    employeeUserId: req.user._id,
    employeeCode: String(req.user.employeeCode || "").toUpperCase(),
    workDate,
    title,
    description: String(req.body.description || "").trim(),
    category: String(req.body.category || "CRM").trim(),
    status: String(req.body.status || "completed").trim(),
    hoursSpent: Number(req.body.hoursSpent || 0),
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  res.status(201).json(new ApiResponse(201, row, "Daily CRM task added."));
}));

router.patch("/daily-tasks/:id", asyncHandler(async (req, res) => {
  if (!canCreateEmployeeCrm(req.user)) throw new ApiError(403, "HR and Company Admin can only view daily CRM work.");
  const update = {};
  ["title", "description", "category", "status"].forEach((key) => {
    if (req.body[key] !== undefined) update[key] = String(req.body[key] || "").trim();
  });
  if (req.body.hoursSpent !== undefined) update.hoursSpent = Number(req.body.hoursSpent || 0);
  if (req.body.workDate !== undefined) update.workDate = req.body.workDate ? new Date(req.body.workDate) : new Date();
  update.updatedBy = req.user._id;
  const row = await EmployeeDailyTask.findOneAndUpdate({ _id: req.params.id, companyId: companyIdOf(req.user), employeeUserId: req.user._id }, update, { new: true, runValidators: true });
  if (!row) throw new ApiError(404, "Daily CRM task not found.");
  res.json(new ApiResponse(200, row, "Daily CRM task updated."));
}));
router.get("/quotations", listRecords("quotations"));
router.post("/quotations", createRecord("quotations", ["quotationNumber", "clientName", "amount", "businessCategory", "commodity", "quantity", "routeType", "shipmentMode", "validUntil", "status", "notes", "assignedUserId", "assignedEmployeeCode"]));
router.patch("/quotations/:id", updateRecord("quotations", ["quotationNumber", "clientName", "amount", "businessCategory", "commodity", "quantity", "routeType", "shipmentMode", "validUntil", "status", "notes", "assignedUserId", "assignedEmployeeCode"]));

router.get("/debug/context", asyncHandler(async (req, res) => {
  const companyId = companyIdOf(req.user, req.auth);
  const [leads, deals, tasks, quotations] = await Promise.all([
    CrmLead.countDocuments({ companyId }),
    CrmDeal.countDocuments({ companyId }),
    CrmTask.countDocuments({ companyId }),
    CrmQuotation.countDocuments({ companyId }),
  ]);
  res.json(new ApiResponse(200, {
    userId: req.user._id,
    role: req.user.role,
    companyId,
    employeeCode: req.user.employeeCode || "",
    counts: { leads, deals, tasks, quotations },
  }, "CRM company context checked."));
}));

export default router;





