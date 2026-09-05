# Accounts Day Book Design

Date: 2026-09-05
Status: Approved for implementation planning

## Goal

Add a Tally-style, read-only Day Book report to the Accounts module.

The Day Book must represent authoritative posted accounting activity without creating a separate accounting source of truth.

## Accounting Source of Truth

Day Book will be JournalEntry-first.

Flow:

Voucher POST
? Posted JournalEntry
? General Ledger
? Day Book

A posted JournalEntry is the authoritative accounting movement.

Linked vouchers enrich Day Book rows with voucher metadata.

Direct/manual posted JournalEntries are included as Journal Vouchers.

Draft and void JournalEntries are excluded.

## Scope

Day Book v1 includes:

- Posted accounting transactions only
- Direct/manual posted Journal Entries
- Linked voucher metadata
- Current Indian financial year default date range
- From/To filtering
- Voucher type filtering
- Latest-first default sorting
- Ascending chronological sorting
- Pagination
- Transaction totals
- Expandable ledger lines
- Company isolation
- Read-only API

Day Book v1 does not include:

- Database writes
- New Day Book collection
- Seeds or migrations
- Editing vouchers
- Posting or voiding transactions
- Export/import
- Tally sync
- Frontend implementation in this phase

## Default Date Range

Default date range is the current Indian financial year:

1 April through 31 March.

Examples:

2026-04-01 through 2027-03-31

From and To are inclusive.

## Default Status

Only posted JournalEntries are returned.

Draft and void accounting entries must never be included in the default Day Book result.

No client status parameter will be required for v1.

## Default Sorting

Default:

latest transaction first

Equivalent semantic behavior:

sort=desc

Optional:

sort=asc

Ascending means oldest-to-newest chronological order.

## API

Read-only endpoint:

GET /accounting/day-book

Supported query parameters:

- from
- to
- voucherType
- sort
- page
- limit

Example:

GET /accounting/day-book?from=2026-04-01&to=2027-03-31&voucherType=sales&sort=desc&page=1&limit=25

## Pagination

Default page:

1

Default limit:

25

Maximum limit:

100

Response should expose pagination metadata sufficient for frontend navigation.

Expected fields:

- page
- limit
- total
- totalPages

## Day Book Row

Each transaction row represents one posted JournalEntry.

Expected shape:

- journalEntryId
- date
- displayType
- voucherType
- voucherNumber
- journalNumber
- referenceType
- referenceNo
- narration
- totalDebit
- totalCredit
- lines

## Ledger Line Shape

Each expandable line should expose:

- accountId
- accountCode
- accountName
- debit
- credit

Line data must come from the posted JournalEntry accounting snapshot where available.

The report must not depend on mutable current ledger names for historical accuracy when a JournalEntry snapshot already contains them.

## Voucher Mapping

If a posted JournalEntry is linked to a Voucher:

- use the linked voucher type
- use the linked voucher number
- expose a human-readable display type

Examples:

sales ? Sales Voucher
purchase ? Purchase Voucher
payment ? Payment Voucher
receipt ? Receipt Voucher
contra ? Contra Voucher
credit_note ? Credit Note
debit_note ? Debit Note
journal ? Journal Voucher

## Manual Journal Entries

A direct/manual posted JournalEntry without a linked Voucher must still appear.

Display behavior:

displayType = Journal Voucher

voucherNumber falls back to journalNumber when no Voucher number exists.

This prevents manual accounting entries from disappearing from Day Book.

## Date Authority

Day Book filtering and sorting use:

JournalEntry.journalDate

A linked Voucher voucherDate may be exposed as metadata later, but it is not the authoritative Day Book accounting date in v1.

## Totals

Day Book response should include report-level totals:

- voucherCount
- totalDebit
- totalCredit

Totals must correspond to the filtered result set, not only the current pagination page.

Because posted JournalEntries are balanced, report totalDebit and totalCredit should remain equal for valid accounting data.

## Company Isolation

Every repository query must be scoped by companyId.

The company identity must come from the authenticated accounting context used by existing Accounts routes.

Clients must not be allowed to switch company scope through query parameters.

## Repository

New file:

src/repositories/dayBook.repository.js

Responsibilities:

- query posted JournalEntries
- company scope
- inclusive date range
- optional voucher/reference type filtering support
- sorting
- pagination
- total count
- report totals
- return only fields required by Day Book

The repository must never create, update or delete accounting records.

## Service

New file:

src/services/dayBook.service.js

Responsibilities:

- resolve current Indian financial year defaults
- normalize and validate query options
- map JournalEntries into Day Book rows
- map voucher/reference types into display labels
- apply manual Journal Voucher fallback
- normalize totals and pagination response

The service must not recalculate General Ledger balances.

## Controller

New file:

src/controllers/dayBook.controller.js

Responsibilities:

- obtain companyId from authenticated accounting context
- pass validated report query to service
- return standard API response
- no write handlers

## Routes

New file:

src/routes/dayBook.routes.js

Required endpoint:

GET /

Mounted as:

/accounting/day-book

No POST, PATCH, PUT or DELETE routes are permitted.

## Accounting Router Mount

The existing Accounting route aggregator will mount Day Book under:

/day-book

The mounted public accounting path becomes:

GET /accounting/day-book

Existing Journal, Voucher, Chart of Accounts and General Ledger mounts must remain unchanged.

## Error Handling

Invalid query values should produce the existing application validation/error response style.

Examples:

- invalid date
- from after to
- unsupported voucher type
- invalid sort value
- page below 1
- limit below 1
- limit above 100

Missing accounting company context must use the existing authentication/company error handling pattern.

## Testing Strategy

Implementation must use TDD.

Initial RED tests should establish Day Book behavior before production implementation.

Coverage must verify:

1. Posted JournalEntries are included.
2. Draft JournalEntries are excluded.
3. Void JournalEntries are excluded.
4. Direct/manual posted JournalEntry appears as Journal Voucher.
5. Linked Voucher metadata is mapped.
6. Current Indian FY defaults are applied.
7. From date is inclusive.
8. To date is inclusive through end-of-day.
9. Default sorting is latest-first.
10. sort=asc returns chronological order.
11. Voucher type filter is respected.
12. Company scope is mandatory.
13. Pagination defaults are applied.
14. Maximum page size is enforced.
15. Report totals represent the full filtered set.
16. Ledger line snapshots are returned.
17. Controller forwards company/query correctly.
18. Route exposes GET only.
19. Accounting router mounts Day Book correctly.
20. No Day Book write route exists.

## Regression Requirements

Before merge:

- Day Book test suite passes.
- Existing General Ledger tests pass.
- Existing Journal tests pass.
- Existing Voucher tests pass.
- Existing Chart of Accounts tests pass.
- Full accounting regression passes.
- Existing npm test passes.
- git diff --check passes.

## Database Safety

This feature must not:

- create a new Day Book collection
- create sample financial transactions
- migrate data
- seed data
- modify existing accounting documents
- delete accounting documents

Tests should use mocks/unit contracts or other non-mutating techniques.

## Future Work

After Day Book backend is complete:

1. Trial Balance backend
2. Profit & Loss
3. Balance Sheet
4. Cash/Bank Book
5. Receivable/Payable outstanding
6. GST reports
7. Accounts report frontend
8. Tally export/import/integration

Day Book frontend will be implemented with the broader Accounts reporting UI so report screens share consistent filters, tables and Neumorphism styling.
