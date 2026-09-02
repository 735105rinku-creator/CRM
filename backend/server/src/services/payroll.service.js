import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { Company } from "../models/Company.js";
import { COMPONENT_TYPE } from "../models/SalaryComponent.js";
import { PAYROLL_STATUS } from "../models/PayrollRun.js";
import { PAYSLIP_STATUS } from "../models/Payslip.js";

import {
  findEmployeeProfile,
  findEmployeeById,
  findEmployeeByCode,
  listEmployees,
} from "../repositories/employee.repository.js";

import {
  createSalaryComponentRecord,
  findSalaryComponentById,
  findSalaryComponentByCode,
  listSalaryComponents,
  updateSalaryComponentById,
  deleteSalaryComponentById,

  createSalaryStructureRecord,
  findSalaryStructureById,
  findSalaryStructureByCode,
  listSalaryStructures,
  updateSalaryStructureById,
  deleteSalaryStructureById,

  createEmployeeSalaryRecord,
  findEmployeeSalaryById,
  findActiveEmployeeSalary,
  listEmployeeSalaries,
  updateEmployeeSalaryById,

  createPayrollRunRecord,
  findPayrollRunById,
  findPayrollRunByMonth,
  findPayrollRunByCode,
  listPayrollRuns,
  updatePayrollRunById,

  createPayslipRecord,
  findPayslipById,
  findPayslipByIdForPdf,
  findPayslipByEmployeeMonth,
  listPayslips,
  updatePayslipById,
  countPayslips,
} from "../repositories/payroll.repository.js";
import { generatePayslipPdfFile } from "../utils/payslipPdf.js";


const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensurePayrollAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage payroll.");
  }
};

const ensurePayslipReadAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.EMPLOYEE].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to view payslips.");
  }
};

const ensureSameCompany = (companyId, record, message = "Record not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const getCompanyCode = async (companyId) => {
  const company = await Company.findById(companyId).select("companyCode");

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company.companyCode;
};

const calculateTotals = (earnings = [], deductions = []) => {
  const grossSalary = earnings.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalDeductions = deductions.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return { grossSalary, totalDeductions, netSalary };
};

const generatePayrollCode = async (companyId, month, year) => {
  const companyCode = await getCompanyCode(companyId);
  return `${companyCode}-PAY-${year}-${String(month).padStart(2, "0")}`;
};

const generatePayslipNumber = async (companyId, employeeCode, month, year) => {
  const companyCode = await getCompanyCode(companyId);

  return `${companyCode}-SLIP-${employeeCode}-${year}-${String(month).padStart(
    2,
    "0"
  )}`;
};

const resolveEmployee = async (companyId, payloadOrCode) => {
  let employeeId = null;
  let employeeCode = null;

  if (typeof payloadOrCode === "string") {
    employeeCode = payloadOrCode;
  } else {
    employeeId = payloadOrCode.employeeId;
    employeeCode = payloadOrCode.employeeCode;
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

const resolveSelfEmployee = async (currentUser, companyId) => {
  return findEmployeeProfile({
    companyId,
    employeeId: currentUser.employee,
    userId: currentUser._id,
    employeeCode: currentUser.employeeCode,
    officialEmail: currentUser.email,
  });
};

const restrictToSelfPayslip = async (currentUser, companyId, filter) => {
  if (currentUser.role !== ROLES.EMPLOYEE) return;

  const employee = await resolveSelfEmployee(currentUser, companyId);

  if (!employee) {
    filter.employeeId = null;
    return;
  }

  filter.employeeId = employee._id;
};

const ensureSelfPayslipAccess = async (currentUser, companyId, payslip) => {
  if (currentUser.role !== ROLES.EMPLOYEE) return;

  const employee = await resolveSelfEmployee(currentUser, companyId);
  const selfEmployeeId = employee?._id?.toString();
  const payslipEmployeeId = payslip.employeeId?._id?.toString?.() || payslip.employeeId?.toString();

  if (!selfEmployeeId || payslipEmployeeId !== selfEmployeeId) {
    throw new ApiError(404, "Payslip not found.");
  }
};

const resolveSalaryComponent = async (companyId, payload = {}, fallbackType) => {
  const componentId = payload.componentId;
  const componentCode = payload.componentCode;

  let component = null;

  if (componentId) {
    component = await findSalaryComponentById(componentId);
  }

  if (!component && componentCode) {
    component = await findSalaryComponentByCode(companyId, componentCode);
  }

  if (!component && componentCode && payload.componentName) {
    component = await createSalaryComponentRecord({
      companyId,
      componentName: payload.componentName,
      componentCode,
      type: payload.type || fallbackType || COMPONENT_TYPE.EARNING,
      calculationType: "fixed",
      value: payload.amount || 0,
      taxable: payload.type !== COMPONENT_TYPE.DEDUCTION,
      isDefault: false,
      isActive: true,
    });
  }

  ensureSameCompany(companyId, component, "Salary component not found.");

  return component;
};

const resolveSalaryStructure = async (companyId, payload = {}) => {
  const salaryStructureId = payload.salaryStructureId;
  const salaryStructureCode = payload.salaryStructureCode || payload.structureCode;

  if (!salaryStructureId && !salaryStructureCode) {
    return null;
  }

  let structure = null;

  if (salaryStructureId) {
    structure = await findSalaryStructureById(salaryStructureId);
  }

  if (!structure && salaryStructureCode) {
    structure = await findSalaryStructureByCode(companyId, salaryStructureCode);
  }

  ensureSameCompany(companyId, structure, "Salary structure not found.");

  return structure;
};

const normalizeStructureComponents = async (companyId, components = []) => {
  const normalized = [];

  for (const item of components) {
    const component = await resolveSalaryComponent(companyId, item);

    normalized.push({
      componentId: component._id,
      amount: item.amount || 0,
      percentageOfCTC: item.percentageOfCTC || 0,
      enabled: item.enabled !== undefined ? item.enabled : true,
    });
  }

  return normalized;
};

const normalizeSalaryComponentValues = async (
  companyId,
  components = [],
  fallbackType
) => {
  const normalized = [];

  for (const item of components) {
    const component = await resolveSalaryComponent(companyId, item, fallbackType);

    normalized.push({
      componentId: component._id,
      componentName: item.componentName || component.componentName,
      componentCode: component.componentCode,
      type: item.type || fallbackType || component.type,
      amount: item.amount || 0,
    });
  }

  return normalized;
};

const resolvePayrollRun = async (companyId, payloadOrRef) => {
  let payrollRunId = null;
  let payrollCode = null;

  if (typeof payloadOrRef === "string") {
    payrollRunId = payloadOrRef;
    payrollCode = payloadOrRef;
  } else {
    payrollRunId = payloadOrRef.payrollRunId;
    payrollCode = payloadOrRef.payrollCode;
  }

  let payroll = null;

  if (payrollRunId && /^[a-fA-F0-9]{24}$/.test(payrollRunId)) {
    payroll = await findPayrollRunById(payrollRunId);
  }

  if (!payroll && payrollCode) {
    payroll = await findPayrollRunByCode(companyId, payrollCode);
  }

  ensureSameCompany(companyId, payroll, "Payroll run not found.");

  return payroll;
};

/* ================= SALARY COMPONENT ================= */

export const createSalaryComponentService = async (currentUser, payload) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findSalaryComponentByCode(
    companyId,
    payload.componentCode
  );

  if (exists) {
    throw new ApiError(409, "Salary component code already exists.");
  }

  return createSalaryComponentRecord({
    ...payload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getSalaryComponentsService = async (currentUser, query = {}) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.type) {
    filter.type = query.type;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.search) {
    filter.$or = [
      { componentName: { $regex: query.search, $options: "i" } },
      { componentCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listSalaryComponents({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateSalaryComponentService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const component = await findSalaryComponentById(id);
  ensureSameCompany(companyId, component, "Salary component not found.");

  return updateSalaryComponentById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });
};

export const deleteSalaryComponentService = async (currentUser, id) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const component = await findSalaryComponentById(id);
  ensureSameCompany(companyId, component, "Salary component not found.");

  await deleteSalaryComponentById(id);
  return true;
};

/* ================= SALARY STRUCTURE ================= */

export const createSalaryStructureService = async (currentUser, payload) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findSalaryStructureByCode(
    companyId,
    payload.structureCode
  );

  if (exists) {
    throw new ApiError(409, "Salary structure code already exists.");
  }

  const earnings = await normalizeStructureComponents(
    companyId,
    payload.earnings || []
  );

  const deductions = await normalizeStructureComponents(
    companyId,
    payload.deductions || []
  );

  const totals = calculateTotals(earnings, deductions);

  return createSalaryStructureRecord({
    ...payload,
    earnings,
    deductions,
    companyId,
    monthlyCTC: payload.monthlyCTC || totals.grossSalary,
    annualCTC:
      payload.annualCTC || (payload.monthlyCTC || totals.grossSalary) * 12,
    createdBy: currentUser._id,
  });
};

export const getSalaryStructuresService = async (currentUser, query = {}) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  if (query.search) {
    filter.$or = [
      { structureName: { $regex: query.search, $options: "i" } },
      { structureCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listSalaryStructures({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateSalaryStructureService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const structure = await findSalaryStructureById(id);
  ensureSameCompany(companyId, structure, "Salary structure not found.");

  const updatePayload = { ...payload };

  if (payload.earnings) {
    updatePayload.earnings = await normalizeStructureComponents(
      companyId,
      payload.earnings
    );
  }

  if (payload.deductions) {
    updatePayload.deductions = await normalizeStructureComponents(
      companyId,
      payload.deductions
    );
  }

  return updateSalaryStructureById(id, {
    ...updatePayload,
    updatedBy: currentUser._id,
  });
};

export const deleteSalaryStructureService = async (currentUser, id) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const structure = await findSalaryStructureById(id);
  ensureSameCompany(companyId, structure, "Salary structure not found.");

  await deleteSalaryStructureById(id);
  return true;
};

/* ================= EMPLOYEE SALARY ================= */

export const assignEmployeeSalaryService = async (currentUser, payload) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const employee = await resolveEmployee(companyId, payload);
  const salaryStructure = await resolveSalaryStructure(companyId, payload);

  const employeeId = employee._id;
  const salaryStructureId = salaryStructure?._id || null;

  const activeSalary = await findActiveEmployeeSalary(companyId, employeeId);

  if (activeSalary) {
    await updateEmployeeSalaryById(activeSalary._id, {
      status: "inactive",
      effectiveTo: payload.effectiveFrom,
      updatedBy: currentUser._id,
    });
  }

  const earnings = await normalizeSalaryComponentValues(
    companyId,
    payload.earnings || [],
    "earning"
  );

  const deductions = await normalizeSalaryComponentValues(
    companyId,
    payload.deductions || [],
    "deduction"
  );

  const totals = calculateTotals(earnings, deductions);

  return createEmployeeSalaryRecord({
    ...payload,
    employeeId,
    salaryStructureId,
    employeeCode: undefined,
    salaryStructureCode: undefined,
    structureCode: undefined,
    earnings,
    deductions,
    companyId,
    grossSalary: payload.grossSalary || totals.grossSalary,
    totalDeductions: payload.totalDeductions || totals.totalDeductions,
    netSalary: payload.netSalary || totals.netSalary,
    monthlyCTC: payload.monthlyCTC || totals.grossSalary,
    annualCTC:
      payload.annualCTC || (payload.monthlyCTC || totals.grossSalary) * 12,
    createdBy: currentUser._id,
  });
};

export const getEmployeeSalariesService = async (currentUser, query = {}) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);
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

  if (query.status) {
    filter.status = query.status;
  }

  return listEmployeeSalaries({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const updateEmployeeSalaryService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const salary = await findEmployeeSalaryById(id);
  ensureSameCompany(companyId, salary, "Employee salary not found.");

  const updatePayload = { ...payload };

  if (payload.employeeId || payload.employeeCode) {
    const employee = await resolveEmployee(companyId, payload);
    updatePayload.employeeId = employee._id;
  }

  if (
    payload.salaryStructureId ||
    payload.salaryStructureCode ||
    payload.structureCode
  ) {
    const structure = await resolveSalaryStructure(companyId, payload);
    updatePayload.salaryStructureId = structure?._id || null;
  }

  if (payload.earnings) {
    updatePayload.earnings = await normalizeSalaryComponentValues(
      companyId,
      payload.earnings,
      "earning"
    );
  }

  if (payload.deductions) {
    updatePayload.deductions = await normalizeSalaryComponentValues(
      companyId,
      payload.deductions,
      "deduction"
    );
  }

  delete updatePayload.employeeCode;
  delete updatePayload.salaryStructureCode;
  delete updatePayload.structureCode;

  const totals = calculateTotals(
    updatePayload.earnings || salary.earnings,
    updatePayload.deductions || salary.deductions
  );

  return updateEmployeeSalaryById(id, {
    ...updatePayload,
    grossSalary: payload.grossSalary || totals.grossSalary,
    totalDeductions: payload.totalDeductions || totals.totalDeductions,
    netSalary: payload.netSalary || totals.netSalary,
    updatedBy: currentUser._id,
  });
};

/* ================= PAYROLL RUN ================= */

export const createPayrollRunService = async (currentUser, payload) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const exists = await findPayrollRunByMonth(
    companyId,
    payload.month,
    payload.year
  );

  if (exists) {
    throw new ApiError(409, "Payroll already exists for this month.");
  }

  const payrollCode = await generatePayrollCode(
    companyId,
    payload.month,
    payload.year
  );

  const codeExists = await findPayrollRunByCode(companyId, payrollCode);

  if (codeExists) {
    throw new ApiError(409, "Payroll code already exists.");
  }

  return createPayrollRunRecord({
    ...payload,
    companyId,
    payrollCode,
    createdBy: currentUser._id,
  });
};

export const getPayrollRunsService = async (currentUser, query = {}) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.month) {
    filter.month = Number(query.month);
  }

  if (query.year) {
    filter.year = Number(query.year);
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.payrollCode) {
    filter.payrollCode = String(query.payrollCode).toUpperCase();
  }

  return listPayrollRuns({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const processPayrollRunService = async (currentUser, idOrCode) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const payroll = await resolvePayrollRun(companyId, idOrCode);

  if (![PAYROLL_STATUS.DRAFT, PAYROLL_STATUS.PROCESSED].includes(payroll.status)) {
    throw new ApiError(400, "Only draft/processed payroll can be processed.");
  }

  const employeeResult = await listEmployees({
    filter: { companyId, isActive: true },
    page: 1,
    limit: 10000,
    sort: { createdAt: 1 },
  });

  let totalGrossSalary = 0;
  let totalDeductions = 0;
  let totalNetSalary = 0;
  let totalEmployees = 0;

  for (const employee of employeeResult.employees) {
    const existingPayslip = await findPayslipByEmployeeMonth({
      companyId,
      employeeId: employee._id,
      month: payroll.month,
      year: payroll.year,
    });

    if (existingPayslip) {
      continue;
    }

    const salary = await findActiveEmployeeSalary(companyId, employee._id);

    if (!salary) {
      continue;
    }

    const payslipNumber = await generatePayslipNumber(
      companyId,
      employee.employeeCode,
      payroll.month,
      payroll.year
    );

    await createPayslipRecord({
      companyId,
      payrollRunId: payroll._id,
      employeeId: employee._id,
      payslipNumber,
      month: payroll.month,
      year: payroll.year,
      earnings: salary.earnings.map((x) => ({
        componentId: x.componentId,
        name: x.componentName || x.componentCode,
        code: x.componentCode,
        amount: x.amount,
      })),
      deductions: salary.deductions.map((x) => ({
        componentId: x.componentId,
        name: x.componentName || x.componentCode,
        code: x.componentCode,
        amount: x.amount,
      })),
      grossSalary: salary.grossSalary,
      totalDeductions: salary.totalDeductions,
      netSalary: salary.netSalary,
      status: PAYSLIP_STATUS.GENERATED,
      createdBy: currentUser._id,
    });

    totalEmployees += 1;
    totalGrossSalary += salary.grossSalary;
    totalDeductions += salary.totalDeductions;
    totalNetSalary += salary.netSalary;
  }

  return updatePayrollRunById(payroll._id, {
    status: PAYROLL_STATUS.PROCESSED,
    summary: {
      totalEmployees,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
    },
    processedBy: currentUser._id,
    processedAt: new Date(),
    updatedBy: currentUser._id,
  });
};

export const updatePayrollStatusService = async (
  currentUser,
  idOrCode,
  payload
) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const payroll = await resolvePayrollRun(companyId, idOrCode);

  const updatePayload = {
    status: payload.status,
    remarks: payload.remarks || payroll.remarks,
    updatedBy: currentUser._id,
  };

  if (payload.status === PAYROLL_STATUS.APPROVED) {
    updatePayload.approvedBy = currentUser._id;
    updatePayload.approvedAt = new Date();
  }

  if (payload.status === PAYROLL_STATUS.LOCKED) {
    updatePayload.lockedBy = currentUser._id;
    updatePayload.lockedAt = new Date();
  }

  return updatePayrollRunById(payroll._id, updatePayload);
};

/* ================= PAYSLIP ================= */

export const getPayslipsService = async (currentUser, query = {}) => {
  ensurePayslipReadAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  await restrictToSelfPayslip(currentUser, companyId, filter);

  if (currentUser.role !== ROLES.EMPLOYEE && query.employeeId) {
    filter.employeeId = query.employeeId;
  }

  if (currentUser.role !== ROLES.EMPLOYEE && query.employeeCode) {
    const employee = await resolveEmployee(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.payrollRunId && /^[a-fA-F0-9]{24}$/.test(query.payrollRunId)) {
    filter.payrollRunId = query.payrollRunId;
  }

  if (query.payrollCode) {
    const payroll = await resolvePayrollRun(companyId, {
      payrollCode: query.payrollCode,
    });

    filter.payrollRunId = payroll._id;
  }

  if (query.month) {
    filter.month = Number(query.month);
  }

  if (query.year) {
    filter.year = Number(query.year);
  }

  if (query.status) {
    filter.status = query.status;
  }

  return listPayslips({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getPayslipByIdService = async (currentUser, id) => {
  ensurePayslipReadAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const payslip = await findPayslipById(id);

  ensureSameCompany(companyId, payslip, "Payslip not found.");
  await ensureSelfPayslipAccess(currentUser, companyId, payslip);

  return payslip;
};

export const updatePayslipStatusService = async (currentUser, id, payload) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const payslip = await findPayslipById(id);
  ensureSameCompany(companyId, payslip, "Payslip not found.");

  const updatePayload = {
    status: payload.status,
    remarks: payload.remarks || payslip.remarks,
    updatedBy: currentUser._id,
  };

  if (payload.status === PAYSLIP_STATUS.PAID) {
    updatePayload.paidAt = new Date();
  }

  if (payload.status === PAYSLIP_STATUS.SENT) {
    updatePayload.sentAt = new Date();
  }

  return updatePayslipById(id, updatePayload);
};

export const getPayrollDashboardService = async (currentUser) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const generatedPayslips = await countPayslips({
    companyId,
    status: PAYSLIP_STATUS.GENERATED,
  });

  const paidPayslips = await countPayslips({
    companyId,
    status: PAYSLIP_STATUS.PAID,
  });

  return {
    generatedPayslips,
    paidPayslips,
  };
};

export const generatePayslipPdfService = async (currentUser, id) => {
  ensurePayrollAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const payslip = await findPayslipByIdForPdf(id);
  ensureSameCompany(companyId, payslip, "Payslip not found.");

  const company = await Company.findById(companyId).lean();

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  const generated = await generatePayslipPdfFile({
    company,
    payslip,
  });

  const updated = await updatePayslipById(id, {
    pdfUrl: generated.pdfUrl,
    updatedBy: currentUser._id,
  });

  return {
    ...(typeof updated.toObject === "function" ? updated.toObject() : updated),
    pdfUrl: generated.pdfUrl,
    pdfFileName: generated.fileName,
  };
};

export const getPayslipPdfFileService = async (currentUser, id) => {
  ensurePayslipReadAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const payslip = await findPayslipByIdForPdf(id);
  ensureSameCompany(companyId, payslip, "Payslip not found.");
  await ensureSelfPayslipAccess(currentUser, companyId, payslip);

  const company = await Company.findById(companyId).lean();

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  const generated = await generatePayslipPdfFile({
    company,
    payslip,
  });

  if (!payslip.pdfUrl) {
    await updatePayslipById(id, {
      pdfUrl: generated.pdfUrl,
      updatedBy: currentUser._id,
    });
  }

  return {
    filePath: generated.filePath,
    fileName: generated.fileName,
  };
};
