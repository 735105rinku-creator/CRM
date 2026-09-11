import paymentAllocationService from "../services/paymentAllocation.service.js";
import { createPaymentAllocationsSchema, paymentVoucherParamSchema } from "../validators/paymentAllocation.validator.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validate = (schema, source) => {
  const { value, error } = schema.validate(source, { abortEarly: false, stripUnknown: true, convert: true });
  if (error) throw new ApiError(400, error.details?.[0]?.message || "Invalid allocation request.", error.details);
  return value;
};

const companyId = req => {
  if (!req.accountingAccess?.companyId) throw new ApiError(403, "Accounting company context missing.");
  return req.accountingAccess.companyId;
};

export const getPaymentAllocationOptions = asyncHandler(async (req, res) => {
  const params = validate(paymentVoucherParamSchema, req.params);
  const rows = await paymentAllocationService.options(companyId(req), params.voucherId);
  const result = rows.map(({ partyAccountId: _partyAccountId, ...row }) => row);
  res.json(new ApiResponse(200, result, "Outstanding Purchase Invoices fetched."));
});

export const createPaymentAllocations = asyncHandler(async (req, res) => {
  const params = validate(paymentVoucherParamSchema, req.params);
  const payload = validate(createPaymentAllocationsSchema, req.body);
  const rows = await paymentAllocationService.allocate({
    companyId: companyId(req),
    paymentVoucherId: params.voucherId,
    userId: req.user?._id || req.auth?.userId || null,
    allocations: payload.allocations,
  });
  res.status(201).json(new ApiResponse(201, rows, "Payment allocations recorded."));
});
