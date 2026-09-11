import Joi from "joi";

const objectId = Joi.string().hex().length(24).required();

export const paymentVoucherParamSchema = Joi.object({ voucherId: objectId });

export const createPaymentAllocationsSchema = Joi.object({
  allocations: Joi.array().items(Joi.object({
    purchaseInvoiceId: objectId,
    allocatedAmount: Joi.number().positive().precision(2).required(),
  })).min(1).required(),
});
