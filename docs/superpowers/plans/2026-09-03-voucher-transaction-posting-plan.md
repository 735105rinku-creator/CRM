# Voucher Transaction Posting Implementation Plan

> REQUIRED: Implement task-by-task using TDD: RED -> GREEN -> regression.

## Goal

Implement atomic Tally-style Voucher posting and voiding so Voucher and JournalEntry can never become inconsistent.

## Architecture

VoucherService owns the accounting workflow.

MongoDB session/transaction wraps all state changes:

Draft Voucher
-> JournalEntry create
-> JournalEntry post
-> Voucher post + journalEntryId

Void flow:

Posted Voucher
-> linked JournalEntry void
-> Voucher void

If any operation fails, MongoDB rolls back the whole transaction.

## Global Constraints

- Do not seed, reset, migrate, delete, or manually mutate the live database.
- Do not run live POST/PATCH voucher tests.
- No physical Voucher or JournalEntry delete.
- Posted Voucher must remain immutable.
- Preserve existing Journal and General Ledger behavior.
- General Ledger remains derived from posted JournalEntry.
- Use company-scoped queries everywhere.
- Tally-compatible audit trail must be preserved.

---

## Task 1: Transaction Dependency Contract

Files:
- Modify: src/services/voucher.service.js
- Test: src/tests/voucherService.test.js

Steps:

1. Add failing test proving `postVoucher()` starts one session.
2. Verify RED.
3. Inject a transaction/session provider into VoucherService.
4. Wrap posting workflow with `withTransaction`.
5. Ensure session always ends in `finally`.
6. Verify GREEN.

Expected contract:

- start session once
- withTransaction once
- endSession once
- same session flows through the posting operation

---

## Task 2: Voucher Repository Session Support

Files:
- Modify: src/repositories/voucher.repository.js
- Test: src/tests/voucherRepository.test.js

Methods requiring optional session:

- findById(...)
- postById(...)
- voidById(...)

Steps:

1. RED tests for optional session forwarding.
2. Add `session = null` parameters.
3. Attach session to Mongoose queries only when supplied.
4. Pass session to atomic update operations.
5. Run repository regression.

---

## Task 3: Journal Repository / Service Session Support

Files:
- Inspect/modify: src/repositories/journalEntry.repository.js
- Modify if required: src/services/journalEntry.service.js
- Test existing Journal service/repository tests.

Required operations:

- create JournalEntry with session
- fetch JournalEntry with session
- post JournalEntry with session
- void JournalEntry with session

Steps:

1. Write RED session-propagation tests.
2. Add optional session without breaking existing callers.
3. Preserve all current Journal validation.
4. Run complete Journal regression.

---

## Task 4: Atomic Voucher Posting

Files:
- Modify: src/services/voucher.service.js
- Test: src/tests/voucherService.test.js

Required flow:

1. Start Mongo session.
2. Run `withTransaction`.
3. Load company-scoped draft Voucher.
4. Create JournalEntry with:
   - referenceType = voucher
   - referenceId = voucher._id
   - referenceNo = voucher.voucherNumber
   - journalDate = voucher.voucherDate
   - narration = voucher.narration
   - lines = Voucher lines
5. Post JournalEntry.
6. Mark Voucher posted.
7. Store journalEntryId.
8. Commit automatically through transaction.
9. End session in finally.

Failure tests:

- Journal create fails -> Voucher stays unchanged.
- Journal post fails -> Voucher stays unchanged.
- Voucher post fails -> Journal transaction rolls back.
- already-posted Voucher rejected.
- missing Voucher rejected.

No live DB writes.

---

## Task 5: Atomic Voucher Void

Files:
- Modify: src/services/voucher.service.js
- Test: src/tests/voucherService.test.js

Required flow:

1. Start Mongo session.
2. Load posted Voucher.
3. Require journalEntryId.
4. Void linked JournalEntry using same session.
5. Mark Voucher void using same session.
6. Store user/time/reason audit fields.
7. Roll back everything on any failure.
8. End session.

Rules:

- draft Voucher cannot be voided.
- already-void Voucher cannot be voided.
- missing linked JournalEntry is an accounting integrity error.
- no physical delete.

---

## Task 6: Controller and Routes

Files:
- Modify: src/controllers/voucher.controller.js
- Modify: src/routes/voucher.routes.js
- Test:
  - src/tests/voucherController.test.js
  - src/tests/voucherRoutes.test.js

Endpoints:

POST /accounting/vouchers/:voucherId/post

POST /accounting/vouchers/:voucherId/void

Void body:

{
  "reason": "..."
}

Rules:

- company comes from accounting access context.
- user comes from authenticated request.
- no companyId accepted from client body.
- no delete endpoint.

---

## Task 7: Regression Verification

Run Voucher tests.

Run Journal tests.

Run General Ledger tests.

Run accounting route tests.

Run complete Accounts backend test group.

Expected:

- all existing tests remain GREEN
- new posting/void tests GREEN
- no live database mutation

---

## Task 8: Safe Read-only Runtime Verification

Allowed:

GET /accounting/vouchers

GET /accounting/journal-entries

GET /accounting/general-ledger

Not allowed during this phase:

POST/PATCH/VOID against live user database.

---

## Completion Criteria

Voucher posting is complete only when:

- posting is atomic
- voiding is atomic
- JournalEntry is linked to Voucher
- General Ledger derives posted movement
- no partial state is possible
- all regression tests pass
- no DB seed/reset/manual mutation occurred
