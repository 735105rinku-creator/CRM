import { SalaryComponent } from "../models/SalaryComponent.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { EmployeeSalary } from "../models/EmployeeSalary.js";
import { PayrollRun } from "../models/PayrollRun.js";
import { Payslip } from "../models/Payslip.js";

/* ================= SALARY COMPONENT ================= */

export const createSalaryComponentRecord = async (payload) => {
  return SalaryComponent.create(payload);
};

export const findSalaryComponentById = async (id) => {
  return SalaryComponent.findById(id);
};

export const findSalaryComponentByCode = async (companyId, componentCode) => {
  return SalaryComponent.findOne({ companyId, componentCode });
};

export const listSalaryComponents = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    SalaryComponent.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    SalaryComponent.countDocuments(filter),
  ]);

  return {
    components: rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

export const updateSalaryComponentById = async (id, payload) => {
  return SalaryComponent.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteSalaryComponentById = async (id) => {
  return SalaryComponent.findByIdAndDelete(id);
};

/* ================= SALARY STRUCTURE ================= */

export const createSalaryStructureRecord = async (payload) => {
  return SalaryStructure.create(payload);
};

export const findSalaryStructureById = async (id) => {
  return SalaryStructure.findById(id);
};

export const findSalaryStructureByCode = async (companyId, structureCode) => {
  return SalaryStructure.findOne({ companyId, structureCode });
};

export const listSalaryStructures = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    SalaryStructure.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    SalaryStructure.countDocuments(filter),
  ]);

  return {
    structures: rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

export const updateSalaryStructureById = async (id, payload) => {
  return SalaryStructure.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteSalaryStructureById = async (id) => {
  return SalaryStructure.findByIdAndDelete(id);
};

/* ================= EMPLOYEE SALARY ================= */

export const createEmployeeSalaryRecord = async (payload) => {
  return EmployeeSalary.create(payload);
};

export const findEmployeeSalaryById = async (id) => {
  return EmployeeSalary.findById(id);
};

export const findActiveEmployeeSalary = async (companyId, employeeId) => {
  return EmployeeSalary.findOne({
    companyId,
    employeeId,
    status: "active",
  });
};

export const listEmployeeSalaries = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    EmployeeSalary.find(filter)
      .populate("employeeId", "displayName employeeCode")
      .populate("salaryStructureId", "structureName structureCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    EmployeeSalary.countDocuments(filter),
  ]);

  return {
    employeeSalaries: rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

export const updateEmployeeSalaryById = async (id, payload) => {
  return EmployeeSalary.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

/* ================= PAYROLL RUN ================= */

export const createPayrollRunRecord = async (payload) => {
  return PayrollRun.create(payload);
};

export const findPayrollRunById = async (id) => {
  return PayrollRun.findById(id);
};

export const findPayrollRunByMonth = async (companyId, month, year) => {
  return PayrollRun.findOne({ companyId, month, year });
};

export const findPayrollRunByCode = async (companyId, payrollCode) => {
  return PayrollRun.findOne({ companyId, payrollCode });
};

export const listPayrollRuns = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    PayrollRun.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    PayrollRun.countDocuments(filter),
  ]);

  return {
    payrollRuns: rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

export const updatePayrollRunById = async (id, payload) => {
  return PayrollRun.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

/* ================= PAYSLIP ================= */

export const createPayslipRecord = async (payload) => {
  return Payslip.create(payload);
};

export const findPayslipById = async (id) => {
  return Payslip.findById(id);
};

export const findPayslipByIdForPdf = async (id) => {
  return Payslip.findById(id)
    .populate(
      "employeeId",
      "displayName employeeCode officialEmail mobile joiningDate"
    )
    .populate(
      "payrollRunId",
      "payrollCode month year status processedAt"
    );
};

export const findPayslipByEmployeeMonth = async ({
  companyId,
  employeeId,
  month,
  year,
}) => {
  return Payslip.findOne({ companyId, employeeId, month, year });
};

export const listPayslips = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Payslip.find(filter)
      .populate("employeeId", "displayName employeeCode")
      .populate("payrollRunId", "payrollCode month year status")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Payslip.countDocuments(filter),
  ]);

  return {
    payslips: rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

export const updatePayslipById = async (id, payload) => {
  return Payslip.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const countPayslips = async (filter) => {
  return Payslip.countDocuments(filter);
};