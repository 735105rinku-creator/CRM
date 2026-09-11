# Accounts Transaction Attachments Design

Date: 2026-09-11
Module: Accounts
Status: Approved Design
Base: latest synchronized main
Scope: Accounts only

## 1. Objective

Add supporting-document and proof attachments to Accounts transactions so financial entries retain documentary evidence.

The feature must preserve existing accounting behavior and must not modify Sales or Logistics feature behavior.

## 2. Supported Accounts Transactions

Attachments will be supported for:

- Sales Invoice
- Purchase Bill
- Payment
- Receipt
- Expense
- Journal
- Contra
- Credit Note
- Debit Note

## 3. Mandatory vs Optional Proof

Proof is mandatory before posting/finalizing for:

- Purchase Bill
- Payment
- Expense

Proof is optional for:

- Sales Invoice
- Receipt
- Journal
- Contra
- Credit Note
- Debit Note

Draft records may be saved without proof.

Mandatory proof blocks posting/finalization, not Draft save.

## 4. File Rules

Accounts-native proof uploads support:

- PDF
- JPG
- JPEG
- PNG

Limits:

- Maximum 5 attachments per transaction
- Maximum 10 MB per file

Backend validation is authoritative.

Frontend validation must mirror backend rules for immediate user feedback.

## 5. Existing Purchase Attachment Flow

The latest Purchase module already supports vendor invoice attachments.

Purchase Invoice attachment behavior currently includes:

- PDF / JPG / JPEG / PNG
- Maximum 5 attachments per Purchase Invoice
- Actual files stored on server disk
- Metadata stored in MongoDB
- Accounts handoff support
- Attachment modification locked once Accounts handoff begins
- Purchase upload maximum currently 1 MB per file

This existing Purchase flow must be reused rather than duplicated.

Do not change Purchase attachment limits or Purchase feature code for this Accounts enhancement.

## 6. Purchase Bill Proof Reuse

Purchase Bills originating from Purchase Department handoff must reuse the existing Purchase Invoice attachments.

Accounts must not force users to upload the same vendor invoice/supporting documents again.

For a Purchase-origin bill:

- existing Purchase Invoice attachment(s) count as valid proof
- attachments remain sourced from the Purchase Invoice record
- Accounts may display/view/download those attachments
- Accounts must not silently edit or delete Purchase-owned attachments
- Purchase attachment ownership/lifecycle remains controlled by Purchase workflow

For a manual Accounts Purchase Bill with no Purchase Invoice handoff:

- at least one Accounts-native proof is required before posting
- Accounts-native attachment rules apply

## 7. Storage Strategy

Reuse the existing Multer-based backend upload infrastructure.

Accounts-native proof files will be stored under:

`public/uploads/accounts-proofs/`

Do not introduce:

- Cloudinary
- a new external storage provider
- binary MongoDB storage
- duplicated Purchase upload infrastructure

## 8. Accounts Attachment Metadata

Each Accounts-native attachment should store metadata similar to:

- originalName
- storedName
- fileUrl
- storageKey or relative path where appropriate
- mimeType
- fileSize
- uploadedBy
- uploadedAt

Actual binary file content must remain outside MongoDB.

## 9. Voucher Schema Extension

Add an `attachments` array to the existing Voucher model for Accounts-native proofs.

Applicable voucher types include:

- Sales
- Purchase
- Payment
- Receipt
- Journal
- Contra
- Credit Note
- Debit Note

Existing Voucher records without attachments must continue working normally.

No attachment index is required.

No migration is required.

## 10. AccountExpense Schema Extension

Add an `attachments` array to AccountExpense.

Existing expense records without attachments must remain valid.

No migration, seed, reset, delete or data rewrite is permitted.

## 11. Purchase-Origin Reference

Where a Purchase Invoice is handed off into Accounts, Accounts should rely on the existing source linkage already present in the voucher / purchase handoff flow.

Implementation must first inspect:

- sourceModule
- sourceReferenceId
- purchase invoice handoff metadata
- voucher purchase allocation / source linkage

Do not create duplicate references if the existing source linkage is sufficient.

## 12. Voucher Lifecycle Rules

### Draft

Draft vouchers may exist without attachments.

Accounts-native attachments may be added or removed while the voucher remains editable.

### Post

For manual Purchase Bill and Payment:

- at least one valid proof is required

For Purchase-origin Purchase Bills:

- at least one valid Purchase Invoice attachment OR valid Accounts-native attachment must exist

For optional-proof voucher types:

- posting may proceed without attachments

### Posted

Posted vouchers remain immutable according to the current accounting lifecycle.

Attachments associated with posted vouchers must remain viewable/downloadable.

Accounts-native proofs must not be silently removed from posted vouchers.

## 13. Expense Rules

The current Accounts Expense Register remains financially read-only.

This attachment feature must not turn it into a general expense editing screen.

Accounts may add/view proof only through the narrowest valid existing expense action.

Expense proof is mandatory for completion/finalization only where an existing backend lifecycle boundary exists.

If no explicit finalization action exists, implementation must not invent a new financial workflow solely for attachments.

## 14. Frontend UX

Use the existing Accounts Neumorphism/Newmorphism visual style.

Supported entry screens should expose a:

`Supporting Documents / Proof`

section.

UI capabilities should include:

- select files
- selected-file list
- filename
- size
- type indication
- remove before upload/posting where allowed
- view saved attachment
- download saved attachment
- required indicator where applicable
- clear validation messages

Frontend must reject:

- unsupported formats
- files above 10 MB for Accounts-native uploads
- more than 5 Accounts-native files per transaction

Purchase-origin files retain their Purchase-side constraints.

## 15. API Strategy

Prefer dedicated attachment endpoints rather than changing existing voucher JSON create/update contracts into multipart requests.

Recommended pattern:

1. Create or load Draft Voucher
2. Upload Accounts proof using dedicated attachment endpoint
3. Store attachment metadata on Voucher
4. Post Voucher through existing post endpoint

This minimizes regression risk in existing voucher creation/update behavior.

Potential Accounts voucher routes:

- POST `/accounting/vouchers/:voucherId/attachments`
- DELETE `/accounting/vouchers/:voucherId/attachments/:attachmentId`

DELETE must only work while the voucher is editable/draft.

Posted vouchers must not expose attachment deletion.

Attachment metadata should be returned through normal voucher responses.

## 16. Mandatory Proof Enforcement

Server-side enforcement must happen during the post/finalization action.

Payment:

- requires at least one Accounts-native attachment

Manual Purchase Bill:

- requires at least one Accounts-native attachment

Purchase-origin Purchase Bill:

- requires at least one existing Purchase Invoice attachment OR Accounts-native attachment

Expense:

- enforce at the narrowest existing valid lifecycle boundary

Frontend validation is secondary and must not be the only enforcement.

## 17. Security

Backend must validate:

- authenticated user
- company / tenant ownership
- voucher belongs to same company
- source Purchase Invoice belongs to same company
- Accounts access
- MIME type
- extension
- size
- maximum count
- voucher lifecycle status
- attachment ownership

Never trust frontend-provided file metadata.

Use generated filenames.

Prevent path traversal.

## 18. Purchase Boundary

Do not modify Purchase feature behavior for this task.

Accounts may read/reuse Purchase-origin attachment metadata through the existing handoff/source relationship.

Do not:

- change Purchase attachment limit
- change Purchase 1 MB file limit
- change Purchase UI
- change Purchase approval workflow
- change Purchase attachment deletion rules

## 19. Sales and Logistics Boundary

Do not modify:

- Sales feature code
- Logistics feature code

Only the smallest shared upload middleware extension is allowed where required for Accounts-native uploads.

Existing Logistics upload behavior must remain unchanged.

## 20. Database Approval

The user approved only limited schema additions required for attachment metadata.

Allowed:

- Voucher attachment array
- AccountExpense attachment array

Not allowed:

- migration
- seed
- reset
- delete existing data
- rewrite existing records
- unrelated schema changes
- database cleanup

## 21. Testing Strategy

Implementation must use TDD.

Backend tests should cover:

- accepted file formats
- rejected formats
- maximum 10 MB Accounts proof size
- maximum 5 Accounts proof files
- tenant isolation
- metadata persistence
- draft deletion
- posted deletion blocked
- Payment proof requirement
- manual Purchase Bill proof requirement
- Purchase-origin proof reuse
- optional-proof voucher posting
- existing voucher behavior regression

Frontend tests should cover:

- proof section rendering
- required vs optional state
- type validation
- size validation
- max count validation
- upload API call
- saved attachment rendering
- Purchase-origin attachments display
- download/view actions
- draft remove action
- mandatory proof posting block

## 22. Regression Verification

Before completion verify:

- targeted attachment tests
- full Accounts frontend test suite
- relevant voucher backend tests
- relevant Purchase handoff regression tests
- Angular production build
- manual browser flow

Purchase and Logistics existing behavior must remain intact.

## 23. Git Safety

Multiple developers work in the same repository.

Implementation must:

- start from freshly synchronized main
- use an isolated feature branch
- never force push
- never reset shared main
- never blindly pull/rebase
- fetch before merge
- check remote movement before push
- stop if origin/main moved unexpectedly
- reverify merged main before final push

The repository must also be checked for nested Git metadata before backend edits.

## 24. Success Criteria

The enhancement is complete only when:

- Accounts supports proof attachments on all listed transaction types
- mandatory rules are enforced server-side
- Purchase-origin invoices reuse existing Purchase attachments
- duplicate Purchase proof upload is not required
- Accounts-native files persist after reload
- posted proofs cannot be silently removed
- company isolation works
- existing accounting lifecycle remains intact
- Accounts tests pass
- relevant Purchase regression tests pass
- Angular build passes
- browser verification succeeds
- Sales and Logistics behavior remains unchanged

## 25. Approved Decisions

Approved by user:

- multiple attachments
- maximum 5 files
- Accounts-native maximum 10 MB per file
- PDF / JPG / JPEG / PNG
- mandatory Purchase Bill proof
- mandatory Payment proof
- mandatory Expense proof
- optional proof for remaining listed transactions
- limited Voucher and AccountExpense schema extensions
- no migration / reset / seed / delete / data rewrite
- reuse existing Purchase Invoice attachments in Accounts
- do not duplicate Purchase-origin vendor invoice proof