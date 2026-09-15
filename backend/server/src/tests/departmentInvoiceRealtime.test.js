import assert from "node:assert/strict";
import { test } from "node:test";

test("department invoice realtime payload excludes document and user data", async () => {
  const { buildDepartmentInvoiceEvent } = await import(
    "../utils/departmentInvoiceRealtime.js"
  );

  const payload = buildDepartmentInvoiceEvent({
    _id: "central-1",
    sourceDepartment: "logistics",
    sourceModule: "logistics_vendor_payment",
    sourceRecordId: "source-1",
    invoiceNumber: "VEN-001",
    status: "paid",
    paidAmount: 14000,
    remainingAmount: 0,
    companyAdminApprovalStatus: "approved",
    updatedAt: "2026-09-15T06:00:00.000Z",
    documents: [{ fileUrl: "/private.pdf" }],
    payments: [{ recordedBy: "secret" }],
  }, "paid");

  assert.deepEqual(payload, {
    departmentInvoiceId: "central-1",
    sourceDepartment: "logistics",
    sourceModule: "logistics_vendor_payment",
    sourceRecordId: "source-1",
    invoiceNumber: "VEN-001",
    status: "paid",
    paidAmount: 14000,
    remainingAmount: 0,
    companyAdminApprovalStatus: "approved",
    updatedAt: "2026-09-15T06:00:00.000Z",
    action: "paid",
  });
});
