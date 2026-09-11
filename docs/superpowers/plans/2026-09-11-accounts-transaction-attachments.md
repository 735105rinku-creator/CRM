# Accounts Transaction Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure supporting-document attachments to Accounts vouchers and expenses, enforce mandatory proof for Payment, Purchase Bill and Expense workflows, and reuse existing Purchase Invoice attachments for Purchase-origin bills.

**Architecture:** Accounts-native proofs use dedicated attachment endpoints and the existing Multer disk-storage pattern under `public/uploads/accounts-proofs/`. Voucher and AccountExpense documents store metadata only. Purchase-origin bills reuse Purchase Invoice attachment metadata through existing source/handoff linkage instead of duplicating Purchase files.

**Tech Stack:** Node.js, Express, Mongoose, Multer, Angular standalone components, RxJS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-11-accounts-transaction-attachments-design.md`

## Global Constraints

- Accounts scope only.
- Do not modify Sales feature code.
- Do not modify Logistics feature code.
- Do not change Purchase attachment limits or Purchase workflow behavior.
- Accounts-native proof types: PDF, JPG, JPEG, PNG.
- Maximum Accounts-native files: 5 per transaction.
- Maximum Accounts-native file size: 10 MB each.
- Purchase-origin files retain Purchase's current 1 MB upload rule.
- Purchase Bill, Payment and Expense proof are mandatory at the approved lifecycle boundary.
- Sales Invoice, Receipt, Journal, Contra, Credit Note and Debit Note proof remain optional.
- Draft vouchers may exist without proof.
- Posted vouchers must not permit proof deletion.
- Existing Purchase Invoice attachments count as proof for Purchase-origin Purchase Bills.
- No migration.
- No seed.
- No reset.
- No deletion or rewrite of existing database records.
- Only `Voucher.attachments` and `AccountExpense.attachments` schema extensions are approved.
- Existing voucher accounting/posting calculations must remain unchanged except minimum proof validation.
- Work from an isolated feature branch/worktree.
- Never force push or reset shared `main`.

---
## File Structure

Backend files expected to change:

- `backend/server/src/middleware/upload.middleware.js`
- `backend/server/src/models/Voucher.js`
- `backend/server/src/models/AccountExpense.js`
- `backend/server/src/routes/voucher.routes.js`
- `backend/server/src/controllers/voucher.controller.js`
- `backend/server/src/services/voucher.service.js`
- `backend/server/src/repositories/voucher.repository.js`
- `backend/server/src/routes/accounting.routes.js`

Backend tests to create:

- `backend/server/src/tests/voucher.attachments.test.js`
- `backend/server/src/tests/accountExpense.attachments.test.js`

Frontend files expected to change:

- `frontend/crm-frontend/src/app/features/accounts/models/accounts.models.ts`
- `frontend/crm-frontend/src/app/features/accounts/services/voucher.service.ts`
- `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.ts`
- `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.html`
- `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.scss`
- `frontend/crm-frontend/src/app/features/accounts/services/account-expense.service.ts`
- `frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.ts`
- `frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.html`
- `frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.scss`

Frontend tests to create:

- `frontend/crm-frontend/tests/accounts-voucher-attachments-frontend.test.mjs`
- `frontend/crm-frontend/tests/accounts-expense-attachments-frontend.test.mjs`

---
### Task 1: Git Ownership and Baseline Verification

**Files:**
- Read only: root `.git`
- Read only: `backend/server/.git`
- Read only: current Accounts frontend/backend tests

**Interfaces:**
- Consumes: approved design branch
- Produces: isolated implementation worktree and verified Git ownership boundary

- [ ] **Step 1: Inspect Git ownership before backend edits**

Run from repository root:

```powershell
git rev-parse --show-toplevel
Test-Path ".git"
Test-Path "backend\server\.git"
git status -sb
```

Expected:

- root repository resolves to CRM-GitHub-Check
- working tree is clean before implementation worktree creation
- nested backend Git state is explicitly known before any backend edit

- [ ] **Step 2: Create isolated implementation worktree**

```powershell
git worktree add `
  ".worktrees\accounts-transaction-attachments" `
  -b "feature/accounts-transaction-attachments" `
  "design/accounts-transaction-attachments"
```

Expected:

- isolated worktree is created successfully
- feature branch starts from the approved design/spec/plan branch

- [ ] **Step 3: Verify frontend Accounts baseline**

```powershell
cd ".worktrees\accounts-transaction-attachments\frontend\crm-frontend"
node --test ".\tests\accounts-*.test.mjs"
```

Expected:

- current Accounts tests pass
- baseline pass count is recorded before implementation

- [ ] **Step 4: Verify backend voucher baseline**

```powershell
cd "..\..\backend\server"
node --test ".\src\tests\*voucher*.test.js"
```

Expected:

- current voucher-related tests pass
- any pre-existing failure is investigated before feature implementation

---

### Task 2: Accounts-Native Upload Infrastructure and Voucher Schema

**Files:**
- Modify: `backend/server/src/middleware/upload.middleware.js`
- Modify: `backend/server/src/models/Voucher.js`
- Create: `backend/server/src/tests/voucher.attachments.test.js`

**Interfaces:**
- Produces: `uploadAccountsProof`
- Produces: `toPublicAccountsProofUrl(file)`
- Produces: `Voucher.attachments[]`

- [ ] **Step 1: Write failing Voucher attachment schema test**

Test a Voucher with attachment metadata:

```javascript
attachments: [
  {
    originalName: "proof.pdf",
    storedName: "generated-proof.pdf",
    fileUrl: "/uploads/accounts-proofs/generated-proof.pdf",
    storageKey: "accounts-proofs/generated-proof.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    uploadedBy: userId,
    uploadedAt: new Date(),
  },
]
```

Assertions:

```javascript
assert.equal(voucher.attachments.length, 1);
assert.equal(voucher.attachments[0].originalName, "proof.pdf");
assert.equal(voucher.attachments[0].mimeType, "application/pdf");
assert.equal(voucher.attachments[0].fileSize, 1024);
```

Also verify an existing Voucher remains valid when no attachments are supplied.

- [ ] **Step 2: Run the Voucher attachment test and verify RED**

```powershell
node --test ".\src\tests\voucher.attachments.test.js"
```

Expected:

- test fails because Voucher attachment schema is not implemented yet
- failure must be attachment-related, not an unrelated syntax/import error

- [ ] **Step 3: Add Accounts-native upload middleware**

Extend the existing shared upload middleware without changing current Purchase or Logistics upload behavior.

Allowed MIME types:

```javascript
new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
])
```

Allowed extensions:

```javascript
new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
])
```

Storage:

```javascript
const accountsProofStorage =
  makeStorage("accounts-proofs");
```

Uploader:

```javascript
export const uploadAccountsProof =
  multer({
    storage: accountsProofStorage,
    fileFilter: accountsProofFileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 5,
    },
  });
```

Filter rejection message:

```javascript
new ApiError(
  400,
  "Accounts proof must be JPG, JPEG, PNG or PDF."
)
```

Public URL helper:

```javascript
export const toPublicAccountsProofUrl =
  (file) =>
    file?.filename
      ? `/uploads/accounts-proofs/${file.filename}`
      : "";
```

Do not modify:

- existing Purchase Invoice uploader
- existing vendor payment proof uploader
- Logistics-specific upload middleware
- existing upload limits for other modules

- [ ] **Step 4: Add Voucher attachment sub-schema**

Add a focused sub-schema in ackend/server/src/models/Voucher.js:

```javascript
const voucherAttachmentSchema =
  new mongoose.Schema(
    {
      originalName: {
        type: String,
        trim: true,
        required: true,
        maxlength: 255,
      },
      storedName: {
        type: String,
        trim: true,
        required: true,
        maxlength: 255,
      },
      fileUrl: {
        type: String,
        trim: true,
        required: true,
        maxlength: 2000,
      },
      storageKey: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000,
      },
      mimeType: {
        type: String,
        trim: true,
        required: true,
        maxlength: 150,
      },
      fileSize: {
        type: Number,
        min: 0,
        default: 0,
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: true,
      id: false,
    }
  );
```

Add to Voucher schema:

```javascript
attachments: {
  type: [voucherAttachmentSchema],
  default: [],
},
```

Do not add attachment indexes and do not modify existing Voucher accounting fields.

- [ ] **Step 5: Run Voucher attachment test and verify GREEN**

```powershell
node --test ".\src\tests\voucher.attachments.test.js"
```

Expected:

- Voucher attachment schema test passes
- existing Voucher without attachments remains valid
- no Purchase or Logistics upload behavior regresses

- [ ] **Step 6: Commit Task 2**

```powershell
git add `
  backend/server/src/middleware/upload.middleware.js `
  backend/server/src/models/Voucher.js `
  backend/server/src/tests/voucher.attachments.test.js

git commit -m "feat(accounts): add voucher proof attachment schema"
```

---

### Task 3: Voucher Attachment API and Draft Lifecycle Protection

**Files:**
- Modify: `backend/server/src/routes/voucher.routes.js`
- Modify: `backend/server/src/controllers/voucher.controller.js`
- Modify: `backend/server/src/services/voucher.service.js`
- Modify: `backend/server/src/repositories/voucher.repository.js`
- Extend: `backend/server/src/tests/voucher.attachments.test.js`

**Interfaces:**
- Produces: `POST /accounting/vouchers/:voucherId/attachments`
- Produces: `DELETE /accounting/vouchers/:voucherId/attachments/:attachmentId`
- Multipart field: `proofFiles`

- [ ] **Step 1: Write failing draft-lifecycle attachment tests**

Maximum 5 attachments:

```javascript
await assert.rejects(
  () =>
    service.addAttachments({
      companyId,
      voucherId,
      userId,
      files: sixFiles,
    }),
  /Maximum 5/i
);
```

Posted Voucher delete protection:

```javascript
await assert.rejects(
  () =>
    service.removeAttachment({
      companyId,
      voucherId: postedVoucherId,
      attachmentId,
    }),
  /draft|editable|posted/i
);
```

Also test:

- wrong-company Voucher cannot be mutated
- attachment metadata comes from Multer file objects, not request body

- [ ] **Step 2: Run draft-lifecycle tests and verify RED**

```powershell
node --test ".\src\tests\voucher.attachments.test.js"
```

Expected:

- tests fail because add/remove attachment service methods do not exist yet
- failure must be lifecycle/API related, not an unrelated import error

- [ ] **Step 3: Add Voucher attachment service methods**

Implement:

```javascript
async addAttachments({
  companyId,
  voucherId,
  userId,
  files,
})
```

and:

```javascript
async removeAttachment({
  companyId,
  voucherId,
  attachmentId,
})
```

Repository methods required:

```javascript
async appendAttachments({
  companyId,
  voucherId,
  attachments,
  userId,
})

async removeAttachment({
  companyId,
  voucherId,
  attachmentId,
  userId,
})
```

Repository rules:

- both mutations must filter by `companyId`, `voucherId` and `status: "draft"`
- append uses `$push` with `$each` for validated attachment metadata
- remove uses `$pull` for the selected attachment `_id`
- both update `updatedBy`
- both return the updated Voucher using `.lean()`
- posted and void Vouchers cannot match these mutation filters

Service rules:

- Voucher must belong to the supplied company
- Voucher status must be `draft`
- existing plus incoming attachments must not exceed 5
- metadata must come only from Multer file objects
- generated URL must use `toPublicAccountsProofUrl(file)`
- request-body file paths or URLs must never be trusted
- removal must target the attachment `_id` inside that Voucher only

- [ ] **Step 4: Add Voucher attachment controller handlers**

Reuse the existing request helpers:

```javascript
companyIdForRequest(req)
userIdForRequest(req)
```

Upload controller must consume:

```javascript
req.files
```

and call:

```javascript
voucherService.addAttachments({
  companyId: companyIdForRequest(req),
  voucherId: req.params.voucherId,
  userId: userIdForRequest(req),
  files: req.files || [],
})
```

Delete controller must consume:

```javascript
req.params.voucherId
req.params.attachmentId
```

and call:

```javascript
voucherService.removeAttachment({
  companyId: companyIdForRequest(req),
  voucherId: req.params.voucherId,
  attachmentId: req.params.attachmentId,
})
```

- [ ] **Step 5: Add attachment routes before generic `/:voucherId` route**

```javascript
router.post(
  "/:voucherId/attachments",
  uploadAccountsProof.array("proofFiles", 5),
  uploadVoucherAttachments
);

router.delete(
  "/:voucherId/attachments/:attachmentId",
  deleteVoucherAttachment
);
```

The generic `GET /:voucherId` and `PATCH /:voucherId` routes must remain after these attachment routes.

- [ ] **Step 6: Run Voucher attachment lifecycle tests and verify GREEN**

```powershell
node --test ".\src\tests\voucher.attachments.test.js"
```

Expected:

- attachment upload lifecycle tests pass
- maximum 5 rule passes
- wrong-company protection passes
- posted Voucher attachment deletion is blocked
- Draft Voucher attachment removal works

- [ ] **Step 7: Commit Task 3**

```powershell
git add `
  backend/server/src/routes/voucher.routes.js `
  backend/server/src/controllers/voucher.controller.js `
  backend/server/src/services/voucher.service.js `
  backend/server/src/repositories/voucher.repository.js `
  backend/server/src/tests/voucher.attachments.test.js

git commit -m "feat(accounts): add draft voucher proof API"
```

If `voucher.repository.js` was not changed, omit it from `git add` rather than touching it unnecessarily.

---

### Task 4: Mandatory Proof Validation and Purchase-Origin Attachment Reuse

**Files:**
- Modify: `backend/server/src/services/voucher.service.js`
- Read/reuse only: `backend/server/src/models/PurchaseInvoice.js`
- Read/reuse only: existing Purchase handoff/source linkage
- Extend: `backend/server/src/tests/voucher.attachments.test.js`

**Interfaces:**
- Consumes: `Voucher.attachments`
- Consumes: `voucher.sourceModule`
- Consumes: `voucher.sourceReferenceId`
- Consumes: existing Purchase Invoice attachment metadata
- Produces: mandatory proof enforcement inside existing `postVoucher(...)` flow

- [ ] **Step 1: Write failing mandatory-proof posting tests**

Payment without proof must fail:

```javascript
await assert.rejects(
  () =>
    service.postVoucher({
      companyId,
      voucherId: paymentVoucherId,
      userId,
    }),
  /proof|attachment/i
);
```

Manual Purchase Bill without proof must fail:

```javascript
await assert.rejects(
  () =>
    service.postVoucher({
      companyId,
      voucherId: purchaseVoucherId,
      userId,
    }),
  /proof|attachment/i
);
```

Purchase-origin Purchase Bill with an existing Purchase Invoice attachment must be allowed:

```javascript
await assert.doesNotReject(
  () =>
    service.postVoucher({
      companyId,
      voucherId: purchaseOriginVoucherId,
      userId,
    })
);
```

Also verify these voucher types can still post without proof when their existing accounting rules are satisfied:

- Receipt
- Journal
- Contra
- Credit Note
- Debit Note
- Sales

- [ ] **Step 2: Run mandatory-proof tests and verify RED**

```powershell
node --test ".\src\tests\voucher.attachments.test.js"
```

Expected:

- Payment without proof is not yet blocked
- manual Purchase without proof is not yet blocked
- Purchase-origin attachment reuse is not yet implemented
- failures are specific to proof enforcement logic

- [ ] **Step 3: Add focused proof-resolution helper**

Add this service interface:

```javascript
async hasRequiredPostingProof({
  companyId,
  voucher,
  session = null,
})
```

Rules:

```javascript
if (voucher.attachments?.length > 0) {
  return true;
}
```

For a manual Payment or manual Purchase Voucher with no Accounts-native proof:

```javascript
return false;
```

For a Purchase-origin Purchase Voucher:

- resolve the linked Purchase Invoice using the existing source/handoff reference
- verify the Purchase Invoice belongs to the same company
- return true when the linked Purchase Invoice has at least one attachment
- do not copy, mutate, delete or re-upload Purchase-owned attachment metadata
- do not modify Purchase workflow or limits

- [ ] **Step 4: Enforce proof inside existing `postVoucher(...)` flow only**

Before journal creation/posting, enforce:

```javascript
if (
  voucher.voucherType === "payment" ||
  voucher.voucherType === "purchase"
) {
  const hasProof =
    await this.hasRequiredPostingProof({
      companyId,
      voucher,
      session,
    });

  if (!hasProof) {
    throw new Error(
      "Supporting document/proof is required before posting this voucher."
    );
  }
}
```

Do not change:

- debit/credit validation
- journal creation logic
- voucher numbering
- financial-year logic
- posting transaction boundaries
- void behavior
- optional-proof voucher posting behavior

- [ ] **Step 5: Run mandatory-proof tests and Voucher regressions GREEN**

```powershell
node --test ".\src\tests\voucher.attachments.test.js"
node --test ".\src\tests\*voucher*.test.js"
```

Expected:

- Payment without proof is blocked
- manual Purchase without proof is blocked
- Purchase-origin Purchase with existing Purchase Invoice proof is allowed
- optional-proof voucher types continue to follow existing posting rules
- existing Voucher regression tests pass

- [ ] **Step 6: Commit Task 4**

```powershell
git add `
  backend/server/src/services/voucher.service.js `
  backend/server/src/tests/voucher.attachments.test.js

git commit -m "feat(accounts): require proof before posting key vouchers"
```

Do not stage Purchase feature files for this commit.

---

### Task 5: Expense Proof Metadata and API

**Files:**
- Modify: `backend/server/src/models/AccountExpense.js`
- Modify: `backend/server/src/routes/accounting.routes.js`
- Create: `backend/server/src/tests/accountExpense.attachments.test.js`

**Interfaces:**
- Produces: `AccountExpense.attachments[]`
- Produces: `POST /accounting/expenses/:id/attachments`
- Produces: `DELETE /accounting/expenses/:id/attachments/:attachmentId`
- Reuses: `uploadAccountsProof`

- [ ] **Step 1: Write failing Expense attachment tests**

Test Expense attachment metadata persistence:

```javascript
assert.equal(expense.attachments.length, 1);
assert.equal(expense.attachments[0].originalName, "expense-proof.pdf");
assert.equal(expense.attachments[0].mimeType, "application/pdf");
```

Also test:

- maximum 5 attachments per Expense
- wrong-company Expense cannot be mutated
- attachment upload changes only attachment metadata
- amount/title/category/expenseType/status remain unchanged
- unsupported file types are rejected by Accounts upload middleware
- deleting a proof does not alter any financial Expense fields

- [ ] **Step 2: Run Expense attachment tests and verify RED**

```powershell
node --test ".\src\tests\accountExpense.attachments.test.js"
```

Expected:

- tests fail because AccountExpense attachment schema/API does not exist yet
- failure is attachment-related, not an unrelated routing/import error

- [ ] **Step 3: Add AccountExpense attachment sub-schema**

Add attachment metadata using the same field names as Voucher:

```javascript
{
  originalName,
  storedName,
  fileUrl,
  storageKey,
  mimeType,
  fileSize,
  uploadedBy,
  uploadedAt
}
```

Add:

```javascript
attachments: {
  type: [accountExpenseAttachmentSchema],
  default: [],
},
```

Do not modify existing Expense financial fields or add attachment indexes.

- [ ] **Step 4: Add narrow Expense attachment routes**

Add routes in `accounting.routes.js`:

```javascript
router.post(
  "/expenses/:id/attachments",
  uploadAccountsProof.array("proofFiles", 5),
  expenseAttachmentUploadHandler
);

router.delete(
  "/expenses/:id/attachments/:attachmentId",
  expenseAttachmentDeleteHandler
);
```

Upload handler rules:

- scope Expense by `companyId`
- reject when existing plus incoming attachments exceed 5
- derive metadata from Multer file objects only
- update only `attachments` and `updatedBy`
- leave amount, title, category, type, dates and status untouched

Delete handler rules:

- scope Expense by `companyId`
- remove only the selected attachment `_id`
- update only `attachments` and `updatedBy`
- never mutate financial Expense fields

- [ ] **Step 5: Preserve the existing Expense lifecycle and document proof enforcement boundary**

Current `AccountExpense.status` is a free-form String with default `Pending`.
There is no explicit Expense post/finalize/approve endpoint or status enum.

Therefore:

- do not invent a new Expense finalization endpoint
- do not invent Completed/Approved/Paid status semantics
- do not block arbitrary existing status updates based on guessed meanings
- implement proof upload/view/remove only
- keep Expense financial fields read-only in the Accounts proof UI
- retain the approved rule that Expense proof becomes mandatory when a real explicit completion/finalization boundary exists
- document this limitation in verification notes rather than silently changing Expense workflow

- [ ] **Step 6: Run Expense attachment tests and verify GREEN**

```powershell
node --test ".\src\tests\accountExpense.attachments.test.js"
```

Expected:

- Expense attachment metadata persists
- maximum 5 attachments is enforced
- wrong-company access is rejected
- upload/remove changes only attachment metadata and audit user
- existing Expense financial fields remain unchanged
- no artificial Expense finalization workflow is introduced

- [ ] **Step 7: Commit Task 5**

```powershell
git add `
  backend/server/src/models/AccountExpense.js `
  backend/server/src/routes/accounting.routes.js `
  backend/server/src/tests/accountExpense.attachments.test.js

git commit -m "feat(accounts): add expense proof attachments"
```

---

### Task 6: Voucher Frontend Attachment Models and Service API

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/accounts/models/accounts.models.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/services/voucher.service.ts`
- Create: `frontend/crm-frontend/tests/accounts-voucher-attachments-frontend.test.mjs`

**Interfaces:**
- Produces: `VoucherAttachment`
- Extends: `Voucher.attachments`
- Produces: `uploadAttachments(voucherId, files)`
- Produces: `removeAttachment(voucherId, attachmentId)`

- [ ] **Step 1: Write failing frontend attachment contract test**

The test must assert source support for:

- `VoucherAttachment`
- `attachments?: VoucherAttachment[]`
- `FormData`
- multipart field `proofFiles`
- `/attachments` upload endpoint
- attachment DELETE endpoint

- [ ] **Step 2: Run frontend contract test and verify RED**

```powershell
node --test ".\tests\accounts-voucher-attachments-frontend.test.mjs"
```

Expected:

- test fails because attachment model/service methods are not implemented yet
- failure is frontend contract-related, not an unrelated parser/import error

- [ ] **Step 3: Add `VoucherAttachment` model**

Add:

```typescript
export interface VoucherAttachment {
  _id?: string;
  originalName: string;
  storedName?: string;
  fileUrl: string;
  storageKey?: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string | null;
  uploadedAt?: string;
}
```

Extend Voucher with:

```typescript
attachments?: VoucherAttachment[];
```

- [ ] **Step 4: Add VoucherService upload method**

Add:

```typescript
uploadAttachments(
  voucherId: string,
  files: File[]
): Observable<Voucher> {
  const formData = new FormData();

  for (const file of files) {
    formData.append('proofFiles', file);
  }

  return this.api.post<Voucher>(
    `${this.basePath}/${this.encodeId(voucherId)}/attachments`,
    formData
  );
}
```

- [ ] **Step 5: Add VoucherService remove method**

Add:

```typescript
removeAttachment(
  voucherId: string,
  attachmentId: string
): Observable<Voucher> {
  return this.api.delete<Voucher>(
    `${this.basePath}/${this.encodeId(voucherId)}/attachments/${this.encodeId(attachmentId)}`
  );
}
```

- [ ] **Step 6: Run frontend attachment contract test and verify GREEN**

```powershell
node --test ".\tests\accounts-voucher-attachments-frontend.test.mjs"
```

Expected:

- VoucherAttachment model test passes
- uploadAttachments contract passes
- removeAttachment contract passes
- proofFiles FormData field is verified

- [ ] **Step 7: Commit Task 6**

```powershell
git add `
  frontend/crm-frontend/src/app/features/accounts/models/accounts.models.ts `
  frontend/crm-frontend/src/app/features/accounts/services/voucher.service.ts `
  frontend/crm-frontend/tests/accounts-voucher-attachments-frontend.test.mjs

git commit -m "feat(accounts): add voucher proof frontend API"
```

---

### Task 7: Voucher Entry Supporting Documents UI

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.html`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.scss`
- Extend: `frontend/crm-frontend/tests/accounts-voucher-attachments-frontend.test.mjs`

**Interfaces:**
- Consumes: `VoucherService.uploadAttachments(...)`
- Consumes: `VoucherService.removeAttachment(...)`
- Consumes: `Voucher.attachments`
- Displays Purchase-origin supporting documents as read-only when available

- [ ] **Step 1: Write failing Voucher Entry proof UI test**

The frontend test must assert the Voucher Entry source supports:

- `Supporting Documents / Proof` section
- accepted types PDF, JPG, JPEG and PNG
- maximum 10 MB per Accounts-native file
- maximum 5 Accounts-native files
- required-proof message for Payment and Purchase
- optional-proof message for other supported voucher types
- saved attachment View/Download actions
- Remove action only while Voucher is draft
- draft-first upload flow

- [ ] **Step 2: Run UI test and verify RED**

```powershell
node --test ".\tests\accounts-voucher-attachments-frontend.test.mjs"
```

Expected:

- test fails because Voucher Entry proof UI is not implemented yet
- failure is specific to missing attachment UI behavior

- [ ] **Step 3: Add client-side attachment validation helpers**

Allowed MIME types:

```typescript
readonly allowedProofTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png'
]);
```

Maximum size:

```typescript
readonly maxProofFileSize =
  10 * 1024 * 1024;
```

Maximum count:

```typescript
readonly maxProofFiles = 5;
```

Validation must reject:

- unsupported MIME type
- unsupported extension
- any file above 10 MB
- selection that would exceed 5 Accounts-native attachments

Validation must produce clear user-facing error messages without changing existing Voucher financial fields.

- [ ] **Step 4: Add Supporting Documents / Proof UI**

Add a Neumorphism-style proof section to Voucher Entry.

Required copy for Payment and Purchase:

```text
Proof required before posting
```

Optional copy for other supported voucher types:

```text
Supporting proof optional
```

The UI must display:

- file picker
- accepted types PDF, JPG, JPEG and PNG
- 10 MB per-file limit
- maximum 5 files
- selected unsaved files
- saved Accounts-native attachments
- filename
- file size
- View action
- Download action
- Remove action only while Voucher status is draft

Purchase-origin attachments must be displayed read-only when returned through the existing source/handoff relationship.
Accounts must not expose delete/edit actions for Purchase-owned attachments.

- [ ] **Step 5: Preserve draft-first upload workflow**

If the current Voucher has no `_id`:

1. save the Voucher using the existing create/update JSON workflow
2. receive the persisted Draft Voucher `_id`
3. upload selected files through `uploadAttachments(...)`
4. refresh local Voucher attachment state

Do not convert existing Voucher create/update requests to multipart.

Posting behavior:

- Payment Post button/action must be blocked client-side when no valid proof is available
- manual Purchase Post button/action must be blocked client-side when no valid proof is available
- Purchase-origin Purchase may rely on existing Purchase proof returned by backend/source linkage
- backend remains authoritative even when frontend validation passes

Removal behavior:

- allow removal only while Voucher is draft
- after successful removal refresh attachment state
- posted Voucher UI must not show a Remove action

- [ ] **Step 6: Run Voucher Entry proof UI tests and Accounts frontend regressions**

```powershell
node --test ".\tests\accounts-voucher-attachments-frontend.test.mjs"
node --test ".\tests\accounts-*.test.mjs"
```

Expected:

- Supporting Documents / Proof UI contract passes
- 10 MB/type/count validation passes
- draft-first upload behavior passes
- Payment mandatory-proof UI behavior passes
- saved attachment View/Download behavior passes
- Draft-only Remove behavior passes
- Purchase-owned proof remains read-only
- existing Accounts frontend regression tests pass

- [ ] **Step 7: Commit Task 7**

```powershell
git add `
  frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.ts `
  frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.html `
  frontend/crm-frontend/src/app/features/accounts/pages/voucher-entry/voucher-entry.component.scss `
  frontend/crm-frontend/tests/accounts-voucher-attachments-frontend.test.mjs

git commit -m "feat(accounts): add voucher supporting documents UI"
```

---

### Task 8: Expense Register Supporting Proof UI

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/accounts/services/account-expense.service.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.html`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.scss`
- Create: `frontend/crm-frontend/tests/accounts-expense-attachments-frontend.test.mjs`

**Interfaces:**
- Consumes: Expense `attachments[]` returned by backend
- Produces: `uploadAttachments(expenseId, files)`
- Produces: `removeAttachment(expenseId, attachmentId)`
- Keeps Expense Register financially read-only

- [ ] **Step 1: Write failing Expense proof frontend test**

The test must assert support for:

- Supporting Documents / Proof UI
- PDF, JPG, JPEG and PNG
- 10 MB per Accounts-native file
- maximum 5 attachments
- saved proof View/Download actions
- proof-only upload action
- proof-only remove action
- no amount/title/category/status editing introduced by this feature

- [ ] **Step 2: Run Expense frontend test and verify RED**

```powershell
node --test ".\tests\accounts-expense-attachments-frontend.test.mjs"
```

Expected:

- test fails because Expense attachment service/UI support is not implemented yet
- failure is specific to proof functionality

- [ ] **Step 3: Add AccountExpenseService attachment methods**

Add upload:

```typescript
uploadAttachments(
  expenseId: string,
  files: File[]
) {
  const formData = new FormData();

  for (const file of files) {
    formData.append('proofFiles', file);
  }

  return this.api.post(
    `/accounting/expenses/${encodeURIComponent(expenseId)}/attachments`,
    formData
  );
}
```

Add removal:

```typescript
removeAttachment(
  expenseId: string,
  attachmentId: string
) {
  return this.api.delete(
    `/accounting/expenses/${encodeURIComponent(expenseId)}/attachments/${encodeURIComponent(attachmentId)}`
  );
}
```

- [ ] **Step 4: Add proof-only controls to Expense Register**

Add a Neumorphism-style Supporting Documents / Proof section or row action.

UI rules:
- show existing Expense attachments
- allow PDF, JPG, JPEG and PNG only
- enforce 10 MB maximum per file
- enforce maximum 5 attachments
- show filename and file size
- provide View and Download actions
- provide proof Remove action through the dedicated attachment API
- refresh Expense attachment state after upload/remove

This feature must NOT add editing controls for:
- amount
- title
- category
- expense type
- expense date
- status
- accounting values

Expense Register remains financially read-only.

- [ ] **Step 5: Run Expense proof frontend test GREEN**

```powershell
node --test ".\tests\accounts-expense-attachments-frontend.test.mjs"
node --test ".\tests\accounts-*.test.mjs"
```

Expected:
- Expense proof UI contract passes
- upload/remove service contract passes
- type, size and count validation passes
- financial read-only behavior remains intact
- existing Accounts frontend tests pass

- [ ] **Step 6: Commit Task 8**

```powershell
git add `
  frontend/crm-frontend/src/app/features/accounts/services/account-expense.service.ts `
  frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.ts `
  frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.html `
  frontend/crm-frontend/src/app/features/accounts/pages/expense-register/expense-register.component.scss `
  frontend/crm-frontend/tests/accounts-expense-attachments-frontend.test.mjs

git commit -m "feat(accounts): add expense supporting proof UI"
```

---

### Task 9: Sales Invoice and Purchase Bill Proof Coverage

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/sales-invoices/sales-invoices.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/sales-invoices/sales-invoices.component.html`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/sales-invoices/sales-invoices.component.scss`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/purchase-bills/purchase-bills.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/purchase-bills/purchase-bills.component.html`
- Modify: `frontend/crm-frontend/src/app/features/accounts/pages/purchase-bills/purchase-bills.component.scss`
- Modify: `backend/server/src/services/voucher.service.js`
- Extend: `frontend/crm-frontend/tests/accounts-voucher-attachments-frontend.test.mjs`
- Extend: `backend/server/src/tests/voucher.attachments.test.js`

**Interfaces:**
- Sales Invoice proof is optional
- manual Purchase Bill proof is mandatory before posting
- Purchase-origin Purchase Bill reuses Purchase Invoice attachments
- Purchase-owned proof is read-only in Accounts
- no Purchase feature file is modified

- [ ] **Step 1: Extend RED tests for dedicated invoice/bill screens**

Frontend tests must assert:
- Sales Invoice page exposes Supporting Documents / Proof
- Sales Invoice proof remains optional
- manual Purchase Bill page exposes Supporting Documents / Proof
- manual Purchase Bill shows proof-required state
- Purchase-origin proof is displayed read-only
- Purchase-origin proof has View/Download but no Remove action

Backend tests must assert:
- voucher detail response exposes Purchase-origin attachments as response-only source proof data
- Purchase-owned attachment metadata is never persisted into `Voucher.attachments`
- same-company Purchase source validation is enforced

- [ ] **Step 2: Run extended tests and verify RED**

```powershell
cd ".\frontend\crm-frontend"
node --test ".\tests\accounts-voucher-attachments-frontend.test.mjs"
cd "..\..\backend\server"
node --test ".\src\tests\voucher.attachments.test.js"
```

- [ ] **Step 3: Expose Purchase-origin proof read-only from Voucher service**

When a Purchase Voucher is linked to a Purchase Invoice through the existing source handoff:
- load the linked Purchase Invoice for the same company
- map its existing attachments into response-only `sourceAttachments`
- do not copy them into Voucher storage
- do not allow Accounts delete/update of `sourceAttachments`

Response-only shape:

```javascript
sourceAttachments: [
  {
    _id,
    originalName,
    fileUrl,
    mimeType,
    fileSize,
    uploadedAt
  }
]
```

Extend the frontend Voucher model with:

```typescript
sourceAttachments?: VoucherAttachment[];
```

- [ ] **Step 4: Add Sales Invoice proof UI**

Use the existing Accounts Sales Invoice page and existing Voucher attachment API.

Rules:
- proof optional
- PDF/JPG/JPEG/PNG
- 10 MB each
- maximum 5
- View/Download saved proof
- Remove only while underlying Voucher is draft
- do not alter Sales accounting fields or posting logic

- [ ] **Step 5: Add Purchase Bill proof UI**

Manual Accounts Purchase Bill:
- use Accounts-native Voucher attachments
- require at least one proof before Post
- allow Draft save without proof

Purchase-origin Purchase Bill:
- display `sourceAttachments` read-only
- existing Purchase proof satisfies posting requirement
- no duplicate upload required
- no Accounts delete/edit action for Purchase-owned proof

- [ ] **Step 6: Run GREEN regressions**

```powershell
cd ".\frontend\crm-frontend"
node --test ".\tests\accounts-voucher-attachments-frontend.test.mjs"
node --test ".\tests\accounts-*.test.mjs"
cd "..\..\backend\server"
node --test ".\src\tests\voucher.attachments.test.js"
node --test ".\src\tests\*voucher*.test.js"
```

- [ ] **Step 7: Commit Task 9**

```powershell
git add frontend/crm-frontend/src/app/features/accounts backend/server/src/services/voucher.service.js backend/server/src/tests/voucher.attachments.test.js frontend/crm-frontend/tests/accounts-voucher-attachments-frontend.test.mjs
git commit -m "feat(accounts): cover invoice and bill supporting proofs"
```

Do not stage Purchase, Sales or Logistics feature directories outside Accounts.

---


### Task 10: Full Regression, Browser Verification and Git Safety

**Files:**
- Verify only; no new production files unless a verified regression requires a focused fix

**Interfaces:**
- Verifies all Accounts-native proof flows
- Verifies Purchase-origin proof reuse
- Verifies existing accounting behavior remains unchanged

- [ ] **Step 1: Run full backend Accounts attachment and Voucher regression suite**

```powershell
cd "backend\server"
node --test ".\src\tests\voucher.attachments.test.js"
node --test ".\src\tests\accountExpense.attachments.test.js"
node --test ".\src\tests\*voucher*.test.js"
```

Expected:
- all new proof tests pass
- all existing Voucher tests pass
- no Purchase, Sales or Logistics regression is introduced

- [ ] **Step 2: Run full Accounts frontend regression suite**

```powershell
cd "..\..\frontend\crm-frontend"
node --test ".\tests\accounts-voucher-attachments-frontend.test.mjs"
node --test ".\tests\accounts-expense-attachments-frontend.test.mjs"
node --test ".\tests\accounts-*.test.mjs"
```

Expected:
- all Accounts attachment contracts pass
- existing Accounts frontend tests pass

- [ ] **Step 3: Run Angular production build**

```powershell
npm run build
```

Expected:
- build completes successfully
- no new TypeScript/template errors from attachment work

- [ ] **Step 4: Browser verification checklist**

Verify manually without changing database structure:
- Payment Draft saves without proof
- Payment cannot Post without proof
- Payment posts after valid proof upload
- manual Purchase Bill Draft saves without proof
- manual Purchase Bill cannot Post without proof
- manual Purchase Bill posts after valid Accounts proof
- Purchase-origin Purchase Bill displays Purchase proof read-only
- Purchase-origin Purchase Bill does not require duplicate upload
- Receipt proof remains optional
- Journal proof remains optional
- Contra proof remains optional
- Credit Note proof remains optional
- Debit Note proof remains optional
- Sales Invoice proof remains optional
- Expense proof upload/view/remove works without financial edit controls
- PDF/JPG/JPEG/PNG are accepted
- unsupported file type is rejected
- file above 10 MB is rejected for Accounts-native proof
- sixth Accounts-native attachment is rejected
- saved proof remains visible after page reload
- posted Voucher does not expose proof Remove action
- wrong-company attachment mutation is rejected

- [ ] **Step 5: Verify upload persistence assumption**

Accounts-native files use the existing server disk upload pattern under:

```text
public/uploads/accounts-proofs/
```

Browser reload on the same deployment must retain access.
Do not claim redeploy-safe persistence unless the production host provides persistent filesystem storage.
If production storage is ephemeral, object-storage migration is a separate future infrastructure change and is not part of this feature.

- [ ] **Step 6: Inspect final scope before commit/push**

```powershell
cd "..\.."
git status --short
git diff --stat
git diff --name-only origin/main...HEAD
```

Expected:
- changes are limited to Accounts files, approved accounting backend files, tests and docs
- no Purchase feature file changed
- no Sales feature file outside Accounts changed
- no Logistics feature file changed
- no database migration/seed/reset file added

- [ ] **Step 7: Fetch remote and check divergence before integration**

```powershell
git fetch origin
git status -sb
git rev-list --left-right --count HEAD...origin/main
```

If origin/main moved while implementation was in progress, stop and inspect the incoming commits before integration.
Never force-push, reset or blindly pull.

---

## Completion Criteria

Implementation is complete only when:
- Accounts-native attachment upload works for approved transaction types
- Payment and manual Purchase Bill mandatory-proof posting rules are enforced server-side
- Purchase-origin Purchase Bill reuses Purchase attachments without duplication
- Expense proof support exists without inventing a financial completion workflow
- posted Voucher proof cannot be silently removed
- same-company authorization is enforced
- PDF/JPG/JPEG/PNG, 10 MB and maximum-5 Accounts-native rules are enforced
- existing Purchase attachment 1 MB behavior remains unchanged
- Sales/Logistics/Purchase feature code remains untouched
- no database migration, seed, reset, delete or rewrite occurs
- backend regressions pass
- frontend Accounts regressions pass
- Angular build passes
- browser verification passes

