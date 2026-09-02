import Joi from "joi";

import {
  COMPONENT_TYPE,
  CALCULATION_TYPE,
} from "../models/SalaryComponent.js";

import { SALARY_STATUS } from "../models/EmployeeSalary.js";
import { PAYROLL_STATUS } from "../models/PayrollRun.js";
import { PAYSLIP_STATUS } from "../models/Payslip.js";

const code = Joi.string().trim().uppercase().min(1).max(50);
const optionalCode = code.allow("", null);

const withPayrollAliases = (schema) => {
  return schema
    .rename("componentcode", "componentCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("component_code", "componentCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employeecode", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employee_code", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("salarystructurecode", "salaryStructureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("salary_structure_code", "salaryStructureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("structurecode", "structureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("structure_code", "structureCode", {
      ignoreUndefined: true,
      override: true,
    });
};

/* ================= COMMON COMPONENT VALUE ================= */

const salaryComponentValueBaseSchema = Joi.object({
  componentCode: code.required(),

  componentName: Joi.string().trim().allow("", null),

  type: Joi.string()
    .valid(...Object.values(COMPONENT_TYPE))
    .required(),

  amount: Joi.number().min(0).default(0),
});

const salaryComponentValueSchema = withPayrollAliases(
  salaryComponentValueBaseSchema
);

/* ================= SALARY COMPONENT ================= */

const salaryComponentBaseSchema = Joi.object({
  componentName: Joi.string().trim().max(120).required(),

  componentCode: code.max(30).required(),

  type: Joi.string()
    .valid(...Object.values(COMPONENT_TYPE))
    .required(),

  calculationType: Joi.string()
    .valid(...Object.values(CALCULATION_TYPE))
    .default(CALCULATION_TYPE.FIXED),

  value: Joi.number().min(0).default(0),

  taxable: Joi.boolean().default(true),

  affectsPF: Joi.boolean().default(false),

  affectsESI: Joi.boolean().default(false),

  affectsGratuity: Joi.boolean().default(false),

  isDefault: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
});

export const createSalaryComponentSchema = withPayrollAliases(
  salaryComponentBaseSchema
);

export const updateSalaryComponentSchema = withPayrollAliases(
  salaryComponentBaseSchema.fork(
    ["componentName", "componentCode", "type"],
    (schema) => schema.optional()
  )
);

/* ================= SALARY STRUCTURE ================= */

const structureComponentBaseSchema = Joi.object({
  componentCode: code.required(),

  amount: Joi.number().min(0).default(0),

  percentageOfCTC: Joi.number().min(0).default(0),

  enabled: Joi.boolean().default(true),
});

const structureComponentSchema = withPayrollAliases(
  structureComponentBaseSchema
);

const salaryStructureBaseSchema = Joi.object({
  structureName: Joi.string().trim().max(120).required(),

  structureCode: code.max(30).required(),

  description: Joi.string().trim().allow("", null),

  annualCTC: Joi.number().min(0).default(0),

  monthlyCTC: Joi.number().min(0).default(0),

  earnings: Joi.array().items(structureComponentSchema).default([]),

  deductions: Joi.array().items(structureComponentSchema).default([]),

  isDefault: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
});

export const createSalaryStructureSchema = withPayrollAliases(
  salaryStructureBaseSchema
);

export const updateSalaryStructureSchema = withPayrollAliases(
  salaryStructureBaseSchema.fork(
    ["structureName", "structureCode"],
    (schema) => schema.optional()
  )
);

/* ================= EMPLOYEE SALARY ================= */

const assignEmployeeSalaryBaseSchema = Joi.object({
  employeeCode: code.required(),

  salaryStructureCode: optionalCode,
  structureCode: optionalCode,

  annualCTC: Joi.number().min(0).default(0),

  monthlyCTC: Joi.number().min(0).default(0),

  earnings: Joi.array().items(salaryComponentValueSchema).default([]),

  deductions: Joi.array().items(salaryComponentValueSchema).default([]),

  grossSalary: Joi.number().min(0).default(0),

  totalDeductions: Joi.number().min(0).default(0),

  netSalary: Joi.number().min(0).default(0),

  effectiveFrom: Joi.date().required(),

  effectiveTo: Joi.date().allow(null),

  status: Joi.string()
    .valid(...Object.values(SALARY_STATUS))
    .default(SALARY_STATUS.ACTIVE),

  remarks: Joi.string().trim().allow("", null),
});

const updateEmployeeSalaryBaseSchema = Joi.object({
  employeeCode: optionalCode,

  salaryStructureCode: optionalCode,
  structureCode: optionalCode,

  annualCTC: Joi.number().min(0),

  monthlyCTC: Joi.number().min(0),

  earnings: Joi.array().items(salaryComponentValueSchema),

  deductions: Joi.array().items(salaryComponentValueSchema),

  grossSalary: Joi.number().min(0),

  totalDeductions: Joi.number().min(0),

  netSalary: Joi.number().min(0),

  effectiveFrom: Joi.date(),

  effectiveTo: Joi.date().allow(null),

  status: Joi.string().valid(...Object.values(SALARY_STATUS)),

  remarks: Joi.string().trim().allow("", null),
});

export const assignEmployeeSalarySchema = withPayrollAliases(
  assignEmployeeSalaryBaseSchema
);

export const updateEmployeeSalarySchema = withPayrollAliases(
  updateEmployeeSalaryBaseSchema
);

/* ================= PAYROLL RUN ================= */

export const createPayrollRunSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),

  year: Joi.number().integer().min(2000).required(),

  fromDate: Joi.date().required(),

  toDate: Joi.date().required(),

  paymentDate: Joi.date().allow(null),

  remarks: Joi.string().trim().allow("", null),
});

export const updatePayrollStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PAYROLL_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});

/* ================= PAYSLIP ================= */

export const updatePayslipStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(PAYSLIP_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});