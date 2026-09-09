# Accounts Day Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tally-style, read-only Day Book API from posted JournalEntry accounting data.

**Architecture:** Posted JournalEntry remains the accounting source of truth. DayBookRepository performs company-scoped, posted-only reporting and linked Voucher enrichment. DayBookService owns Indian financial-year defaults, query validation, display mapping, totals/pagination normalization, and manual Journal Voucher fallback. Controller/routes expose only GET `/accounting/day-book`.

**Tech Stack:** Node.js, Express.js, MongoDB, Mongoose, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-05-accounts-day-book-design.md`

## Global Constraints
- Read-only: no Day Book writes, collection, migration, seed, reset, delete, or fake financial data.
- Posted JournalEntries only; draft/void excluded.
- Every query is company scoped.
- Default FY: 1 April-31 March.
- `from`/`to` inclusive; date authority `JournalEntry.journalDate`.
- Default sort desc; `sort=asc` supported.
- Pagination page 1, limit 25, max 100.
- Historical ledger names/codes come from JournalEntry line snapshots.
- Full-filter totals are independent of pagination.
- Existing Journal, Voucher, Chart of Accounts and General Ledger behavior unchanged.
- TDD RED -> GREEN for each production slice.

### Task 1: Repository
Create `backend/server/src/repositories/dayBook.repository.js`.
Test `backend/server/src/tests/dayBookRepository.test.js`.

Interface:
```js
async listPosted({ companyId, from, to, voucherType = null, sort = "desc", page = 1, limit = 25 })
```

Return:
```js
{ rows: [], total: 0, totals: { voucherCount: 0, totalDebit: 0, totalCredit: 0 } }
```

- [ ] RED tests capture aggregation and verify companyId, `status:"posted"`, inclusive dates, asc/desc sort, pagination, voucherType filtering, no `$merge`/`$out`.
- [ ] Run `node --test src/tests/dayBookRepository.test.js`; confirm RED.
- [ ] Implement `JournalEntry.aggregate()` with company/date/status match, read-only `$lookup` to `vouchers` by `referenceId` + company, normalized voucher type, optional filter, and `$facet` for paged rows plus full totals/count.
- [ ] Run repository test; confirm GREEN.
- [ ] Commit `feat(accounts): add day book repository`.

### Task 2: Service
Create `backend/server/src/services/dayBook.service.js`.
Test `backend/server/src/tests/dayBookService.test.js`.

Interface:
```js
export class DayBookService {
  constructor({ dayBookRepository } = {})
  resolveIndianFinancialYear(now = new Date())
  normalizeQuery(query = {}, now = new Date())
  mapRow(row)
  async getDayBook({ companyId, query = {}, now = new Date() } = {})
}
```

Allowed voucher types: `journal`, `payment`, `receipt`, `contra`, `sales`, `purchase`, `credit_note`, `debit_note`.

- [ ] RED tests cover FY before/after April, defaults, invalid date/range/sort/type/page/limit, manual Journal fallback, linked Voucher mapping, snapshot lines, totals/pagination.
- [ ] Run `node --test src/tests/dayBookService.test.js`; confirm RED.
- [ ] Implement strict `YYYY-MM-DD` validation, FY defaults, query normalization, companyId requirement, display mapping, voucher-number fallback, money normalization, repository call.
- [ ] Run service test; confirm GREEN.
- [ ] Commit `feat(accounts): add day book service`.

### Task 3: Controller
Create `backend/server/src/controllers/dayBook.controller.js`.
Test `backend/server/src/tests/dayBookController.test.js`.

Company resolution follows General Ledger:
```js
req.accountingAccess?.companyId || req.auth?.companyId || req.user?.companyId?._id || req.user?.companyId
```

- [ ] RED tests verify export, company/query forwarding, 200 ApiResponse, missing company 403.
- [ ] Run controller test; confirm RED.
- [ ] Implement `getDayBook` using General Ledger controller conventions and message `Day Book fetched successfully.`.
- [ ] Run controller test; confirm GREEN.
- [ ] Commit `feat(accounts): add day book controller`.

### Task 4: Route + Mount
Create `backend/server/src/routes/dayBook.routes.js`.
Modify `backend/server/src/routes/accounting.routes.js`.
Tests: `dayBookRoutes.test.js`, `accountingDayBookMount.test.js`.

- [ ] RED tests verify only `GET /`, no write methods, and mount `/day-book`.
- [ ] Run both tests; confirm RED.
- [ ] Implement `router.get("/", getDayBook)` and mount at `/day-book`.
- [ ] Run both tests; confirm GREEN.
- [ ] Commit `feat(accounts): expose day book report`.

### Task 5: Regression Gate
- [ ] Run all Day Book tests.
- [ ] Run accounting tests matching `dayBook|voucher|journal|generalLedger|chartOfAccount`.
- [ ] Run `npm test`.
- [ ] Run `node --check` on all four new production files.
- [ ] Run `git diff --check`, `git status --short`, `git diff --stat`.
- [ ] Verify Day Book router has no write routes.
- [ ] Confirm no model/schema/data-mutation or unrelated changes.
- [ ] Only after fresh zero-failure verification is the feature ready for fast-forward merge to main.

## Completion Gate
Day Book is complete only when Day Book tests, full accounting regression, and `npm test` pass; syntax/diff checks are clean; the route remains read-only; and the branch contains no unrelated or database-mutating changes.
