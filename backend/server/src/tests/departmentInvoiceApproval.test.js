import assert from "node:assert/strict";
import { test } from "node:test";

test("DepartmentInvoice supports final Company Admin approval audit", async () => {
  const { default: DepartmentInvoice } = await import("../models/DepartmentInvoice.js");
  const paths = DepartmentInvoice.schema.paths;

  assert.deepEqual(paths.companyAdminApprovalStatus?.enumValues, [
    "not_submitted",
    "pending",
    "approved",
    "rejected",
  ]);

  for (const name of [
    "companyAdminApprovalBy",
    "companyAdminApprovalByEmployeeId",
    "companyAdminApprovalByName",
    "companyAdminApprovalAt",
    "companyAdminApprovalRemarks",
  ]) {
    assert.ok(paths[name], `${name} must be persisted`);
  }
});

test("Company Admin rejection requires a reason while approval remarks are optional", async () => {
  const { companyAdminApprovalDecisionSchema } = await import(
    "../validators/departmentInvoice.validator.js"
  );

  assert.ok(
    companyAdminApprovalDecisionSchema.validate({
      decision: "rejected",
      remarks: "",
    }).error
  );

  assert.equal(
    companyAdminApprovalDecisionSchema.validate({
      decision: "approved",
      remarks: "",
    }).error,
    undefined
  );
});

test("approval query accepts approval and source filters together", async () => {
  const { companyAdminApprovalQuerySchema } = await import(
    "../validators/departmentInvoice.validator.js"
  );

  const { value, error } = companyAdminApprovalQuerySchema.validate({
    companyAdminApprovalStatus: "pending",
    sourceModule: "purchase_invoice",
    search: "INV-42",
  });

  assert.equal(error, undefined);
  assert.equal(value.page, 1);
  assert.equal(value.limit, 20);
});

test("DepartmentInvoice service exposes a Company Admin decision transition", async () => {
  const { default: service } = await import(
    "../services/departmentInvoice.service.js"
  );

  assert.equal(typeof service.decideCompanyAdminApproval, "function");
});

test("settlement authorization rejects pending and rejected decisions", async () => {
  const { default: service } = await import(
    "../services/departmentInvoice.service.js"
  );

  for (const companyAdminApprovalStatus of ["not_submitted", "pending", "rejected"]) {
    assert.throws(
      () => service.assertSettlementApproved({ companyAdminApprovalStatus }),
      error => error?.statusCode === 409
    );
  }

  assert.doesNotThrow(() =>
    service.assertSettlementApproved({ companyAdminApprovalStatus: "approved" })
  );
});
