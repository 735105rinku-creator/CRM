import PaymentAllocation from "../models/PaymentAllocation.js";
import Voucher from "../models/Voucher.js";

class PaymentAllocationRepository {
  listByPayment(companyId, paymentVoucherId) {
    return PaymentAllocation.find({ companyId, paymentVoucherId }).sort({ createdAt: 1 }).lean();
  }

  createMany(rows) {
    return PaymentAllocation.insertMany(rows, { ordered: true });
  }

  async validTotalsByInvoices(companyId, purchaseInvoiceIds = []) {
    if (!purchaseInvoiceIds.length) return new Map();

    const rows = await PaymentAllocation.aggregate([
      { $match: { companyId, purchaseInvoiceId: { $in: purchaseInvoiceIds } } },
      { $lookup: { from: "vouchers", localField: "paymentVoucherId", foreignField: "_id", as: "paymentVoucher" } },
      { $unwind: "$paymentVoucher" },
      { $match: { "paymentVoucher.companyId": companyId, "paymentVoucher.voucherType": "payment", "paymentVoucher.status": "posted" } },
      { $group: { _id: "$purchaseInvoiceId", paidAmount: { $sum: "$allocatedAmount" } } },
    ]);

    return new Map(rows.map(row => [String(row._id), Number(row.paidAmount || 0)]));
  }

  findPayment(companyId, paymentVoucherId) {
    return Voucher.findOne({ _id: paymentVoucherId, companyId, voucherType: "payment" }).lean();
  }
}

export default new PaymentAllocationRepository();
