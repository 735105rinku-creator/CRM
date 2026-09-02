import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
  updateWorkFromHomeAttendanceSchema,
  employeeFamilySchema,
  employeeBankSchema,
  employeeStatutorySchema,
  employeeDocumentSchema,
} from "../validators/employee.validator.js";

import {
  createEmployeeService,
  getEmployeesService,
  checkEmployeeCodeAvailabilityService,
  getEmployeeByIdService,
  updateEmployeeService,
  updateEmployeePhotoService,
  updateEmployeeStatusService,
  updateWorkFromHomeAttendanceService,
  deleteEmployeeService,

  upsertEmployeeFamilyService,
  getEmployeeFamilyService,

  upsertEmployeeBankService,
  getEmployeeBankService,

  upsertEmployeeStatutoryService,
  getEmployeeStatutoryService,

  upsertEmployeeDocumentsService,
  getEmployeeDocumentsService,

  getEmployeeDashboardService,
} from "../services/employee.service.js";
import { toPublicEmployeeDocumentUrl, toPublicEmployeePhotoUrl } from "../middleware/upload.middleware.js";

/* ---------------- Employee Core ---------------- */

export const createEmployee = asyncHandler(async (req, res) => {
  const { value, error } = createEmployeeSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const employee = await createEmployeeService(req.user, value);

  res
    .status(201)
    .json(new ApiResponse(201, employee, "Employee created successfully"));
});

export const getEmployees = asyncHandler(async (req, res) => {
  const employees = await getEmployeesService(req.user, req.query);

  res
    .status(200)
    .json(new ApiResponse(200, employees, "Employees fetched successfully"));
});

export const checkEmployeeCodeAvailability = asyncHandler(async (req, res) => {
  const data = await checkEmployeeCodeAvailabilityService(req.user, req.query);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Employee ID availability checked successfully"));
});

export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await getEmployeeByIdService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee fetched successfully"));
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const { value, error } = updateEmployeeSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const employee = await updateEmployeeService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee updated successfully"));
});

export const updateEmployeePhoto = asyncHandler(async (req, res) => {
  const employeePhoto = toPublicEmployeePhotoUrl(req.file);

  if (!employeePhoto) {
    throw new ApiError(400, "Employee photo is required.");
  }

  const employee = await updateEmployeePhotoService(req.user, req.params.id, employeePhoto);

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee photo updated successfully"));
});

export const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateEmployeeStatusSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const employee = await updateEmployeeStatusService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee status updated successfully"));
});


export const updateWorkFromHomeAttendance = asyncHandler(async (req, res) => {
  const { value, error } = updateWorkFromHomeAttendanceSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) throw new ApiError(400, error.details[0].message);

  const employee = await updateWorkFromHomeAttendanceService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Work From Home attendance permission updated successfully"));
});
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await deleteEmployeeService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee marked inactive successfully"));
});

/* ---------------- Family ---------------- */

export const upsertEmployeeFamily = asyncHandler(async (req, res) => {
  const { value, error } = employeeFamilySchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const family = await upsertEmployeeFamilyService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(new ApiResponse(200, family, "Employee family updated successfully"));
});

export const getEmployeeFamily = asyncHandler(async (req, res) => {
  const family = await getEmployeeFamilyService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, family, "Employee family fetched successfully"));
});

/* ---------------- Bank ---------------- */

export const upsertEmployeeBank = asyncHandler(async (req, res) => {
  const { value, error } = employeeBankSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const bank = await upsertEmployeeBankService(req.user, req.params.id, value);

  res
    .status(200)
    .json(new ApiResponse(200, bank, "Employee bank details updated successfully"));
});

export const getEmployeeBank = asyncHandler(async (req, res) => {
  const bank = await getEmployeeBankService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, bank, "Employee bank details fetched successfully"));
});

/* ---------------- Statutory ---------------- */

export const upsertEmployeeStatutory = asyncHandler(async (req, res) => {
  const { value, error } = employeeStatutorySchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const statutory = await upsertEmployeeStatutoryService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, statutory, "Employee statutory details updated successfully")
    );
});

export const getEmployeeStatutory = asyncHandler(async (req, res) => {
  const statutory = await getEmployeeStatutoryService(req.user, req.params.id);

  res
    .status(200)
    .json(
      new ApiResponse(200, statutory, "Employee statutory details fetched successfully")
    );
});

/* ---------------- Documents ---------------- */

export const upsertEmployeeDocuments = asyncHandler(async (req, res) => {
  const { value, error } = employeeDocumentSchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const documents = await upsertEmployeeDocumentsService(
    req.user,
    req.params.id,
    value
  );

  res
    .status(200)
    .json(new ApiResponse(200, documents, "Employee documents updated successfully"));
});

export const getEmployeeDocuments = asyncHandler(async (req, res) => {
  const documents = await getEmployeeDocumentsService(req.user, req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, documents, "Employee documents fetched successfully"));
});
export const uploadEmployeeDocuments = asyncHandler(async (req, res) => {
  const files = req.files || [];

  if (!files.length) {
    throw new ApiError(400, "Please upload at least one employee document.");
  }

  const existing = await getEmployeeDocumentsService(req.user, req.params.id);
  const documentTypes = Array.isArray(req.body.documentType)
    ? req.body.documentType
    : files.map(() => req.body.documentType || "other");
  const remarks = Array.isArray(req.body.remarks)
    ? req.body.remarks
    : files.map(() => req.body.remarks || "");

  const uploadedDocuments = files.map((file, index) => ({
    documentType: documentTypes[index] || "other",
    fileName: file.originalname || file.filename,
    fileUrl: toPublicEmployeeDocumentUrl(file),
    fileSize: file.size || null,
    mimeType: file.mimetype || "",
    verified: false,
    remarks: remarks[index] || "",
  }));

  const documents = await upsertEmployeeDocumentsService(req.user, req.params.id, {
    documents: [...(existing?.documents || []), ...uploadedDocuments],
  });

  res
    .status(200)
    .json(new ApiResponse(200, documents, "Employee documents uploaded successfully"));
});

/* ---------------- Dashboard ---------------- */

export const getEmployeeDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getEmployeeDashboardService(req.user);

  res
    .status(200)
    .json(new ApiResponse(200, dashboard, "Employee dashboard fetched successfully"));
});


