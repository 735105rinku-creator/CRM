import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';


/* ============================================================
   OWNER COMMAND CENTER TYPES
============================================================ */

export interface OwnerOverviewPeriod {
  from: string;
  to: string;
  asOf: string;
}


export interface OwnerAccountBalance {
  amount?: number;
  type?: 'debit' | 'credit' | string;
}


export interface OwnerLedgerEntry {
  [key: string]: unknown;
}


export interface OwnerOutstandingAccount {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  nature?: string;
  status?: string;

  openingBalance?: OwnerAccountBalance;

  debitMovement?: number;
  creditMovement?: number;

  closingBalance?: OwnerAccountBalance;

  balanceType?: string | null;

  entries?: OwnerLedgerEntry[];

  outstanding?: number;
}


export interface OwnerOutstandingGroup {
  accounts: OwnerOutstandingAccount[];
  total: number;
}


export interface OwnerProfitLossAccount {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  nature?: string;

  periodDebit?: number;
  periodCredit?: number;

  amount?: number;

  [key: string]: unknown;
}


export interface OwnerProfitLossGroup {
  accounts: OwnerProfitLossAccount[];
  total: number;
}


export interface OwnerBalanceSheetAccount {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  nature?: string;

  balance?: number;
  amount?: number;

  [key: string]: unknown;
}


export interface OwnerBalanceSheetGroup {
  accounts: OwnerBalanceSheetAccount[];
  total: number;
}


export interface OwnerCashBankAccount {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  nature?: string;
  status?: string;

  openingBalance?: OwnerAccountBalance;

  entries?: OwnerLedgerEntry[];

  totalDebit?: number;
  totalCredit?: number;

  closingBalance?: OwnerAccountBalance;

  [key: string]: unknown;
}


export interface OwnerCashBankSummary {
  totalAccounts: number;
  totalOpening: number;
  totalDebit: number;
  totalCredit: number;
  totalClosing: number;
}


export interface OwnerFinancialOverview {
  revenue: number;

  expenses: number;

  netProfit: number;

  netLoss: number;

  profitMargin: number;

  result: string;

  cashBankBalance: number;

  receivable: number;

  payable: number;

  netOutstanding: number;

  assets: number;

  liabilities: number;

  equity: number;

  currentPeriodResult: {
    type?: string;
    amount?: number;
  };

  booksBalanced: boolean;

  balanceDifference: number;
}


export interface OwnerProfitLossReport {
  period?: {
    from?: string;
    to?: string;
  };

  income: OwnerProfitLossGroup;

  expenses: OwnerProfitLossGroup;

  netProfit: number;

  netLoss: number;

  result: string;
}


export interface OwnerBalanceSheetReport {
  asOf: string;

  assets: OwnerBalanceSheetGroup;

  liabilities: OwnerBalanceSheetGroup;

  equity: OwnerBalanceSheetGroup;

  currentPeriodResult: {
    type?: string;
    amount?: number;
  };

  totalLiabilitiesAndEquity: number;

  difference: number;

  isBalanced: boolean;
}


export interface OwnerCashBankReport {
  accounts: OwnerCashBankAccount[];

  summary: OwnerCashBankSummary;
}


export interface OwnerOutstandingReport {
  asOf: string;

  receivables: OwnerOutstandingGroup;

  payables: OwnerOutstandingGroup;
}


export interface CompanyOwnerOverview {
  generatedAt: string;

  period: OwnerOverviewPeriod;

  financial: OwnerFinancialOverview;

  reports: {
    profitLoss: OwnerProfitLossReport;

    balanceSheet: OwnerBalanceSheetReport;

    cashBank: OwnerCashBankReport;

    outstanding: OwnerOutstandingReport;
  };
}


export interface OwnerOverviewQuery {
  from?: string;
  to?: string;
  asOf?: string;
}


/* ============================================================
   OWNER COMMAND CENTER API SERVICE

   READ ONLY.

   This service does NOT:
   - post vouchers
   - create journal entries
   - approve Purchase records
   - hand off Logistics records
   - record Accounts payments
============================================================ */

@Injectable({
  providedIn: 'root'
})
export class CompanyOwnerOverviewService {

  private readonly api =
    inject(ApiService);


  getOverview(
    query: OwnerOverviewQuery = {}
  ): Observable<CompanyOwnerOverview> {

    const params =
      this.cleanQuery(
        query
      );


    return this.api.get<CompanyOwnerOverview>(
      '/companies/my/owner-overview',
      params
    );
  }


  /* ============================================================
     DATE HELPERS
  ============================================================ */

  currentFinancialYear(): OwnerOverviewPeriod {

    const today =
      this.localDateString(
        new Date()
      );


    return this.financialYearForDate(
      today
    );
  }


  financialYearForDate(
    value: string
  ): OwnerOverviewPeriod {

    const date =
      this.parseDate(
        value
      ) ||
      new Date();


    const year =
      date.getFullYear();


    const month =
      date.getMonth() +
      1;


    const startYear =
      month >= 4
        ? year
        : year - 1;


    const from =
      `${startYear}-04-01`;


    const financialYearEnd =
      `${startYear + 1}-03-31`;


    const today =
      this.localDateString(
        new Date()
      );


    const requestedDate =
      this.localDateString(
        date
      );


    const to =
      requestedDate >
      today
        ? today
        : requestedDate;


    return {
      from,

      to:

        to <
        from
          ? from
          : to,

      asOf:

        to >
        financialYearEnd
          ? financialYearEnd
          : to
    };
  }


  normalizeQuery(
    query: OwnerOverviewQuery
  ): OwnerOverviewQuery {

    const normalized: OwnerOverviewQuery = {};


    if (
      this.isDate(
        query.from
      )
    ) {

      normalized.from =
        query.from;
    }


    if (
      this.isDate(
        query.to
      )
    ) {

      normalized.to =
        query.to;
    }


    if (
      this.isDate(
        query.asOf
      )
    ) {

      normalized.asOf =
        query.asOf;
    }


    return normalized;
  }


  /* ============================================================
     PRIVATE HELPERS
  ============================================================ */

  private cleanQuery(
    query: OwnerOverviewQuery
  ): Record<string, string> {

    const normalized =
      this.normalizeQuery(
        query
      );


    const params:
      Record<string, string> = {};


    if (
      normalized.from
    ) {

      params['from'] =
        normalized.from;
    }


    if (
      normalized.to
    ) {

      params['to'] =
        normalized.to;
    }


    if (
      normalized.asOf
    ) {

      params['asOf'] =
        normalized.asOf;
    }


    return params;
  }


  private isDate(
    value?: string
  ): value is string {

    if (
      !value ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
    ) {

      return false;
    }


    const parsed =
      this.parseDate(
        value
      );


    if (
      !parsed
    ) {

      return false;
    }


    return this.localDateString(
      parsed
    ) ===
      value;
  }


  private parseDate(
    value?: string
  ): Date | null {

    if (
      !value
    ) {

      return null;
    }


    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/
        .exec(
          value
        );


    if (
      !match
    ) {

      return null;
    }


    const year =
      Number(
        match[1]
      );


    const month =
      Number(
        match[2]
      );


    const day =
      Number(
        match[3]
      );


    const date =
      new Date(
        year,
        month - 1,
        day
      );


    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {

      return null;
    }


    return date;
  }


  private localDateString(
    value: Date
  ): string {

    const year =
      value.getFullYear();


    const month =
      String(
        value.getMonth() +
        1
      )
        .padStart(
          2,
          '0'
        );


    const day =
      String(
        value.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return `${year}-${month}-${day}`;
  }
}