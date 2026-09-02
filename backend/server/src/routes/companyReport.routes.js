import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireTenant } from "../middleware/tenant.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Employee } from "../models/Employee.js";
import { Attendance } from "../models/Attendance.js";
import { LeaveRequest } from "../models/LeaveRequest.js";
import { PayrollRun } from "../models/PayrollRun.js";
import { Payslip } from "../models/Payslip.js";
import { CrmLead } from "../models/CrmLead.js";
import { CrmDeal } from "../models/CrmDeal.js";
import { CrmTask } from "../models/CrmTask.js";
import { CrmQuotation } from "../models/CrmQuotation.js";
import { AccountInvoice } from "../models/AccountInvoice.js";
import { AccountPayment } from "../models/AccountPayment.js";
import { AccountExpense } from "../models/AccountExpense.js";
import { withVisibleEmployeeFilter } from "../repositories/employee.repository.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

const companyIdOf = (user) => user.companyId?._id || user.companyId;

const escapeCsv = (value) => {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (headers, rows) => [
  headers.join(","),
  ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
].join("\n");

const employeeName = (row = {}) => row.displayName || [row.firstName, row.lastName].filter(Boolean).join(" ") || row.employeeCode || "-";

const buildExportRows = async (companyId, type) => {
  const employeeFilter = await withVisibleEmployeeFilter({ companyId, isActive: true });

  if (type === "hr") {
    const [employees, attendance, leave, payroll, payslips] = await Promise.all([
      Employee.find(employeeFilter).populate("departmentId", "departmentName").populate("designationId", "designationName").lean(),
      Attendance.find({ companyId }).populate("employeeId", "displayName employeeCode").lean(),
      LeaveRequest.find({ companyId }).populate("employeeId", "displayName employeeCode").populate("leaveTypeId", "leaveName leaveCode").lean(),
      PayrollRun.find({ companyId }).lean(),
      Payslip.find({ companyId }).populate("employeeId", "displayName employeeCode").lean(),
    ]);

    return [
      ...employees.map((row) => ({ module: "Employee", name: employeeName(row), code: row.employeeCode, status: row.employeeStatus, metric: row.departmentId?.departmentName || "-", amount: "", date: row.joiningDate || row.createdAt })),
      ...attendance.map((row) => ({ module: "Attendance", name: row.employeeId?.displayName || "-", code: row.employeeId?.employeeCode || "-", status: row.status, metric: row.checkInTime ? "Checked in" : "Not marked", amount: "", date: row.attendanceDate })),
      ...leave.map((row) => ({ module: "Leave", name: row.employeeId?.displayName || "-", code: row.employeeId?.employeeCode || "-", status: row.status, metric: row.leaveTypeId?.leaveName || "Leave", amount: row.totalDays || 0, date: row.fromDate })),
      ...payroll.map((row) => ({ module: "Payroll", name: row.payrollCode, code: `${row.month}/${row.year}`, status: row.status, metric: "Run", amount: row.summary?.totalNetSalary || 0, date: row.paymentDate || row.createdAt })),
      ...payslips.map((row) => ({ module: "Payslip", name: row.employeeId?.displayName || "-", code: row.employeeId?.employeeCode || "-", status: row.status, metric: `${row.month}/${row.year}`, amount: row.netSalary || row.netPay || 0, date: row.createdAt })),
    ];
  }

  if (type === "crm") {
    const [leads, deals, tasks, quotations, invoices, payments, expenses] = await Promise.all([
      CrmLead.find({ companyId }).lean(),
      CrmDeal.find({ companyId }).lean(),
      CrmTask.find({ companyId }).lean(),
      CrmQuotation.find({ companyId }).lean(),
      AccountInvoice.find({ companyId }).lean(),
      AccountPayment.find({ companyId }).lean(),
      AccountExpense.find({ companyId }).lean(),
    ]);

    return [
      ...leads.map((row) => ({ module: "Lead", name: row.name, code: row.assignedEmployeeCode || "", status: row.status, metric: row.source, amount: "", date: row.createdAt })),
      ...deals.map((row) => ({ module: "Deal", name: row.clientName, code: row.assignedEmployeeCode || "", status: row.stage, metric: row.businessCategory, amount: row.value || 0, date: row.createdAt })),
      ...tasks.map((row) => ({ module: "Task", name: row.title, code: row.assignedEmployeeCode || "", status: row.status, metric: row.priority, amount: "", date: row.dueDate || row.createdAt })),
      ...quotations.map((row) => ({ module: "Quotation", name: row.clientName, code: row.quotationNumber, status: row.status, metric: row.commodity, amount: row.amount || 0, date: row.validUntil || row.createdAt })),
      ...invoices.map((row) => ({ module: "Invoice", name: row.clientName, code: row.invoiceNumber, status: row.status, metric: row.transactionType, amount: row.amount || 0, date: row.dueDate || row.createdAt })),
      ...payments.map((row) => ({ module: "Payment", name: row.payerName, code: row.reference, status: row.status, metric: row.mode, amount: row.amount || 0, date: row.paymentDate || row.createdAt })),
      ...expenses.map((row) => ({ module: "Expense", name: row.title, code: row.assignedEmployeeCode || "", status: row.status, metric: row.category, amount: row.amount || 0, date: row.expenseDate || row.createdAt })),
    ];
  }

  if (type === "performance") {
    const [employees, leads, deals, tasks, attendance] = await Promise.all([
      Employee.find(employeeFilter).lean(),
      CrmLead.find({ companyId }).lean(),
      CrmDeal.find({ companyId }).lean(),
      CrmTask.find({ companyId }).lean(),
      Attendance.find({ companyId }).populate("employeeId", "employeeCode").lean(),
    ]);

    return employees.map((employee) => {
      const code = employee.employeeCode;
      const wonDeals = deals.filter((row) => row.assignedEmployeeCode === code && String(row.stage).toLowerCase() === "won");
      const doneTasks = tasks.filter((row) => row.assignedEmployeeCode === code && String(row.status).toLowerCase() === "done");
      return {
        module: "Performance",
        name: employeeName(employee),
        code,
        status: employee.employeeStatus,
        metric: `Leads ${leads.filter((row) => row.assignedEmployeeCode === code).length}; Tasks ${doneTasks.length}; Attendance ${attendance.filter((row) => row.employeeId?.employeeCode === code && row.status === "present").length}`,
        amount: wonDeals.reduce((sum, row) => sum + Number(row.value || 0), 0),
        date: employee.updatedAt || employee.createdAt,
      };
    });
  }

  throw new ApiError(400, "Valid export type is required.");
};

router.get("/export", asyncHandler(async (req, res) => {
  const companyId = companyIdOf(req.user);
  if (!companyId) throw new ApiError(403, "Company context missing.");

  const type = String(req.query.type || "hr").toLowerCase();
  const format = String(req.query.format || "csv").toLowerCase();
  const rows = await buildExportRows(companyId, type);

  if (format === "json") {
    res.json(new ApiResponse(200, { rows }, "Company report export generated."));
    return;
  }

  const headers = ["module", "name", "code", "status", "metric", "amount", "date"];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=company-${type}-report.csv`);
  res.send(toCsv(headers, rows));
}));

export default router;
