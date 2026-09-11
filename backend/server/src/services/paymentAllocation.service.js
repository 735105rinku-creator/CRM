import mongoose from "mongoose";
import crypto from "node:crypto";
import paymentAllocationRepository from "../repositories/paymentAllocation.repository.js";
import PurchaseInvoice from "../models/PurchaseInvoice.js";
import Voucher from "../models/Voucher.js";
import { ApiError } from "../utils/apiError.js";

const money = value => Math.round(Number(value || 0) * 100) / 100;
const allocationId = (companyId, paymentVoucherId, purchaseInvoiceId) =>
  new mongoose.Types.ObjectId(crypto.createHash("sha256").update(`${companyId}:${paymentVoucherId}:${purchaseInvoiceId}`).digest().subarray(0, 12));

class PaymentAllocationService {
  async options(companyId, paymentVoucherId) {
    const payment = await this.payment(companyId, paymentVoucherId);
    const payableAmounts = new Map(
      (payment.lines || []).filter(line => Number(line.debit || 0) > 0).map(line => [String(line.accountId), money(line.debit)])
    );
    if (payment.partyAccountId) payableAmounts.set(String(payment.partyAccountId), money(payment.totalDebit));
    const partyAccountIds = [...payableAmounts.keys()].map(id => new mongoose.Types.ObjectId(id));
    const purchaseVouchers = await Voucher.find({
      companyId,
      voucherType: "purchase",
      partyAccountId: { $in: partyAccountIds },
      sourceModule: "purchase_invoice",
      sourceReferenceId: { $ne: null },
    }).select("sourceReferenceId voucherNumber partyAccountId").lean();

    const voucherByInvoice = new Map(purchaseVouchers.map(row => [String(row.sourceReferenceId), row]));
    const invoiceIds = [...voucherByInvoice.keys()].map(id => new mongoose.Types.ObjectId(id));
    const invoices = await PurchaseInvoice.find({ companyId, _id: { $in: invoiceIds }, handoffStatus: "handed_off" })
      .select("vendorName vendorInvoiceNumber invoiceDate invoiceTotal poNumber")
      .sort({ invoiceDate: 1 })
      .lean();
    const paid = await paymentAllocationRepository.validTotalsByInvoices(companyId, invoiceIds);

    return invoices.map(invoice => {
      const paidAmount = money(paid.get(String(invoice._id)) || 0);
      const outstandingAmount = money(Math.max(0, Number(invoice.invoiceTotal || 0) - paidAmount));
      return {
        purchaseInvoiceId: invoice._id,
        vendorName: invoice.vendorName,
        vendorInvoiceNumber: invoice.vendorInvoiceNumber,
        invoiceDate: invoice.invoiceDate,
        poNumber: invoice.poNumber,
        invoiceTotal: money(invoice.invoiceTotal),
        paidAmount,
        outstandingAmount,
        accountsVoucherNumber: voucherByInvoice.get(String(invoice._id))?.voucherNumber || "",
        partyAccountId: voucherByInvoice.get(String(invoice._id))?.partyAccountId,
      };
    }).filter(row => row.outstandingAmount > 0);
  }

  async allocate({ companyId, paymentVoucherId, userId, allocations }) {
    const payment = await this.payment(companyId, paymentVoucherId);
    if (payment.status !== "draft") throw new ApiError(409, "Allocations can only be recorded before the payment voucher is posted.");

    const existing = await paymentAllocationRepository.listByPayment(companyId, paymentVoucherId);
    const normalized = allocations.map(row => ({ purchaseInvoiceId: String(row.purchaseInvoiceId), allocatedAmount: money(row.allocatedAmount) }));
    if (existing.length) {
      const same = existing.length === normalized.length && existing.every(saved => normalized.some(row => row.purchaseInvoiceId === String(saved.purchaseInvoiceId) && row.allocatedAmount === money(saved.allocatedAmount)));
      if (same) return existing;
      throw new ApiError(409, "Payment allocations are already recorded for this voucher.");
    }

    const total = money(normalized.reduce((sum, row) => sum + row.allocatedAmount, 0));
    if (total <= 0 || total > money(payment.totalDebit)) throw new ApiError(400, "Allocation total must be positive and cannot exceed the payment voucher amount.");

    const options = await this.options(companyId, paymentVoucherId);
    const byId = new Map(options.map(row => [String(row.purchaseInvoiceId), row]));
    const seen = new Set();
    const byParty = new Map();
    for (const row of normalized) {
      if (seen.has(row.purchaseInvoiceId)) throw new ApiError(400, "A Purchase Invoice can be allocated only once per payment voucher.");
      seen.add(row.purchaseInvoiceId);
      const invoice = byId.get(row.purchaseInvoiceId);
      if (!invoice) throw new ApiError(400, "Selected Purchase Invoice is not an outstanding payable for this vendor.");
      if (row.allocatedAmount <= 0 || row.allocatedAmount > invoice.outstandingAmount) throw new ApiError(400, `Allocation for ${invoice.vendorInvoiceNumber} exceeds its outstanding amount.`);
      const partyKey = String(invoice.partyAccountId);
      byParty.set(partyKey, money((byParty.get(partyKey) || 0) + row.allocatedAmount));
    }

    const payableAmounts = new Map((payment.lines || []).filter(line => Number(line.debit || 0) > 0).map(line => [String(line.accountId), money(line.debit)]));
    if (payment.partyAccountId) payableAmounts.set(String(payment.partyAccountId), money(payment.totalDebit));
    for (const [partyAccountId, allocated] of byParty) {
      if (allocated > Number(payableAmounts.get(partyAccountId) || 0)) throw new ApiError(400, "Vendor allocation exceeds the related payable debit in this payment voucher.");
    }

    const rows = normalized.map(row => ({
      _id: allocationId(companyId, paymentVoucherId, row.purchaseInvoiceId),
      companyId,
      paymentVoucherId,
      purchaseInvoiceId: row.purchaseInvoiceId,
      allocatedAmount: row.allocatedAmount,
      createdBy: userId || null,
    }));

    try {
      return await paymentAllocationRepository.createMany(rows);
    } catch (error) {
      if (error?.code !== 11000) throw error;
      const saved = await paymentAllocationRepository.listByPayment(companyId, paymentVoucherId);
      const same = saved.length === normalized.length && saved.every(item => normalized.some(row => row.purchaseInvoiceId === String(item.purchaseInvoiceId) && row.allocatedAmount === money(item.allocatedAmount)));
      if (same) return saved;
      throw new ApiError(409, "Payment allocations are already recorded for this voucher.");
    }
  }

  async settlementForInvoices(companyId, invoices) {
    const ids = invoices.map(row => row._id);
    const totals = await paymentAllocationRepository.validTotalsByInvoices(companyId, ids);
    return new Map(invoices.map(invoice => {
      const invoiceTotal = money(invoice.invoiceTotal);
      const paidAmount = money(Math.min(invoiceTotal, totals.get(String(invoice._id)) || 0));
      const outstandingAmount = money(Math.max(0, invoiceTotal - paidAmount));
      return [String(invoice._id), { invoiceTotal, paidAmount, outstandingAmount, paymentStatus: paidAmount <= 0 ? "unpaid" : outstandingAmount > 0 ? "partially_paid" : "paid" }];
    }));
  }

  async payment(companyId, paymentVoucherId) {
    if (!mongoose.isValidObjectId(paymentVoucherId)) throw new ApiError(400, "Invalid payment voucher ID.");
    const payment = await paymentAllocationRepository.findPayment(companyId, paymentVoucherId);
    if (!payment) throw new ApiError(404, "Payment voucher not found.");
    if (!payment.partyAccountId && !(payment.lines || []).some(line => Number(line.debit || 0) > 0)) throw new ApiError(409, "Payment voucher must debit a vendor payable account before allocation.");
    return payment;
  }
}

export default new PaymentAllocationService();
