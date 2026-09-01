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
   JOURNAL ENTRY
========================================================= */

export type JournalStatus =
  | 'draft'
  | 'posted'
  | 'cancelled';


export interface JournalEntryLine {
  accountId: string;

  accountCode?: string;

  accountName?: string;

  description?: string;

  debit: number;

  credit: number;
}


export interface JournalEntry {
  _id?: string;

  companyId?: string;

  journalNumber: string;

  journalDate: string;

  referenceNumber?: string;

  narration?: string;

  lines: JournalEntryLine[];

  totalDebit: number;

  totalCredit: number;

  status: JournalStatus;

  sourceModule?:
    | 'accounts'
    | 'crm'
    | 'hrm'
    | 'logistics'
    | 'system';

  sourceReferenceId?: string | null;

  createdBy?: string;

  createdAt?: string;

  updatedAt?: string;
}


/* =========================================================
   CREATE JOURNAL PAYLOAD
========================================================= */

export interface CreateJournalEntryPayload {
  journalDate: string;

  referenceNumber?: string;

  narration?: string;

  lines: JournalEntryLine[];

  sourceModule?:
    | 'accounts'
    | 'crm'
    | 'hrm'
    | 'logistics'
    | 'system';

  sourceReferenceId?: string | null;
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