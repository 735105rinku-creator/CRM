import assert from "node:assert/strict";
import test from "node:test";
import invoiceService from "../services/logisticsInvoice.service.js";
import invoiceRepo from "../repositories/logisticsInvoice.repository.js";
import paymentService from "../services/logisticsVendorPayment.service.js";
import paymentRepo from "../repositories/logisticsVendorPayment.repository.js";

const companyId = "111111111111111111111111";
const recordId = "222222222222222222222222";
const userId = "333333333333333333333333";
for (const kind of ["invoice", "payment"]) {
  test(`${kind} edits use server identity and retain existing history and amounts`, async (t) => {
    const repo = kind === "invoice" ? invoiceRepo : paymentRepo;
    const old = { _id: recordId, companyId, items: [{quantity: 2, rate: 100, gstRate: 18}], additionalCharges: [], totalAmount: 200, paidAmount: 20, previousAdvance: 0, deduction: 0, supplierBalance: 180, paymentHistory: [{amount: 20}], editHistory: [{changedBy: userId, changedByName: "Earlier editor", changedAt: new Date(0)}] };
    t.mock.method(repo, "findById", async () => structuredClone(old));
    let saved;
    t.mock.method(repo, kind === "invoice" ? "update" : "updateById", async (args) => { saved = args; return {...old, ...args.payload}; });
    const payload = {remarks: "Updated", editHistory: [], updatedBy: "spoofed"};
    if (kind === "invoice") await invoiceService.update({companyId, invoiceId: recordId, userId, userName: "Real editor", payload});
    else await paymentService.updatePaymentRecord({companyId, paymentId: recordId, userId, userName: "Real editor", payload});
    assert.equal(saved.companyId, companyId);
    assert.equal(saved.payload.updatedBy, userId);
    assert.equal(saved.auditEntry.changedBy, userId);
    assert.equal(saved.auditEntry.changedByName, "Real editor");
    assert.ok(saved.auditEntry.changedAt instanceof Date);
    assert.equal(Object.hasOwn(saved.payload, "editHistory"), false);
    if (kind === "invoice") assert.equal(saved.payload.invoiceTotal, 236);
    else assert.equal(Object.hasOwn(saved.payload, "paymentHistory"), false);
  });
}
