import {
  inject,
  Injectable
} from '@angular/core';

import {
  Observable
} from 'rxjs';

import {
  ApiService
} from '../../../core/services/api.service';

import {
  GeneralLedgerResponse
} from '../models/accounts.models';


/* =========================================================
   GENERAL LEDGER QUERY
========================================================= */

export interface GeneralLedgerQuery {
  search?: string;

  nature?: string;

  accountType?: string;

  status?: string;

  sortBy?: string;

  sortOrder?:
    | 'asc'
    | 'desc';
}


/* =========================================================
   ACCOUNT LEDGER RESPONSE

   Exact top-level structure returned by backend:
   GET /accounting/general-ledger/:accountId
========================================================= */

export interface AccountLedgerResponse {
  account: {
    _id?: string;

    accountCode?: string;

    accountName?: string;

    accountType?: string;

    nature?: string;

    status?: string;

    openingBalance?: number;

    openingBalanceType?:
      | 'debit'
      | 'credit';
  };

  openingBalance: {
    amount: number;

    type:
      | 'debit'
      | 'credit';
  };

  entries: AccountLedgerEntry[];

  totals: {
    debit: number;

    credit: number;
  };

  closingBalance: {
    amount: number;

    type:
      | 'debit'
      | 'credit';
  };
}


/* =========================================================
   ACCOUNT LEDGER ENTRY

   Backend returns posted Journal lines and appends:
   debit
   credit
   runningBalance
   balanceType
========================================================= */

export interface AccountLedgerEntry {
  _id?: string;

  journalEntryId?: string;

  journalNumber?: string;

  journalDate?: string;

  transactionDate?: string;

  accountId?: string;

  accountCode?: string;

  accountName?: string;

  description?: string;

  narration?: string;

  referenceType?: string;

  referenceId?: string | null;

  referenceNo?: string;

  debit: number;

  credit: number;

  runningBalance: number;

  balanceType:
    | 'debit'
    | 'credit';
}


/* =========================================================
   GENERAL LEDGER SERVICE
========================================================= */

@Injectable({
  providedIn: 'root'
})
export class GeneralLedgerService {

  /* =======================================================
     DEPENDENCIES
  ======================================================= */

  private readonly api =
    inject(
      ApiService
    );


  /* =======================================================
     API BASE

     Backend:
     /accounting/general-ledger
  ======================================================= */

  private readonly basePath =
    '/accounting/general-ledger';


  /* =======================================================
     GET GENERAL LEDGER

     GET
     /accounting/general-ledger
  ======================================================= */

  getGeneralLedger(
    query:
      GeneralLedgerQuery =
      {}
  ): Observable<GeneralLedgerResponse> {

    return this.api
      .get<GeneralLedgerResponse>(
        this.basePath,
        this.cleanQuery(
          query
        )
      );

  }


  /* =======================================================
     GET ACCOUNT LEDGER

     GET
     /accounting/general-ledger/:accountId
  ======================================================= */

  getAccountLedger(
    accountId:
      string,
    query:
      GeneralLedgerQuery =
      {}
  ): Observable<AccountLedgerResponse> {

    const normalizedAccountId =
      String(
        accountId ||
        ''
      )
        .trim();


    if (
      !normalizedAccountId
    ) {

      throw new Error(
        'Account ID is required.'
      );

    }


    return this.api
      .get<AccountLedgerResponse>(
        `${this.basePath}/${encodeURIComponent(
          normalizedAccountId
        )}`,
        this.cleanQuery(
          query
        )
      );

  }


  /* =======================================================
     QUERY NORMALIZATION
  ======================================================= */

  private cleanQuery(
    query:
      GeneralLedgerQuery
  ): Record<string, string> {

    const result:
      Record<string, string> =
      {};


    const search =
      String(
        query.search ||
        ''
      )
        .trim();


    if (
      search
    ) {

      result['search'] =
        search;

    }


    const nature =
      String(
        query.nature ||
        ''
      )
        .trim();


    if (
      nature
    ) {

      result['nature'] =
        nature;

    }


    const accountType =
      String(
        query.accountType ||
        ''
      )
        .trim();


    if (
      accountType
    ) {

      result['accountType'] =
        accountType;

    }


    const status =
      String(
        query.status ||
        ''
      )
        .trim();


    if (
      status
    ) {

      result['status'] =
        status;

    }


    const sortBy =
      String(
        query.sortBy ||
        ''
      )
        .trim();


    if (
      sortBy
    ) {

      result['sortBy'] =
        sortBy;

    }


    if (
      query.sortOrder ===
        'asc' ||
      query.sortOrder ===
        'desc'
    ) {

      result['sortOrder'] =
        query.sortOrder;

    }


    return result;

  }

}