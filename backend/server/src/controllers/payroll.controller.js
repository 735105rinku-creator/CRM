import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createSalaryComponentSchema,
  updateSalaryComponentSchema,
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
  assignEmployeeSalarySchema,
  updateEmployeeSalarySchema,
  createPayrollRunSchema,
  updatePayrollStatusSchema,
  updatePayslipStatusSchema,
} from "../validators/payroll.validator.js";

import {
  createSalaryComponentService,
  getSalaryComponentsService,
  updateSalaryComponentService,
  deleteSalaryComponentService,

  createSalaryStructureService,
  getSalaryStructuresService,
  updateSalaryStructureService,
  deleteSalaryStructureService,

  assignEmployeeSalaryService,
  getEmployeeSalariesService,
  updateEmployeeSalaryService,

  createPayrollRunService,
  getPayrollRunsService,
  processPayrollRunService,
  updatePayrollStatusService,

  getPayslipsService,
  getPayslipByIdService,
  updatePayslipStatusService,
  getPayrollDashboardService,
  generatePayslipPdfService,
  getPayslipPdfFileService,
} from "../services/payroll.service.js";



/* ================= DASHBOARD ================= */

export const getPayrollDashboard = asyncHandler(async (req, res) => {
  const data = await getPayrollDashboardService(req.user);

  res.status(200).json(
    new ApiResponse(200, data, "Payroll dashboard fetched successfully")
  );
});

/* ================= SALARY COMPONENT ================= */

export const createSalaryComponent = asyncHandler(async (req, res) => {
  const { value, error } = createSalaryComponentSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createSalaryComponentService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Salary component created successfully")
  );
});

export const getSalaryComponents = asyncHandler(async (req, res) => {
  const data = await getSalaryComponentsService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Salary components fetched successfully")
  );
});

export const updateSalaryComponent = asyncHandler(async (req, res) => {
  const { value, error } = updateSalaryComponentSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateSalaryComponentService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Salary component updated successfully")
  );
});

export const deleteSalaryComponent = asyncHandler(async (req, res) => {
  await deleteSalaryComponentService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, null, "Salary component deleted successfully")
  );
});

/* ================= SALARY STRUCTURE ================= */

export const createSalaryStructure = asyncHandler(async (req, res) => {
  const { value, error } = createSalaryStructureSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createSalaryStructureService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Salary structure created successfully")
  );
});

export const getSalaryStructures = asyncHandler(async (req, res) => {
  const data = await getSalaryStructuresService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Salary structures fetched successfully")
  );
});

export const updateSalaryStructure = asyncHandler(async (req, res) => {
  const { value, error } = updateSalaryStructureSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateSalaryStructureService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Salary structure updated successfully")
  );
});

export const deleteSalaryStructure = asyncHandler(async (req, res) => {
  await deleteSalaryStructureService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, null, "Salary structure deleted successfully")
  );
});

/* ================= EMPLOYEE SALARY ================= */

export const assignEmployeeSalary = asyncHandler(async (req, res) => {
  const { value, error } = assignEmployeeSalarySchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await assignEmployeeSalaryService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Employee salary assigned successfully")
  );
});

export const getEmployeeSalaries = asyncHandler(async (req, res) => {
  const data = await getEmployeeSalariesService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Employee salaries fetched successfully")
  );
});

export const updateEmployeeSalary = asyncHandler(async (req, res) => {
  const { value, error } = updateEmployeeSalarySchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateEmployeeSalaryService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Employee salary updated successfully")
  );
});

/* ================= PAYROLL RUN ================= */

export const createPayrollRun = asyncHandler(async (req, res) => {
  const { value, error } = createPayrollRunSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createPayrollRunService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Payroll run created successfully")
  );
});

export const getPayrollRuns = asyncHandler(async (req, res) => {
  const data = await getPayrollRunsService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Payroll runs fetched successfully")
  );
});

export const processPayrollRun = asyncHandler(async (req, res) => {
  const data = await processPayrollRunService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Payroll processed successfully")
  );
});

export const updatePayrollStatus = asyncHandler(async (req, res) => {
  const { value, error } = updatePayrollStatusSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updatePayrollStatusService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Payroll status updated successfully")
  );
});

/* ================= PAYSLIP ================= */

export const getPayslips = asyncHandler(async (req, res) => {
  const data = await getPayslipsService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Payslips fetched successfully")
  );
});

export const getPayslipById = asyncHandler(async (req, res) => {
  const data = await getPayslipByIdService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Payslip fetched successfully")
  );
});

export const updatePayslipStatus = asyncHandler(async (req, res) => {
  const { value, error } = updatePayslipStatusSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updatePayslipStatusService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Payslip status updated successfully")
  );
});

export const generatePayslipPdf = asyncHandler(async (req, res) => {
    const data = await generatePayslipPdfService(req.user, req.params.id);
  
    res.status(200).json(
      new ApiResponse(200, data, "Payslip PDF generated successfully")
    );
  });
  export const downloadPayslipPdf = asyncHandler(async (req, res) => {
    const data = await getPayslipPdfFileService(req.user, req.params.id);
  
    res.download(data.filePath, data.fileName);
  });