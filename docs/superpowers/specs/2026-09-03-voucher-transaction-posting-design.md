# Voucher Transaction Posting Design

## Goal

Make Tally-style Voucher posting and voiding atomic with JournalEntry so accounting data can never become partially posted.

## Posting Flow

Draft Voucher
? create linked JournalEntry
? post JournalEntry
? mark Voucher posted
? save journalEntryId
? General Ledger derives movement from posted JournalEntry

All posting operations run inside one MongoDB transaction.

If any operation fails, the complete transaction rolls back.

## Void Flow

Posted Voucher
? load linked JournalEntry
? void JournalEntry
? mark Voucher void
? preserve audit information

Both operations run inside one MongoDB transaction.

No physical delete is allowed.

## Transaction Strategy

Use:

- mongoose.startSession()
- session.withTransaction(...)
- finally session.endSession()

Repositories and accounting services accept an optional `session`.

All database operations participating in posting/voiding must use the same session.

## Accounting Source

JournalEntry.referenceType = "voucher"

JournalEntry.referenceId = Voucher._id

JournalEntry.referenceNo = Voucher.voucherNumber

This preserves the Voucher ? JournalEntry audit link.

## Safety Rules

- Only draft Vouchers can be posted.
- Posted Vouchers are immutable.
- Only posted Vouchers can be voided.
- Voucher and JournalEntry must belong to the same company.
- No physical delete.
- No live POST/PATCH testing against the user's database.
- Unit/integration behavior will be tested using mocks.
- Existing Chart of Accounts, Journal and General Ledger behavior must remain compatible.

## Expected Atomic Guarantee

The system must never allow:

JournalEntry = posted
Voucher = draft

or:

JournalEntry = void
Voucher = posted

because of a partial operation.

## Future Compatibility

The transaction design must remain compatible with:

- Payment Voucher
- Receipt Voucher
- Contra Voucher
- Journal Voucher
- Sales Voucher
- Purchase Voucher
- Credit Note
- Debit Note
- Day Book
- Trial Balance
- Profit & Loss
- Balance Sheet
- GST reporting
- Tally export/integration
