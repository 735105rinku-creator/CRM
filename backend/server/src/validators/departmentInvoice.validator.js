import Joi from "joi";

export const departmentInvoiceQuerySchema = Joi.object({
  search: Joi.string().trim().allow("").max(200).optional(),
  status: Joi.string().valid("sent", "under_review", "verified", "partially_paid", "paid", "rejected").optional(),
  sourceDepartment: Joi.string().valid("purchase", "logistics").optional(),
  sourceModule: Joi.string().valid("purchase_invoice", "logistics_vendor_payment", "logistics_invoice").optional(),
  companyAdminApprovalStatus: Joi.string().valid("not_submitted", "pending", "approved", "rejected").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(false);

export const companyAdminApprovalQuerySchema = departmentInvoiceQuerySchema;
export const companyAdminApprovalDecisionSchema = Joi.object({
  decision: Joi.string().valid("approved", "rejected").required(),
  remarks: Joi.when("decision", {
    is: "rejected",
    then: Joi.string().trim().min(1).max(1500).required(),
    otherwise: Joi.string().trim().allow("").max(1500).optional(),
  }),
}).unknown(false);

export const departmentInvoiceIdSchema = Joi.object({ id: Joi.string().hex().length(24).required() });
export const verifyDepartmentInvoiceSchema = Joi.object({ remarks: Joi.string().trim().allow("").max(1500).optional() }).unknown(false);
export const rejectDepartmentInvoiceSchema = Joi.object({ reason: Joi.string().trim().min(1).max(1500).required() }).unknown(false);
export const payDepartmentInvoiceSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  paymentDate: Joi.date().iso().required(),
  paymentReference: Joi.string().trim().allow("").max(250).optional(),
  paymentMode: Joi.string().trim().allow("").max(100).optional(),
  remarks: Joi.string().trim().allow("").max(1500).optional(),
}).unknown(false);
