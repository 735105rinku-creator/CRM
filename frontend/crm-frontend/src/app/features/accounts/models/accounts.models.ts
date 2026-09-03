/* =========================================================
   COMMON ACCOUNT TYPES
========================================================= */

export type AccountNature =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'income'
  | 'expense';


export type AccountType =
  | 'cash'
  | 'bank'
  | 'accounts_receivable'
  | 'accounts_payable'
  | 'fixed_asset'
  | 'current_asset'
  | 'current_liability'
  | 'long_term_liability'
  | 'capital'
  | 'sales'
  | 'purchase'
  | 'direct_income'
  | 'indirect_income'
  | 'direct_expense'
  | 'indirect_expense'
  | 'tax'
  | 'other';


export type AccountStatus =
  | 'active'
  | 'inactive';


export type DebitCredit =
  | 'debit'
  | 'credit';


/* =========================================================
   CHART OF ACCOUNTS
========================================================= */

export interface ChartOfAccount {
  _id?: string;

  companyId?: string;

  accountCode: string;

  accountName: string;

  description?: string;

  nature: AccountNature;

  accountType: AccountType;

  parentAccountId?: string | null;

  parentAccountName?: string | null;

  openingBalance?: number;

  currentBalance?: number;

  openingBalanceType?: DebitCredit;

  isSystemAccount?: boolean;

  allowManualEntry?: boolean;

  status: AccountStatus;

  createdAt?: string;

  updatedAt?: string;
}


/* =========================================================
   CHART OF ACCOUNTS SUMMARY
========================================================= */

export interface ChartOfAccountNatureSummary {
  accountCount: number;

  openingBalance: number;
}


export interface ChartOfAccountsSummary {
  totalAccounts: number;

  asset: ChartOfAccountNatureSummary;

  liability: ChartOfAccountNatureSummary;

  equity: ChartOfAccountNatureSummary;

  income: ChartOfAccountNatureSummary;

  expense: ChartOfAccountNatureSummary;
}


/* =========================================================
   ACCOUNT GROUP
========================================================= */

export interface AccountGroup {
  key: AccountNature;

  label: string;

  description: string;

  normalBalance: DebitCredit;
}


/* =========================================================
   CREATE ACCOUNT PAYLOAD
========================================================= */

export interface CreateChartOfAccountPayload {
  accountCode: string;

  accountName: string;

  description?: string;

  nature: AccountNature;

  accountType: AccountType;

  parentAccountId?: string | null;

  openingBalance?: number;

  openingBalanceType?: DebitCredit;

  status?: AccountStatus;
}


/* =========================================================
   UPDATE ACCOUNT PAYLOAD
========================================================= */

export interface UpdateChartOfAccountPayload {
  accountName?: string;

  description?: string;

  accountType?: AccountType;

  parentAccountId?: string | null;

  status?: AccountStatus;
}


/* =========================================================
   JOURNAL ENTRY TYPES
========================================================= */

export type JournalEntryStatus =
  | 'draft'
  | 'posted'
  | 'void';


/*
 * Backward-compatible alias.
 *
 * Existing frontend files that still import JournalStatus
 * will continue compiling while JournalEntryStatus becomes
 * the canonical type.
 */

export type JournalStatus =
  JournalEntryStatus;


export type JournalReferenceType =
  | 'manual'
  | 'sales_invoice'
  | 'receipt'
  | 'credit_note'
  | 'purchase_bill'
  | 'payment'
  | 'debit_note'
  | 'expense'
  | 'opening_balance'
  | 'adjustment';


export type JournalSortField =
  | 'journalNumber'
  | 'journalDate'
  | 'status'
  | 'referenceType'
  | 'totalDebit'
  | 'totalCredit'
  | 'createdAt'
  | 'updatedAt';


export type JournalSortOrder =
  | 'asc'
  | 'desc';


/* =========================================================
   JOURNAL ENTRY LINE
========================================================= */

export interface JournalEntryLine {
  _id?: string;

  accountId: string;

  accountCode?: string;

  accountName?: string;

  description?: string;

  debit: number;

  credit: number;
}


/* =========================================================
   JOURNAL ENTRY
========================================================= */

export interface JournalEntry {
  _id?: string;

  companyId?: string;

  journalNumber: string;

  journalDate: string;

  narration?: string;

  referenceType: JournalReferenceType;

  referenceId?: string | null;

  referenceNo?: string;

  status: JournalEntryStatus;

  totalDebit: number;

  totalCredit: number;

  lines: JournalEntryLine[];

  createdBy?: string | null;

  updatedBy?: string | null;

  postedBy?: string | null;

  postedAt?: string | null;

  voidedBy?: string | null;

  voidedAt?: string | null;

  voidReason?: string;

  createdAt?: string;

  updatedAt?: string;
}


/* =========================================================
   JOURNAL ENTRY LINE PAYLOAD
========================================================= */

export interface JournalEntryLinePayload {
  accountId: string;

  description?: string;

  debit: number;

  credit: number;
}


/* =========================================================
   CREATE JOURNAL ENTRY PAYLOAD
========================================================= */

export interface CreateJournalEntryPayload {
  journalDate: string;

  narration?: string;

  referenceType?: JournalReferenceType;

  referenceId?: string | null;

  referenceNo?: string;

  lines: JournalEntryLinePayload[];
}


/* =========================================================
   UPDATE JOURNAL ENTRY PAYLOAD
========================================================= */

export interface UpdateJournalEntryPayload {
  journalDate?: string;

  narration?: string;

  referenceType?: JournalReferenceType;

  referenceId?: string | null;

  referenceNo?: string;

  lines?: JournalEntryLinePayload[];
}


/* =========================================================
   JOURNAL ENTRY QUERY
========================================================= */

export interface JournalEntryQuery {
  search?: string;

  status?: JournalEntryStatus;

  referenceType?: JournalReferenceType;

  accountId?: string;

  from?: string;

  to?: string;

  sortBy?: JournalSortField;

  sortOrder?: JournalSortOrder;
}


/* =========================================================
   VOID JOURNAL ENTRY PAYLOAD
========================================================= */

export interface VoidJournalEntryPayload {
  reason: string;
}


/* =========================================================
   LEDGER ENTRY
========================================================= */

export interface LedgerEntry {
  _id?: string;

  companyId?: string;

  accountId: string;

  accountCode?: string;

  accountName?: string;

  transactionDate: string;

  voucherNumber?: string;

  journalId?: string;

  referenceNumber?: string;

  narration?: string;

  debit: number;

  credit: number;

  runningBalance: number;

  balanceType?: DebitCredit;

  sourceModule?:
    | 'accounts'
    | 'crm'
    | 'hrm'
    | 'logistics'
    | 'system';

  sourceReferenceId?: string | null;

  createdAt?: string;
}


/* =========================================================
   LEDGER FILTER
========================================================= */

export interface LedgerFilter {
  accountId?: string;

  accountCode?: string;

  fromDate?: string;

  toDate?: string;

  search?: string;

  page?: number;

  limit?: number;
}


/* =========================================================
   LEDGER SUMMARY
========================================================= */

export interface LedgerSummary {
  openingBalance: number;

  totalDebit: number;

  totalCredit: number;

  closingBalance: number;

  balanceType?: DebitCredit;
}


/* =========================================================
   LEDGER RESPONSE
========================================================= */

export interface LedgerResponse {
  entries: LedgerEntry[];

  summary: LedgerSummary;

  total?: number;

  page?: number;

  limit?: number;

  totalPages?: number;
}


/* =========================================================
   TRIAL BALANCE
========================================================= */

export interface TrialBalanceRow {
  accountId: string;

  accountCode: string;

  accountName: string;

  nature: AccountNature;

  debit: number;

  credit: number;
}


export interface TrialBalance {
  rows: TrialBalanceRow[];

  totalDebit: number;

  totalCredit: number;

  difference: number;
}


/* =========================================================
   ACCOUNT BALANCE
========================================================= */

export interface AccountBalance {
  accountId: string;

  accountCode?: string;

  accountName?: string;

  balance: number;

  balanceType: DebitCredit;
}


/* =========================================================
   CUSTOMER LEDGER
========================================================= */

export interface CustomerLedgerSummary {
  customerId?: string;

  customerName?: string;

  openingBalance: number;

  invoiceAmount: number;

  receipts: number;

  creditNotes: number;

  outstandingBalance: number;
}


/* =========================================================
   VENDOR LEDGER
========================================================= */

export interface VendorLedgerSummary {
  vendorId?: string;

  vendorName?: string;

  openingBalance: number;

  billAmount: number;

  payments: number;

  debitNotes: number;

  outstandingBalance: number;
}


/* =========================================================
   ACCOUNTS DASHBOARD SUMMARY
========================================================= */

export interface AccountsDashboardSummary {
  totalReceivable: number;

  totalPayable: number;

  totalIncome: number;

  totalExpense: number;

  cashBalance: number;

  bankBalance: number;

  netProfit: number;
}


/* =========================================================
   API RESPONSE
========================================================= */

export interface AccountsApiResponse<T> {
  success?: boolean;

  statusCode?: number;

  message?: string;

  data: T;
}


/* =========================================================
   PAGINATION
========================================================= */

export interface AccountsPaginationMeta {
  page: number;

  limit: number;

  total: number;

  totalPages: number;
}