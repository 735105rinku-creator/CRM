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
   GENERAL LEDGER BALANCE
========================================================= */

export interface LedgerBalance {
  amount: number;

  type:
    | 'debit'
    | 'credit';
}


/* =========================================================
   GENERAL LEDGER ACCOUNT
========================================================= */

export interface GeneralLedgerAccount {
  _id?: string;

  accountId: string;

  accountCode: string;

  accountName: string;

  accountType?: AccountType;

  nature?: AccountNature;

  status?: AccountStatus;

  openingBalance: LedgerBalance;

  totalDebit: number;

  totalCredit: number;

  closingBalance: LedgerBalance;
}


/* =========================================================
   GENERAL LEDGER SUMMARY
========================================================= */

export interface GeneralLedgerSummary {
  totalAccounts: number;

  totalDebit: number;

  totalCredit: number;
}


/* =========================================================
   GENERAL LEDGER RESPONSE
========================================================= */

export interface GeneralLedgerResponse {
  accounts: GeneralLedgerAccount[];

  summary: GeneralLedgerSummary;
}


/* =========================================================
   TRIAL BALANCE
========================================================= */

export interface TrialBalancePeriod {
  from: string;
  to: string;
}

export interface TrialBalanceAmount {
  debit: number;
  credit: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  nature: AccountNature;
  accountType?: AccountType;
  openingBalance: TrialBalanceAmount;
  periodDebit: number;
  periodCredit: number;
  closingBalance: TrialBalanceAmount;
}

export interface TrialBalanceTotals {
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  difference: number;
  isBalanced: boolean;
}

export interface TrialBalance {
  period: TrialBalancePeriod;
  accounts: TrialBalanceRow[];
  totals: TrialBalanceTotals;
}

/* =========================================================
   PROFIT & LOSS
========================================================= */

export interface ProfitLossAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  nature: AccountNature;
  accountType?: string;
  status?: AccountStatus;
  periodDebit: number;
  periodCredit: number;
  amount: number;
}

export interface ProfitLossSection {
  accounts: ProfitLossAccount[];
  total: number;
}

export interface ProfitLossReport {
  companyId?: string;
  period: TrialBalancePeriod;
  income: ProfitLossSection;
  expenses: ProfitLossSection;
  netProfit: number;
  netLoss: number;
  result: 'profit' | 'loss' | 'break-even';
}
/* =========================================================
   BALANCE SHEET
========================================================= */

export interface BalanceSheetAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  nature: AccountNature;
  accountType?: string;
  status?: AccountStatus;
  closingBalance: number;
  amount: number;
}

export interface BalanceSheetSection {
  accounts: BalanceSheetAccount[];
  total: number;
}

export interface BalanceSheetPeriodResult {
  type: 'profit' | 'loss' | 'break-even';
  amount: number;
}

export interface BalanceSheetReport {
  companyId?: string;
  asOf: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  currentPeriodResult: BalanceSheetPeriodResult;
  totalLiabilitiesAndEquity: number;
  difference: number;
  isBalanced: boolean;
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

/* =========================================================
   ACCOUNT PARTY MASTER
========================================================= */

export type AccountPartyType =
  | 'customer'
  | 'vendor';


export interface AccountParty {
  _id?: string;

  companyId?: string;

  partyType: AccountPartyType;

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

  status: AccountStatus;

  createdAt?: string;

  updatedAt?: string;
}


/* =========================================================
   CREATE ACCOUNT PARTY
========================================================= */

export interface CreateAccountPartyPayload {
  accountCode: string;

  accountName: string;

  description?: string;

  parentAccountId?: string | null;

  openingBalance?: number;

  openingBalanceType?: DebitCredit;

  status?: AccountStatus;
}


/* =========================================================
   UPDATE ACCOUNT PARTY

   accountCode, opening balance, nature and accountType
   are intentionally immutable after creation.
========================================================= */

export interface UpdateAccountPartyPayload {
  accountName?: string;

  description?: string;

  parentAccountId?: string | null;

  status?: AccountStatus;
}


/* =========================================================
   ACCOUNT PARTY QUERY
========================================================= */

export interface AccountPartyQuery {
  search?: string;

  status?: AccountStatus;
}

/* =========================================================
   CASH / BANK BOOK
========================================================= */

export interface CashBankBalance {
  amount: number;

  type: DebitCredit;
}


export interface CashBankEntry {
  journalDate: string;

  journalNumber: string;

  narration: string;

  debit: number;

  credit: number;

  runningBalance: number;

  balanceType: DebitCredit;
}


export interface CashBankAccount {
  accountId: string;

  accountCode: string;

  accountName: string;

  accountType: 'cash' | 'bank';

  nature: AccountNature;

  status: AccountStatus;

  openingBalance: CashBankBalance;

  entries: CashBankEntry[];

  totalDebit: number;

  totalCredit: number;

  closingBalance: CashBankBalance;
}


export interface CashBankSummary {
  totalAccounts: number;

  totalOpening: number;

  totalDebit: number;

  totalCredit: number;

  totalClosing: number;
}


export interface CashBankBookReport {
  accounts: CashBankAccount[];

  summary: CashBankSummary;
}


/* =========================================================
   OUTSTANDING REPORT
========================================================= */

export interface OutstandingBalance {
  amount: number;
  type: DebitCredit;
}


export interface OutstandingEntry {
  journalNumber: string;
  journalDate: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: DebitCredit;
}


export interface OutstandingAccount {
  accountId: string;
  accountCode: string;
  accountName: string;

  accountType:
    | 'accounts_receivable'
    | 'accounts_payable';

  openingBalance: OutstandingBalance;

  debitMovement: number;
  creditMovement: number;

  closingBalance: OutstandingBalance;

  entries: OutstandingEntry[];

  outstanding: number;
}


export interface OutstandingSection {
  accounts: OutstandingAccount[];
  total: number;
}


export interface OutstandingReport {
  companyId?: string;
  asOf: string;

  receivables: OutstandingSection;
  payables: OutstandingSection;
}

/* =========================================================
   GST REPORT
========================================================= */

export interface GstReportEntry {
  voucherId: string;

  voucherNumber: string;

  voucherType: string;

  voucherDate: string;

  accountId: string;

  accountCode: string;

  accountName: string;

  accountType: string;

  accountStatus: AccountStatus;

  debit: number;

  credit: number;

  taxAmount: number;
}


export interface GstTaxSection {
  total: number;

  entries: GstReportEntry[];
}


export type GstNetType =
  | 'payable'
  | 'receivable'
  | 'settled';


export interface GstNetResult {
  amount: number;

  type: GstNetType;
}


export interface GstReport {
  companyId?: string;

  from: string;

  to: string;

  outputTax: GstTaxSection;

  inputTax: GstTaxSection;

  netGst: GstNetResult;
}

/* =========================================================
   ACCOUNTING VOUCHERS
========================================================= */

export type VoucherType =
  | 'journal'
  | 'payment'
  | 'receipt'
  | 'contra'
  | 'sales'
  | 'purchase'
  | 'credit_note'
  | 'debit_note';


export type VoucherStatus =
  | 'draft'
  | 'posted'
  | 'void';


export type VoucherSortField =
  | 'voucherNumber'
  | 'voucherDate'
  | 'voucherType'
  | 'financialYear'
  | 'status'
  | 'totalDebit'
  | 'totalCredit'
  | 'createdAt'
  | 'updatedAt';


export type VoucherSortOrder =
  | 'asc'
  | 'desc';


export interface VoucherLine {
  _id?: string;

  accountId: string;

  accountCode?: string;

  accountName?: string;

  description?: string;

  debit: number;

  credit: number;
}


export interface VoucherAttachment {
  _id?: string;

  originalName: string;

  storedName?: string;

  fileUrl: string;

  storageKey?: string;

  mimeType: string;

  fileSize: number;

  uploadedBy?: string | null;

  uploadedAt?: string | null;
}

export interface Voucher {
  _id?: string;

  companyId?: string;

  voucherNumber: string;

  voucherType: VoucherType;

  voucherDate: string;

  financialYear?: string;

  narration?: string;

  referenceNo?: string;

  referenceDate?: string | null;

  partyAccountId?: string | null;

  partyAccountCode?: string;

  partyAccountName?: string;

  status: VoucherStatus;

  totalDebit: number;

  totalCredit: number;

  lines: VoucherLine[];

  attachments?: VoucherAttachment[];

  sourceModule?: string | null;

  sourceReferenceId?: string | null;

  journalEntryId?: string | null;

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


export interface VoucherLinePayload {
  accountId: string;

  description?: string;

  debit: number;

  credit: number;
}


export interface CreateVoucherPayload {
  voucherType: VoucherType;

  voucherDate: string;

  narration?: string;

  referenceNo?: string;

  referenceDate?: string | null;

  partyAccountId?: string | null;

  lines: VoucherLinePayload[];
}


export interface UpdateVoucherPayload {
  voucherType?: VoucherType;

  voucherDate?: string;

  narration?: string;

  referenceNo?: string;

  referenceDate?: string | null;

  partyAccountId?: string | null;

  lines?: VoucherLinePayload[];
}


export interface VoucherQuery {
  search?: string;

  voucherType?: VoucherType;

  status?: VoucherStatus;

  financialYear?: string;

  from?: string;

  to?: string;

  sortBy?: VoucherSortField;

  sortOrder?: VoucherSortOrder;
}


export interface VoidVoucherPayload {
  reason: string;
}

/* =========================================================
   DAY BOOK
========================================================= */

export type DayBookVoucherType =
  | 'journal'
  | 'payment'
  | 'receipt'
  | 'contra'
  | 'sales'
  | 'purchase'
  | 'credit_note'
  | 'debit_note';

export type DayBookSortOrder =
  | 'asc'
  | 'desc';

export interface DayBookLine {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface DayBookRow {
  journalEntryId: string;
  journalDate: string;
  displayType: string;
  voucherType?: DayBookVoucherType | string | null;
  voucherNumber?: string | null;
  journalNumber?: string | null;
  referenceType?: string | null;
  referenceNo?: string | null;
  narration?: string | null;
  totalDebit: number;
  totalCredit: number;
  lines: DayBookLine[];
}

export interface DayBookSummary {
  voucherCount: number;
  totalDebit: number;
  totalCredit: number;
}

export interface DayBookPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DayBookPeriod {
  from: string;
  to: string;
}

export interface DayBookFilters {
  voucherType?: string | null;
  sort?: DayBookSortOrder | string;
}

export interface DayBookReport {
  period: DayBookPeriod;
  filters: DayBookFilters;
  rows: DayBookRow[];
  summary: DayBookSummary;
  pagination: DayBookPagination;
}

export interface DayBookQuery {
  from?: string;
  to?: string;
  voucherType?: DayBookVoucherType | '';
  sort?: DayBookSortOrder;
  page?: number;
  limit?: number;
}


export interface PurchasePaymentAllocationOption {
  purchaseInvoiceId: string;
  vendorName: string;
  vendorInvoiceNumber: string;
  invoiceDate: string;
  poNumber: string;
  invoiceTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  accountsVoucherNumber: string;
}
