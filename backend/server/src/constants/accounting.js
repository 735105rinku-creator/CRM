/* ============================================================
   ACCOUNT NATURES
============================================================ */

export const ACCOUNT_NATURES =
  Object.freeze([
    "asset",
    "liability",
    "equity",
    "income",
    "expense",
  ]);


/* ============================================================
   ACCOUNT TYPES
============================================================ */

export const ACCOUNT_TYPES =
  Object.freeze([
    "cash",
    "bank",

    "accounts_receivable",

    "accounts_payable",

    "fixed_asset",
    "current_asset",

    "current_liability",
    "long_term_liability",

    "capital",

    "sales",
    "purchase",

    "direct_income",
    "indirect_income",

    "direct_expense",
    "indirect_expense",

    "tax",

    "other",
  ]);


/* ============================================================
   ACCOUNT STATUS
============================================================ */

export const ACCOUNT_STATUSES =
  Object.freeze([
    "active",
    "inactive",
  ]);


/* ============================================================
   DEBIT / CREDIT
============================================================ */

export const DEBIT_CREDIT_TYPES =
  Object.freeze([
    "debit",
    "credit",
  ]);

  /* ============================================================
   JOURNAL ENTRY STATUS
============================================================ */

export const JOURNAL_STATUSES =
  Object.freeze([
    "draft",
    "posted",
    "void",
  ]);


/* ============================================================
   JOURNAL REFERENCE TYPES
============================================================ */

export const JOURNAL_REFERENCE_TYPES =
  Object.freeze([
    "manual",
    "sales_invoice",
    "receipt",
    "credit_note",
    "purchase_bill",
    "payment",
    "debit_note",
    "expense",
    "opening_balance",
    "adjustment",
  ]);


/* ============================================================
   JOURNAL NUMBER PREFIX
============================================================ */

export const JOURNAL_NUMBER_PREFIX =
  "JV";


/* ============================================================
   ACCOUNT TYPE → ACCOUNT NATURE

   This prevents invalid combinations such as:

   cash + liability
   sales + asset
   accounts_payable + income
============================================================ */

export const ACCOUNT_TYPE_NATURE =
  Object.freeze({

    /* ---------------- ASSETS ---------------- */

    cash:
      "asset",

    bank:
      "asset",

    accounts_receivable:
      "asset",

    fixed_asset:
      "asset",

    current_asset:
      "asset",


    /* ---------------- LIABILITIES ---------------- */

    accounts_payable:
      "liability",

    current_liability:
      "liability",

    long_term_liability:
      "liability",

    tax:
      "liability",


    /* ---------------- EQUITY ---------------- */

    capital:
      "equity",


    /* ---------------- INCOME ---------------- */

    sales:
      "income",

    direct_income:
      "income",

    indirect_income:
      "income",


    /* ---------------- EXPENSE ---------------- */

    purchase:
      "expense",

    direct_expense:
      "expense",

    indirect_expense:
      "expense",

    other:
      "expense",

  });


/* ============================================================
   NORMAL BALANCE

   Used later by Journal / Ledger / Trial Balance.
============================================================ */

export const NORMAL_BALANCE_BY_NATURE =
  Object.freeze({

    asset:
      "debit",

    liability:
      "credit",

    equity:
      "credit",

    income:
      "credit",

    expense:
      "debit",

  });