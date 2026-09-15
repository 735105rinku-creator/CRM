# Cross-Department Invoice Approval and Payment Design

## Purpose

Complete the existing OPAS BIZZ CRM invoice handoff and settlement workflow for Purchase invoices, Logistics customer invoices, and Logistics vendor payments. Accounts must verify every handed-off invoice, Company Admin must provide final payment authorization, and settlement must remain within each source module's existing accounting architecture.

## Constraints

- Work from the current repository and preserve all existing in-progress changes.
- Do not redesign or replace the existing architecture.
- Preserve tenant isolation, authentication, permissions, routes, APIs, models, repositories, services, controllers, and Angular standalone patterns.
- Do not migrate, seed, reset, delete, or otherwise alter database data.
- Do not store uploaded files or base64 content in MongoDB.
- Do not remove Purchase senior approval rules or expose operational Purchase or Logistics actions to Company Admin through this workflow.
- Keep Purchase settlement in the existing Voucher and PaymentAllocation architecture.
- Keep Logistics settlement in the existing DepartmentInvoice-based Accounts settlement architecture.
- Preserve the existing Logistics settlement success animation.

## Audited Existing Architecture

### Central register

`DepartmentInvoice` is the existing central Accounts register. It supports `purchase_invoice`, `logistics_invoice`, and `logistics_vendor_payment`, enforces a unique company/source identity, snapshots invoice and document information, records Accounts verification, and stores Logistics settlement history. Repository reads and conditional writes include `companyId`.

### Purchase

Purchase handoff creates or reuses a central `DepartmentInvoice` and the existing Purchase payable voucher. Vendor payment uses a Payment Voucher and `PaymentAllocation`. Effective settlement totals count posted Payment Vouchers. Current in-progress code refreshes affected central and Purchase invoice statuses after Payment Voucher posting or voiding.

### Logistics

Logistics handoff creates a central invoice and locks source-side financial editing. Accounts records Logistics vendor payments or customer receipts through the central register. Settlement updates payment history, paid and remaining amounts, payer identity, reference, and source-module status.

### Current gap

Accounts verification currently makes an invoice immediately eligible for settlement. There is no independent Company Admin authorization state, audit, or combined approval page. Existing rejection represents an Accounts-side rejection. Purchase allocation and Logistics settlement therefore lack the required final-authorization gate.

## State Model

Preserve the existing operational `status` values for compatibility:

- `sent`
- `under_review`
- `verified`
- `partially_paid`
- `paid`
- `rejected`

Add an independent `companyAdminApprovalStatus` with these values:

- `not_submitted`: source handoff exists but Accounts has not verified it.
- `pending`: Accounts has verified and submitted it for final authorization.
- `approved`: Company Admin authorized settlement.
- `rejected`: Company Admin denied settlement.

Add approval audit fields to `DepartmentInvoice`:

- `companyAdminApprovalBy`: approving/rejecting User ID.
- `companyAdminApprovalByEmployeeId`: Employee ID when one can be resolved.
- `companyAdminApprovalByName`: stable display-name snapshot.
- `companyAdminApprovalAt`: decision date and time.
- `companyAdminApprovalRemarks`: approval remarks or rejection reason.

The existing Accounts rejection audit remains separate. This preserves pre-authorization rejection without conflating it with a Company Admin decision.

### Transitions

1. Source handoff creates `status=sent` and `companyAdminApprovalStatus=not_submitted`.
2. Accounts verifies only `sent` or `under_review`; the same conditional transaction sets `status=verified` and `companyAdminApprovalStatus=pending`.
3. Company Admin may approve or reject only `pending` invoices.
4. Repeating the identical approval/rejection decision returns the existing result without adding duplicate audit activity. A conflicting second decision returns HTTP 409.
5. Accounts may settle only when `companyAdminApprovalStatus=approved`.
6. Partial/full settlement continues to set operational status to `partially_paid` or `paid`.
7. Voiding a posted Purchase Payment Voucher recalculates effective allocations and rolls Purchase and central status back while retaining the authorization decision.
8. Company Admin rejection blocks both Logistics settlement and Purchase allocation/posting.

No backfill or migration is performed. Existing records without the new field behave as `not_submitted` and must pass through Accounts verification/submission before settlement.

## Backend Design

### DepartmentInvoice domain

Extend the model, query validation, repository filters, service, controller, and routes with approval state and audit. Reuse the existing tenant-scoped repository methods and conditional `findOneAndUpdate` transitions.

Accounts endpoints continue to use the existing `/api/accounting/department-invoices` mount. Add explicit submission/decision behavior without changing source handoff URLs. Accounts verification is the submission action, avoiding an unnecessary extra click and matching the required flow.

Add approval endpoints under the same company-scoped resource:

- `GET /api/accounting/department-invoices/approvals`
- `PATCH /api/accounting/department-invoices/:id/company-admin-approval`

The list supports approval status, source department/module, search, page, and limit. The decision body contains `decision: approved | rejected` and `remarks`; rejected decisions require non-empty remarks.

Route middleware must distinguish Accounts operations from Company Admin decisions. Only `company_admin` may decide. `super_admin` may view for platform support but must not act as a tenant Company Admin. Accounts/Finance staff may list, inspect, verify, reject before submission, download documents, and settle after approval. Existing broader accounting access is not redesigned outside this workflow.

### Identity audit

Create one service-level identity resolver that uses the authenticated User and the company-scoped Employee lookup already used by the application. It records User ID, Employee ID where available, and the best existing display name. Purchase handoff must pass its resolved user/employee identity instead of a hardcoded or empty sender name.

### Logistics settlement security

`DepartmentInvoiceService.pay` must require:

- a supported Logistics source module;
- operational status `verified` or `partially_paid`;
- Company Admin approval `approved`;
- a positive amount no greater than the current remaining amount.

The existing conditional update remains the concurrency guard. Existing Logistics source synchronization and success UI remain unchanged except for the new authorization gate and audit display.

### Purchase settlement security

Payment allocation options must include only Purchase invoices that are Accounts-verified, Company Admin-approved, outstanding, tenant-matched, and associated with the payable account debited by the Payment Voucher. Allocation creation re-runs those conditions server-side and rejects an amount above either invoice outstanding or the related payable debit.

Before a Purchase-origin Payment Voucher posts, revalidate every allocation against a currently approved central invoice. This closes the race between draft allocation and posting. Existing proof, balanced-entry, posted/void, journal, and allocation protections remain authoritative.

The payment entry prefill carries the Purchase Invoice ID, invoice number, vendor, outstanding amount, and existing payable account. It creates a draft balanced entry with Vendor/AP debit and selected Bank/Cash credit. It never debits Purchase Expense during settlement.

### Synchronization

After Purchase Payment Voucher post or void:

1. Read affected `PaymentAllocation` rows.
2. Recalculate effective posted totals.
3. Update Purchase Invoice and `DepartmentInvoice` paid, remaining, and status values.

After Logistics settlement, update central and source paid amount, remaining amount, status, actor, date/time, reference, remarks, and history in the existing transaction.

## Frontend Design

### Accounts Incoming Invoices

Extend the current Accounts component and models rather than replacing them. Show source, invoice and party data, totals, sender identity/time, authenticated document view/download, verification, Company Admin state/audit, settlement history, and payment identity/reference.

The modal progression is:

1. Accounts verification.
2. Awaiting Company Admin approval.
3. Approved or rejected decision with name, date/time, and remarks.
4. Ready for payment only when approved.
5. Purchase opens the existing Payment Voucher workflow; Logistics opens the existing settlement form.

Buttons are hidden or disabled for clarity, but backend enforcement remains mandatory.

### Company Admin approval page

Add a focused standalone approval component and embed it in the existing Company Admin dashboard shell/menu. It uses shared Department Invoice models/service but exposes only:

- combined Purchase and Logistics monitoring;
- pending, approved, and rejected filters;
- source filter and search;
- source details and authenticated document view/download;
- approve with optional remarks;
- reject with required reason.

It does not expose source editing, vouchers, allocations, or settlement controls.

### Payment Voucher entry

Retain the existing voucher component. The approved Purchase invoice action navigates with verified query parameters. The component loads authoritative server options, selects the originating invoice, shows vendor/invoice/outstanding, prefills the correct payable debit, lets Accounts select Bank/Cash credit, supports partial/full allocation, saves draft, uploads proof, and posts. Success is displayed only after posting completes.

## Error Handling and Security

- Every read and write remains company-scoped.
- Unauthorized decision attempts return HTTP 403.
- Invalid or conflicting transitions return HTTP 409.
- Invalid payment amounts return HTTP 400.
- Missing records return HTTP 404 without leaking cross-tenant existence.
- Approval decisions use conditional writes for idempotency and concurrency safety.
- Purchase allocation and posting each independently enforce approval.
- Existing posted and void accounting protections remain unchanged.
- Document streaming remains limited to approved upload roots; MongoDB stores metadata only.

## Testing and Verification

Add focused Node tests for:

- Accounts verification submits for approval.
- Only Company Admin can approve/reject.
- approval audit records user, employee, name, time, and remarks.
- duplicate identical decisions are idempotent; conflicting decisions fail.
- tenant isolation for approval list/detail/decision.
- pending/rejected invoices cannot settle.
- approved Logistics invoices can settle partially and fully without exceeding outstanding.
- Purchase allocation options exclude unapproved invoices.
- forged allocation and posting attempts for unapproved invoices fail.
- Purchase posted allocation synchronizes partial/full status.
- Purchase void rolls settlement status back.
- existing source modules remain supported.

Run the focused backend tests, relevant existing voucher and Logistics tests, and the Angular production build. Do not modify tests merely to suppress failures.

## Expected File Changes

### Backend

- `backend/server/src/models/DepartmentInvoice.js`
- `backend/server/src/validators/departmentInvoice.validator.js`
- `backend/server/src/repositories/departmentInvoice.repository.js`
- `backend/server/src/services/departmentInvoice.service.js`
- `backend/server/src/controllers/departmentInvoice.controller.js`
- `backend/server/src/routes/departmentInvoice.routes.js`
- `backend/server/src/routes/accounting.routes.js`
- `backend/server/src/services/paymentAllocation.service.js`
- `backend/server/src/services/voucher.service.js`
- `backend/server/src/controllers/voucher.controller.js` only if the existing post/void orchestration is the correct synchronization boundary
- Purchase invoice service/controller files only where the existing access context must supply sender identity
- Focused tests under `backend/server/src/tests/`

### Frontend

- `frontend/crm-frontend/src/app/features/accounts/models/accounts.models.ts`
- `frontend/crm-frontend/src/app/features/accounts/services/department-invoice.service.ts`
- `frontend/crm-frontend/src/app/features/accounts/pages/department-invoices/department-invoices.component.ts`
- `frontend/crm-frontend/src/app/features/accounts/pages/department-invoices/department-invoices.component.html`
- `frontend/crm-frontend/src/app/features/accounts/pages/department-invoices/department-invoices.component.scss`
- Existing voucher-entry files only for approved Purchase prefill and post-success behavior
- `frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.ts`
- `frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.html`
- New focused Company Admin approval component files under `frontend/crm-frontend/src/app/features/company-admin/`

## End-to-End Result

Purchase follows source handoff, Accounts verification/submission, Company Admin decision, existing Payment Voucher/allocation/proof/post flow, and immediate partial/full/void synchronization.

Logistics follows source handoff, Accounts verification/submission, Company Admin decision, existing Accounts settlement, and immediate partial/full synchronization.

Rejected or unapproved invoices are never payable, and Accounts can see the complete approval and settlement audit throughout.
