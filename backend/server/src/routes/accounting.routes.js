import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireTenant } from "../middleware/tenant.middleware.js";
import { AccountInvoice } from "../models/AccountInvoice.js";
import { AccountPayment } from "../models/AccountPayment.js";
import { AccountExpense } from "../models/AccountExpense.js";
import { Employee } from "../models/Employee.js";
import { withVisibleEmployeeFilter } from "../repositories/employee.repository.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../constants/roles.js";
import chartOfAccountRoutes from "./chartOfAccount.routes.js";
import journalEntryRoutes from "./journalEntry.routes.js";
import generalLedgerRoutes
  from "./generalLedger.routes.js";

const router = Router();
router.use(requireAuth);
router.use(requireTenant);

const models = {
  invoices: AccountInvoice,
  payments: AccountPayment,
  expenses: AccountExpense,
};

const companyIdOf = (user) => user.companyId?._id || user.companyId;
const isCompanyScopeUser = (user) => [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.HR].includes(user.role) || Number(user.roleRef?.level) <= 2;
const isAccountsDepartment = (department) => [department?.departmentName, department?.departmentCode]
  .some((value) => /accounts?|finance/i.test(String(value || "")));

const resolveAccountingAccess = asyncHandler(async (req, res, next) => {
  const companyId = companyIdOf(req.user);
  if (!companyId) throw new ApiError(403, "Company context missing.");

  if (isCompanyScopeUser(req.user)) {
    req.accountingAccess = { companyId, canManageCompanyAccounting: true };
    return next();
  }

  const employee = await Employee.findOne({
    companyId,
    $or: [
      { userId: req.user._id },
      { employeeCode: String(req.user.employeeCode || "").toUpperCase() },
    ],
  }).populate("departmentId", "departmentName departmentCode");

  if (!employee || !isAccountsDepartment(employee.departmentId)) {
    throw new ApiError(403, "Accounting access is allowed only for Accounts or Finance department employees.");
  }

  req.accountingAccess = {
    companyId,
    canManageCompanyAccounting: true,
    employeeCode: employee.employeeCode,
  };
  next();
});

router.use(resolveAccountingAccess);

router.use(
  "/chart-of-accounts",
  chartOfAccountRoutes
);

router.use(
  "/journal-entries",
  journalEntryRoutes
);

router.use(
  "/general-ledger",
  generalLedgerRoutes
);

const scopeFilter = (req) => ({ companyId: req.accountingAccess.companyId });

const clean = (payload, allowed) => allowed.reduce((acc, key) => {
  if (Object.prototype.hasOwnProperty.call(payload, key)) acc[key] = payload[key];
  return acc;
}, {});

const assignment = (req, payload = {}, forceDefault = true) => {
  const canAssign = Boolean(req.accountingAccess?.canManageCompanyAccounting);
  if (canAssign) {
    const hasExplicitAssignment = Object.prototype.hasOwnProperty.call(payload, "assignedUserId") || Object.prototype.hasOwnProperty.call(payload, "assignedEmployeeCode");
    if (!forceDefault && !hasExplicitAssignment) return {};
    return {
      assignedUserId: payload.assignedUserId || req.user._id,
      assignedEmployeeCode: String(payload.assignedEmployeeCode || req.user.employeeCode || "").toUpperCase(),
    };
  }
  return {
    assignedUserId: req.user._id,
    assignedEmployeeCode: String(req.user.employeeCode || "").toUpperCase(),
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

const rowAmount = (row) => Number(row.value ?? row.amount ?? 0) || 0;

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
      assignedEmployeeName: employee?.displayName || [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") || employee?.officialEmail || row.assignedEmployeeCode || "Unassigned",
      createdDateStatus: isToday ? "Today" : isThisMonth ? "This month" : "Older",
      isToday,
      isThisMonth,
    };
  });
};

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
  invoices: ["invoiceNumber", "clientName", "transactionType", "businessCategory", "commodity", "routeType", "shipmentMode", "status", "notes"],
  payments: ["payerName", "mode", "transactionType", "routeType", "status", "reference"],
  expenses: ["title", "category", "expenseType", "businessCategory", "routeType", "status", "notes"],
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
  const filter = applySearchFilter(scopeFilter(req), moduleName, req.query.search);
  const [rows, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);
  const enrichedRows = await enrichRows(req.accountingAccess.companyId, rows);
  const pagination = { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) };
  res.json(new ApiResponse(200, { [moduleName]: enrichedRows, summary: buildSummary(enrichedRows), pagination }, `${moduleName} fetched.`));
});

const createRecord = (moduleName, allowed) => asyncHandler(async (req, res) => {
  const Model = models[moduleName];
  const row = await Model.create({
    ...clean(req.body || {}, allowed),
    ...assignment(req, req.body),
    companyId: companyIdOf(req.user),
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  res.status(201).json(new ApiResponse(201, row, `${moduleName.slice(0, -1)} created.`));
});

const updateRecord = (moduleName, allowed) => asyncHandler(async (req, res) => {
  const Model = models[moduleName];
  const row = await Model.findOneAndUpdate(
    { _id: req.params.id, ...scopeFilter(req) },
    { ...clean(req.body || {}, allowed), ...assignment(req, req.body, false), updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!row) throw new ApiError(404, `${moduleName.slice(0, -1)} not found.`);
  res.json(new ApiResponse(200, row, `${moduleName.slice(0, -1)} updated.`));
});

router.get("/invoices", listRecords("invoices"));
router.post("/invoices", createRecord("invoices", ["invoiceNumber", "clientName", "amount", "transactionType", "businessCategory", "commodity", "quantity", "routeType", "shipmentMode", "status", "dueDate", "notes", "assignedUserId", "assignedEmployeeCode"]));
router.patch("/invoices/:id", updateRecord("invoices", ["invoiceNumber", "clientName", "amount", "transactionType", "businessCategory", "commodity", "quantity", "routeType", "shipmentMode", "status", "dueDate", "notes", "assignedUserId", "assignedEmployeeCode"]));

router.get("/payments", listRecords("payments"));
router.post("/payments", createRecord("payments", ["invoiceId", "payerName", "amount", "mode", "transactionType", "routeType", "status", "paymentDate", "reference", "assignedUserId", "assignedEmployeeCode"]));
router.patch("/payments/:id", updateRecord("payments", ["invoiceId", "payerName", "amount", "mode", "transactionType", "routeType", "status", "paymentDate", "reference", "assignedUserId", "assignedEmployeeCode"]));

router.get("/expenses", listRecords("expenses"));
router.post("/expenses", createRecord("expenses", ["title", "category", "expenseType", "businessCategory", "routeType", "amount", "expenseDate", "status", "notes", "assignedUserId", "assignedEmployeeCode"]));
router.patch("/expenses/:id", updateRecord("expenses", ["title", "category", "expenseType", "businessCategory", "routeType", "amount", "expenseDate", "status", "notes", "assignedUserId", "assignedEmployeeCode"]));

export default router;



