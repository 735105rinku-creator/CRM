# Cross-Department Invoice Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require Company Admin authorization between Accounts verification and Purchase or Logistics settlement, with complete audit data and synchronized partial/full/void status.

**Architecture:** Extend the existing tenant-scoped `DepartmentInvoice` aggregate with an independent approval state and conditional transitions. Reuse the current Purchase Voucher/PaymentAllocation pipeline and Logistics central settlement pipeline, adding server-side approval checks at allocation, posting, and direct settlement boundaries. Extend the existing Angular Accounts register and embed a focused approval-only component in the current Company Admin dashboard.

**Tech Stack:** Node.js 22+, Express 5, Mongoose 9, Joi 18, Node test runner, Angular 21 standalone components, TypeScript 5.9, RxJS 7.

**Spec:** `docs/superpowers/specs/2026-09-15-cross-department-invoice-approval-design.md`

## Global Constraints

- Preserve all current uncommitted developer work; stage only files belonging to the task being committed.
- Do not migrate, seed, reset, delete, or modify database data outside normal application requests.
- Do not store upload bodies or base64 content in MongoDB.
- Preserve `companyId` isolation and current source handoff, Purchase senior approval, voucher, journal, proof, post, void, and Logistics settlement behavior.
- `purchase_invoice` settlement must use Payment Voucher plus PaymentAllocation; direct central-register payment remains forbidden.
- `logistics_invoice` and `logistics_vendor_payment` retain their current DepartmentInvoice settlement path and success animation.
- Do not grant Company Admin operational Purchase, Logistics, voucher, allocation, or settlement actions through the approval UI.

---

### Task 1: Approval State, Validation, and Conditional Repository Queries

**Files:**
- Modify: `backend/server/src/models/DepartmentInvoice.js`
- Modify: `backend/server/src/validators/departmentInvoice.validator.js`
- Modify: `backend/server/src/repositories/departmentInvoice.repository.js`
- Test: `backend/server/src/tests/departmentInvoiceApproval.test.js`

**Interfaces:**
- Produces: `companyAdminApprovalStatus`, decision audit fields, `companyAdminApprovalQuerySchema`, and `companyAdminApprovalDecisionSchema`.
- Produces: repository list filtering by approval status and a company-scoped source lookup usable by settlement authorization.

- [ ] **Step 1: Write failing model and validator contract tests**

```js
test("DepartmentInvoice exposes final approval state and audit fields", async () => {
  const { default: DepartmentInvoice } = await import("../models/DepartmentInvoice.js");
  const paths = DepartmentInvoice.schema.paths;
  assert.deepEqual(paths.companyAdminApprovalStatus.enumValues, ["not_submitted", "pending", "approved", "rejected"]);
  for (const name of ["companyAdminApprovalBy", "companyAdminApprovalByEmployeeId", "companyAdminApprovalByName", "companyAdminApprovalAt", "companyAdminApprovalRemarks"]) assert.ok(paths[name]);
});

test("rejection requires remarks", async () => {
  const { companyAdminApprovalDecisionSchema } = await import("../validators/departmentInvoice.validator.js");
  assert.ok(companyAdminApprovalDecisionSchema.validate({ decision: "rejected", remarks: "" }).error);
  assert.equal(companyAdminApprovalDecisionSchema.validate({ decision: "approved", remarks: "" }).error, undefined);
});
```

- [ ] **Step 2: Run the contract tests and verify failure**

Run: `node --test src/tests/departmentInvoiceApproval.test.js` from `backend/server`.
Expected: FAIL because approval paths and schemas do not exist.

- [ ] **Step 3: Add approval fields and Joi schemas**

Add a defaulted enum field and nullable audit fields to the existing schema. Extend query validation with `companyAdminApprovalStatus`. Export a list-query schema and this conditional decision schema:

```js
export const companyAdminApprovalDecisionSchema = Joi.object({
  decision: Joi.string().valid("approved", "rejected").required(),
  remarks: Joi.when("decision", {
    is: "rejected",
    then: Joi.string().trim().min(1).max(1500).required(),
    otherwise: Joi.string().trim().allow("").max(1500).optional(),
  }),
}).unknown(false);
```

Update repository `list()` to filter approval state and search approval actor names. Keep every repository lookup company-scoped.

- [ ] **Step 4: Run the test and lint-level checks**

Run: `node --test src/tests/departmentInvoiceApproval.test.js`.
Run: `node --check src/models/DepartmentInvoice.js && node --check src/validators/departmentInvoice.validator.js && node --check src/repositories/departmentInvoice.repository.js`.
Expected: PASS.

- [ ] **Step 5: Commit only Task 1 files**

```bash
git add backend/server/src/models/DepartmentInvoice.js backend/server/src/validators/departmentInvoice.validator.js backend/server/src/repositories/departmentInvoice.repository.js backend/server/src/tests/departmentInvoiceApproval.test.js
git commit -m "feat: add department invoice approval state"
```

### Task 2: Accounts Submission and Company Admin Decision API

**Files:**
- Modify: `backend/server/src/services/departmentInvoice.service.js`
- Modify: `backend/server/src/controllers/departmentInvoice.controller.js`
- Modify: `backend/server/src/routes/departmentInvoice.routes.js`
- Modify: `backend/server/src/routes/accounting.routes.js`
- Test: `backend/server/src/tests/departmentInvoiceApproval.test.js`

**Interfaces:**
- Consumes: approval schema and fields from Task 1.
- Produces: `DepartmentInvoiceService.decideCompanyAdminApproval(companyId, id, payload, actor)`.
- Produces: approval list and decision routes with explicit role enforcement.

- [ ] **Step 1: Add failing transition, authorization, idempotency, and tenant tests**

Use injected repository/model collaborators or method stubs following `voucherService.test.js`. Cover:

```js
test("verify submits an invoice for Company Admin approval", async () => {
  const row = await service.verify(companyId, invoiceId, { remarks: "Documents checked" }, accountsUser);
  assert.equal(row.status, "verified");
  assert.equal(row.companyAdminApprovalStatus, "pending");
});

test("identical approval retry is idempotent", async () => {
  const first = await service.decideCompanyAdminApproval(companyId, invoiceId, { decision: "approved", remarks: "Proceed" }, admin);
  const second = await service.decideCompanyAdminApproval(companyId, invoiceId, { decision: "approved", remarks: "Proceed" }, admin);
  assert.equal(String(second.companyAdminApprovalBy), String(first.companyAdminApprovalBy));
  assert.equal(String(second.companyAdminApprovalAt), String(first.companyAdminApprovalAt));
});
```

Also assert non-company-admin decisions return 403, cross-company IDs return 404, conflicting decisions return 409, and rejection stores its required reason.

- [ ] **Step 2: Run the tests and verify failure**

Run: `node --test src/tests/departmentInvoiceApproval.test.js`.
Expected: FAIL on missing transition/API behavior.

- [ ] **Step 3: Implement transaction-safe transitions and actor audit**

Change `verify()` so its existing conditional transaction sets `companyAdminApprovalStatus: "pending"` and clears prior decision audit. Add one company-scoped Employee identity resolver using User ID/employee code and existing display-name fields. Implement decision logic that:

```js
if (current.companyAdminApprovalStatus === payload.decision && sameRemarks) return current;
if (current.companyAdminApprovalStatus !== "pending") throw new ApiError(409, "Invoice approval state has already changed.");
```

Use a conditional repository update on `{ companyAdminApprovalStatus: "pending", status: "verified" }`, store all audit fields, and synchronize the source snapshot without converting operational `status` to `rejected` for an admin rejection.

- [ ] **Step 4: Add route-specific access**

Keep Accounts list/detail/document/verify/pre-approval reject/payment behavior. Add approval list and decision handlers. Check `req.user.role === ROLES.COMPANY_ADMIN` in server middleware/controller before decisions; do not rely on the Angular guard. Preserve company context through `req.accountingAccess.companyId`.

- [ ] **Step 5: Run focused tests and syntax checks**

Run: `node --test src/tests/departmentInvoiceApproval.test.js`.
Run: `node --check src/services/departmentInvoice.service.js && node --check src/controllers/departmentInvoice.controller.js && node --check src/routes/departmentInvoice.routes.js && node --check src/routes/accounting.routes.js`.
Expected: PASS.

- [ ] **Step 6: Commit only Task 2 files**

```bash
git add backend/server/src/services/departmentInvoice.service.js backend/server/src/controllers/departmentInvoice.controller.js backend/server/src/routes/departmentInvoice.routes.js backend/server/src/routes/accounting.routes.js backend/server/src/tests/departmentInvoiceApproval.test.js
git commit -m "feat: add company admin invoice decisions"
```

### Task 3: Enforce Approval on Logistics Settlement

**Files:**
- Modify: `backend/server/src/services/departmentInvoice.service.js`
- Test: `backend/server/src/tests/departmentInvoiceApproval.test.js`

**Interfaces:**
- Consumes: `companyAdminApprovalStatus` from Task 1.
- Produces: settlement eligibility requiring operational readiness and final authorization.

- [ ] **Step 1: Add failing settlement-gate tests**

```js
for (const approval of ["not_submitted", "pending", "rejected"]) {
  test(`Logistics settlement rejects ${approval} authorization`, async () => {
    repository.findById = async () => logisticsInvoice({ companyAdminApprovalStatus: approval });
    await assert.rejects(service.pay(companyId, invoiceId, payment, accountsUser), error => error.statusCode === 409);
  });
}
```

Add approved partial/full cases and an amount-above-remaining case. Assert payment audit, remaining amount, and source synchronization payload.

- [ ] **Step 2: Run tests and verify the authorization cases fail**

Run: `node --test src/tests/departmentInvoiceApproval.test.js`.
Expected: FAIL because `pay()` currently checks only operational status.

- [ ] **Step 3: Add the minimal service guard**

Inside the existing transaction, require `current.companyAdminApprovalStatus === "approved"` before calculating amount or updating payment history. Retain the optimistic `paidAmount`, `remainingAmount`, and `status` filter so concurrent duplicate/overpayments fail.

- [ ] **Step 4: Run tests and commit**

Run: `node --test src/tests/departmentInvoiceApproval.test.js`.
Expected: PASS.

```bash
git add backend/server/src/services/departmentInvoice.service.js backend/server/src/tests/departmentInvoiceApproval.test.js
git commit -m "fix: gate logistics settlement on admin approval"
```

### Task 4: Enforce Approval Throughout Purchase Allocation and Posting

**Files:**
- Modify: `backend/server/src/services/paymentAllocation.service.js`
- Modify: `backend/server/src/services/voucher.service.js`
- Modify: `backend/server/src/controllers/voucher.controller.js` only if orchestration cannot remain service-local
- Test: `backend/server/src/tests/paymentAllocationApproval.test.js`
- Test: `backend/server/src/tests/voucherService.test.js`

**Interfaces:**
- Produces: `paymentAllocationService.assertApprovedForPosting(companyId, paymentVoucherId)`.
- Consumes: central invoice approval and the existing purchase payable account mapping.

- [ ] **Step 1: Add failing allocation eligibility tests**

Stub Purchase payable vouchers, Purchase invoices, central invoices, and allocation repository totals. Assert options contain approved invoices only and direct `allocate()` requests for pending/rejected invoices fail even when IDs and payable accounts match.

```js
const options = await service.options(companyId, paymentVoucherId);
assert.equal(options.length, 1);
assert.equal(String(options[0].purchaseInvoiceId), approvedId);
assert.equal(options[0].companyAdminApprovalStatus, "approved");
await assert.rejects(
  service.allocate({ companyId, paymentVoucherId, userId, allocations: [{ purchaseInvoiceId: pendingId, allocatedAmount: 100 }] }),
  /approved/i
);
```

- [ ] **Step 2: Add a failing post-time race test**

Create a draft Payment Voucher with an allocation whose central approval changes to rejected before posting. Assert no JournalEntry/post mutation occurs.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `node --test src/tests/paymentAllocationApproval.test.js src/tests/voucherService.test.js`.
Expected: FAIL because approval is not consulted.

- [ ] **Step 4: Join central approval into allocation options and validation**

Query company-scoped `DepartmentInvoice` rows for the candidate Purchase IDs with `sourceModule: "purchase_invoice"` and `companyAdminApprovalStatus: "approved"`. Intersect those IDs with the existing Purchase invoice/payable eligibility. Include approval state in returned option metadata for UI display.

- [ ] **Step 5: Add post-time assertion**

Implement `assertApprovedForPosting()` to load every allocation for the Payment Voucher and require a matching approved, outstanding, tenant-scoped central invoice. Invoke it immediately before the existing voucher transaction creates/posts its JournalEntry. Leave non-Payment and unallocated Payment Vouchers unchanged.

- [ ] **Step 6: Run allocation, voucher, and syntax tests**

Run: `node --test src/tests/paymentAllocationApproval.test.js src/tests/voucherService.test.js src/tests/voucherController.test.js src/tests/voucherRoutes.test.js`.
Expected: PASS.

- [ ] **Step 7: Commit Task 4 files**

```bash
git add backend/server/src/services/paymentAllocation.service.js backend/server/src/services/voucher.service.js backend/server/src/controllers/voucher.controller.js backend/server/src/tests/paymentAllocationApproval.test.js backend/server/src/tests/voucherService.test.js
git commit -m "fix: require approval for purchase settlement"
```

### Task 5: Complete Purchase Sender Identity and Preserve Settlement Synchronization

**Files:**
- Modify: `backend/server/src/controllers/purchaseInvoice.controller.js`
- Modify: `backend/server/src/services/purchaseInvoice.service.js`
- Modify: `backend/server/src/services/departmentInvoice.service.js`
- Test: `backend/server/src/tests/purchaseInvoiceAccountsHandoff.test.js`
- Test: `backend/server/src/tests/paymentAllocationApproval.test.js`

**Interfaces:**
- Produces: `handoffToAccounts({ companyId, invoiceId, userId, employeeId, userName, ...access })` with real identity values.
- Consumes: existing access/employee data resolved in the Purchase controller/service.

- [ ] **Step 1: Add failing sender-identity test**

```js
assert.equal(String(handoffPayload.sentToAccountsBy), userId);
assert.equal(String(handoffPayload.sentToAccountsByEmployeeId), employeeId);
assert.equal(handoffPayload.sentToAccountsByName, "Priya Sharma");
```

Assert there is no fallback hardcoded employee name and that user email is used only when no existing display name is available.

- [ ] **Step 2: Run the handoff test and verify failure**

Run: `node --test src/tests/purchaseInvoiceAccountsHandoff.test.js`.
Expected: FAIL because Purchase currently passes null/empty employee audit fields.

- [ ] **Step 3: Pass existing access identity through Purchase handoff**

Use the same authenticated Purchase access record that authorizes handoff. Do not broaden read access. Pass its user ID, Employee ID, and computed existing display name to `departmentInvoiceService.handoff()`.

- [ ] **Step 4: Add synchronization assertions**

Test posted partial/full totals and void rollback by stubbing effective `validTotalsByInvoices()` values, then assert both `DepartmentInvoice` and Purchase source updates use `partially_paid`, `paid`, or `verified` correctly while retaining approval state.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test src/tests/purchaseInvoiceAccountsHandoff.test.js src/tests/paymentAllocationApproval.test.js`.
Expected: PASS.

```bash
git add backend/server/src/controllers/purchaseInvoice.controller.js backend/server/src/services/purchaseInvoice.service.js backend/server/src/services/departmentInvoice.service.js backend/server/src/tests/purchaseInvoiceAccountsHandoff.test.js backend/server/src/tests/paymentAllocationApproval.test.js
git commit -m "fix: preserve purchase handoff and settlement audit"
```

### Task 6: Extend Shared Angular Models and API Service

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/accounts/models/accounts.models.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/services/department-invoice.service.ts`

**Interfaces:**
- Produces: `DepartmentInvoiceApprovalStatus`, decision payload, approval query, approval audit fields, and service methods `getApprovalInvoices()` and `decideApproval()`.

- [ ] **Step 1: Add exact TypeScript contracts**

```ts
export type DepartmentInvoiceApprovalStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export interface CompanyAdminApprovalDecisionPayload {
  decision: 'approved' | 'rejected';
  remarks?: string;
}
```

Add approval fields to `DepartmentInvoice`, approval filter to `DepartmentInvoiceQuery`, and `companyAdminApprovalStatus` to `PurchasePaymentAllocationOption`.

- [ ] **Step 2: Add API methods and update frontend eligibility helper**

```ts
decideApproval(invoiceId: string, payload: CompanyAdminApprovalDecisionPayload) {
  return this.api.patch<DepartmentInvoice>(`${this.basePath}/${this.encodeId(invoiceId)}/company-admin-approval`, payload);
}
```

Make `canRecordSettlement()` require approval. Add `canApprove()` for `pending` rows.

- [ ] **Step 3: Run Angular type/build verification**

Run: `npm run build` from `frontend/crm-frontend`.
Expected: PASS or expose only the still-unimplemented component bindings scheduled in Tasks 7-8; resolve model/service errors before proceeding.

- [ ] **Step 4: Commit shared contracts**

```bash
git add frontend/crm-frontend/src/app/features/accounts/models/accounts.models.ts frontend/crm-frontend/src/app/features/accounts/services/department-invoice.service.ts
git commit -m "feat: expose invoice approval contracts"
```

### Task 7: Add Company Admin Approval-Only Workspace

**Files:**
- Create: `frontend/crm-frontend/src/app/features/company-admin/invoice-approvals/invoice-approvals.component.ts`
- Create: `frontend/crm-frontend/src/app/features/company-admin/invoice-approvals/invoice-approvals.component.html`
- Create: `frontend/crm-frontend/src/app/features/company-admin/invoice-approvals/invoice-approvals.component.scss`
- Modify: `frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.html`

**Interfaces:**
- Consumes: Task 6 models and `DepartmentInvoiceService`.
- Produces: standalone approval-only page embedded under menu ID `invoice-approvals`.

- [ ] **Step 1: Create the standalone component state and filters**

Use signals for rows, pagination, loading/error, selected row, decision remarks, approval filter, source filter, and search. Fetch `pending` by default. Reuse the authenticated Blob document methods; revoke preview object URLs on close/destroy.

- [ ] **Step 2: Build the monitoring/decision template**

Render Pending/Approved/Rejected tabs, source selector, search, combined Purchase/Logistics table, details modal, document View/Download, approval audit, approve confirmation, and required rejection reason. Do not include settlement, allocation, voucher, or source-edit controls.

- [ ] **Step 3: Apply scoped Neumorphism styling**

Reuse existing dashboard surface variables and responsive patterns. Keep the component stylesheet scoped and avoid modifying global theme/index styles.

- [ ] **Step 4: Embed in the existing Company Admin shell**

Import the standalone component into `CompanyAdminDashboardComponent`, add one `Invoice Approvals` menu item, and render `<app-invoice-approvals>` for that active section. Do not add a duplicate dashboard route/layout.

- [ ] **Step 5: Build and commit**

Run: `npm run build` from `frontend/crm-frontend`.
Expected: PASS.

```bash
git add frontend/crm-frontend/src/app/features/company-admin/invoice-approvals frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.ts frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.html
git commit -m "feat: add company admin invoice approvals"
```

### Task 8: Show Approval Progress and Gate Accounts Actions

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/department-invoices/department-invoices.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/department-invoices/department-invoices.component.html`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/department-invoices/department-invoices.component.scss`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.html`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.scss`

**Interfaces:**
- Consumes: approval contracts, server-gated allocation options, and existing purchase query-parameter prefill.
- Produces: visible workflow timeline and approved-only payment affordances.

- [ ] **Step 1: Extend Accounts filtering and badges**

Add approval status filter and Pending/Approved/Rejected badges without removing operational Partially Paid/Paid badges.

- [ ] **Step 2: Add the modal progression and audit**

Render Accounts Verified, Awaiting Company Admin Approval, Approved/Rejected, decision actor/date/remarks, Ready for Payment, and settlement history. Use existing date and currency helpers.

- [ ] **Step 3: Gate actions in component logic**

Purchase `Create Payment Voucher` and Logistics settlement buttons require `companyAdminApprovalStatus === 'approved'` plus existing status/outstanding checks. Pending/rejected rows show a clear reason. Backend remains authoritative.

- [ ] **Step 4: Finish approved Purchase prefill**

Continue using `purchaseInvoiceId`, invoice number, vendor, outstanding, and payable account metadata. Ensure the selected Bank/Cash account becomes the credit line and Vendor/AP remains the debit line. Never add a Purchase Expense debit. Allocation may be partial or full and proof/post success appears only after the server reports posting complete.

- [ ] **Step 5: Preserve Logistics success behavior**

Exercise the existing settlement success path after an approved Logistics payment/receipt and confirm no animation call occurs on an API error.

- [ ] **Step 6: Build and commit**

Run: `npm run build` from `frontend/crm-frontend`.
Expected: PASS.

```bash
git add frontend/crm-frontend/src/app/features/accounts/pages/department-invoices frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry
git commit -m "feat: wire approved invoice settlement UI"
```

### Task 9: End-to-End Regression Verification

**Files:**
- Modify tests only when an assertion is genuinely incorrect for the approved behavior; never weaken or delete coverage.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verification evidence for the final handoff.

- [ ] **Step 1: Run focused approval and settlement tests**

Run from `backend/server`:

```bash
node --test src/tests/departmentInvoiceApproval.test.js src/tests/paymentAllocationApproval.test.js src/tests/purchaseInvoiceAccountsHandoff.test.js src/tests/voucherService.test.js src/tests/voucherController.test.js src/tests/voucherRoutes.test.js src/tests/logisticsInvoicePaymentEdit.test.js
```

Expected: all tests PASS.

- [ ] **Step 2: Run related accounting regression tests**

Run from `backend/server`:

```bash
node --test src/tests/voucherModel.test.js src/tests/voucherRepository.test.js src/tests/voucherValidator.test.js src/tests/voucher.attachments.test.js src/tests/voucher.sourceAttachments.test.js src/tests/accountingVoucherMount.test.js
```

Expected: all tests PASS.

- [ ] **Step 3: Run frontend production build**

Run: `npm run build` from `frontend/crm-frontend`.
Expected: PASS with no TypeScript or template errors.

- [ ] **Step 4: Review scoped diff and repository state**

Run: `git diff --check` and `git status --short`.
Confirm unrelated developer changes and the uploaded Purchase invoice image are untouched. Review that no migration, seed, destructive command, or base64 persistence was introduced.

- [ ] **Step 5: Report the verified E2E flow**

Report changed files, exact test commands/results, remaining pre-existing failures if any, and these verified outcomes: Purchase partial/full/void synchronization; Logistics partial/full settlement; rejection blocking; tenant and role enforcement; sender, approval, and payment audit visibility.
