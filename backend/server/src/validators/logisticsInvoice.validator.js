import Joi from "joi";
const objectId = Joi.string().hex().length(24);
const optionalId = objectId.allow(null, "");
const text = Joi.string().trim().allow("");
const money = Joi.number().min(0).default(0);

const item = Joi.object({
  productServiceId: optionalId,
  description: Joi.string().trim().required(), descriptionOther: text,
  hsnSac: text, quantity: Joi.number().positive().required(),
  unit: Joi.string().trim().required(), unitOther: text,
  rate: money, discount: money, gstRate: Joi.number().min(0).max(100).default(0),
  baseAmount: money, taxableAmount: money, taxAmount: money, total: money,
});
const charge = Joi.object({ description: Joi.string().trim().required(), descriptionOther: text, amount: money, taxable: Joi.boolean().default(true) });
const bank = Joi.object({ bankName:text, accountName:text, accountNumber:text, ifscCode:text, branchName:text }).default({});
const body = {
  customerId: optionalId, customerName: Joi.string().trim().required(), contactPerson:text, mobile:text,
  email: Joi.string().trim().email({tlds:{allow:false}}).allow(""), gstNumber:text, billingAddress:text, shippingAddress:text,
  invoiceDate: Joi.date().required(), dueDate: Joi.date().allow(null),
  invoiceType: Joi.string().trim().required(), invoiceTypeOther:text,
  shipmentId: optionalId, shipmentNumber:text, customerReference:text, placeOfSupply:text,
  currency: Joi.string().trim().required(), reverseCharge:Joi.string().valid("yes","no").default("no"),
  items:Joi.array().items(item).min(1).required(), additionalCharges:Joi.array().items(charge).default([]),
  discountType:Joi.string().valid("amount","percentage").default("amount"), overallDiscount:money, roundOff:Joi.number().default(0),
  paymentStatus:Joi.string().valid("unpaid","partial","paid","overdue","cancelled","other").default("unpaid"), paymentStatusOther:text,
  paymentMode:text, paymentModeOther:text, paymentReference:text, paymentDate:Joi.date().allow(null,""), amountReceived:money,
  bankDetails:bank, termsAndConditions:text, remarks:Joi.string().trim().required(),
  status:Joi.string().valid("draft","issued","cancelled").default("draft"),
  itemsSubtotal:money, additionalChargeSubtotal:money, overallDiscountAmount:money, taxableAmount:money, taxTotal:money, invoiceTotal:money, balanceDue:money,
};
export const createLogisticsInvoiceSchema = Joi.object(body);
export const updateLogisticsInvoiceSchema = Joi.object(body).fork(Object.keys(body), s => s.optional()).min(1);
export const logisticsInvoiceQuerySchema = Joi.object({ page:Joi.number().integer().min(1).default(1), limit:Joi.number().integer().min(1).max(100).default(20), search:text, status:text, paymentStatus:text, customerId:optionalId, shipmentNumber:text, fromDate:Joi.date().allow(null,""), toDate:Joi.date().allow(null,""), sortBy:Joi.string().valid("createdAt","invoiceDate","dueDate","invoiceTotal","invoiceNumber").default("createdAt"), sortOrder:Joi.string().valid("asc","desc").default("desc") });
