import service from "../services/departmentInvoice.service.js";
import { departmentInvoiceQuerySchema, departmentInvoiceIdSchema, verifyDepartmentInvoiceSchema, rejectDepartmentInvoiceSchema, payDepartmentInvoiceSchema } from "../validators/departmentInvoice.validator.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validate = (schema, data) => { const { value, error } = schema.validate(data, { abortEarly: false, stripUnknown: true, convert: true }); if (error) throw new ApiError(400, error.details.map(x => x.message).join(", ")); return value; };
const company = req => req.accountingAccess?.companyId;

export const listDepartmentInvoices = asyncHandler(async (req, res) => res.json(new ApiResponse(200, await service.list(company(req), validate(departmentInvoiceQuerySchema, req.query)), "Department invoices fetched.")));
export const getDepartmentInvoice = asyncHandler(async (req, res) => { const { id } = validate(departmentInvoiceIdSchema, req.params); res.json(new ApiResponse(200, await service.get(company(req), id), "Department invoice fetched.")); });
export const verifyDepartmentInvoice = asyncHandler(async (req, res) => { const { id } = validate(departmentInvoiceIdSchema, req.params); res.json(new ApiResponse(200, await service.verify(company(req), id, validate(verifyDepartmentInvoiceSchema, req.body || {}), req.user), "Invoice verified.")); });
export const rejectDepartmentInvoice = asyncHandler(async (req, res) => { const { id } = validate(departmentInvoiceIdSchema, req.params); const payload = validate(rejectDepartmentInvoiceSchema, req.body || {}); res.json(new ApiResponse(200, await service.reject(company(req), id, payload.reason, req.user), "Invoice rejected.")); });
export const payDepartmentInvoice = asyncHandler(async (req, res) => { const { id } = validate(departmentInvoiceIdSchema, req.params); res.json(new ApiResponse(200, await service.pay(company(req), id, validate(payDepartmentInvoiceSchema, req.body || {}), req.user), "Payment recorded.")); });
