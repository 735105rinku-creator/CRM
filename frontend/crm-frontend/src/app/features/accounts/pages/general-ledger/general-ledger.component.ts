import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  finalize
} from 'rxjs';

import {
  AccountNature,
  AccountStatus,
  AccountType,
  GeneralLedgerAccount,
  GeneralLedgerSummary,
  LedgerBalance
} from '../../models/accounts.models';

import {
  AccountLedgerEntry,
  AccountLedgerResponse,
  GeneralLedgerQuery,
  GeneralLedgerService
} from '../../services/general-ledger.service';


/* =========================================================
   FILTER OPTION
========================================================= */

interface LedgerFilterOption {
  label: string;

  value: string;
}


/* =========================================================
   GENERAL LEDGER COMPONENT
========================================================= */

@Component({
  selector:
    'app-general-ledger',

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './general-ledger.component.html',

  styleUrl:
    './general-ledger.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class GeneralLedgerComponent
  implements OnInit {

  /* =======================================================
     DEPENDENCIES
  ======================================================= */

  private readonly generalLedgerService =
    inject(
      GeneralLedgerService
    );


  /* =======================================================
     PAGE STATE
  ======================================================= */

  readonly isLoading =
    signal(
      false
    );


  readonly errorMessage =
    signal(
      ''
    );


  readonly accounts =
    signal<
      GeneralLedgerAccount[]
    >(
      []
    );


  readonly summary =
    signal<
      GeneralLedgerSummary
    >({
      totalAccounts:
        0,

      totalDebit:
        0,

      totalCredit:
        0
    });

  /* =======================================================
     ACCOUNT LEDGER DRILL-DOWN
  ======================================================= */

  readonly selectedAccount =
    signal<
      AccountLedgerResponse |
      null
    >(
      null
    );


  readonly ledgerEntries =
    computed<
      AccountLedgerEntry[]
    >(
      () =>
        this.selectedAccount()
          ?.entries ??
        []
    );


  readonly isAccountLedgerLoading =
    signal(
      false
    );


  readonly accountLedgerError =
    signal(
      ''
    );


  /* =======================================================
     FILTER STATE
  ======================================================= */

  readonly searchTerm =
    signal(
      ''
    );


  readonly natureFilter =
    signal(
      ''
    );


  readonly accountTypeFilter =
    signal(
      ''
    );


  readonly statusFilter =
    signal(
      ''
    );


  readonly sortBy =
    signal(
      'accountCode'
    );


  readonly sortOrder =
    signal<
      'asc' |
      'desc'
    >(
      'asc'
    );


  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  readonly natureOptions:
    LedgerFilterOption[] = [

    {
      label:
        'All Natures',

      value:
        ''
    },

    {
      label:
        'Assets',

      value:
        'asset'
    },

    {
      label:
        'Liabilities',

      value:
        'liability'
    },

    {
      label:
        'Equity',

      value:
        'equity'
    },

    {
      label:
        'Income',

      value:
        'income'
    },

    {
      label:
        'Expenses',

      value:
        'expense'
    }

  ];


  readonly accountTypeOptions:
    LedgerFilterOption[] = [

    {
      label:
        'All Account Types',

      value:
        ''
    },

    {
      label:
        'Cash',

      value:
        'cash'
    },

    {
      label:
        'Bank',

      value:
        'bank'
    },

    {
      label:
        'Accounts Receivable',

      value:
        'accounts_receivable'
    },

    {
      label:
        'Accounts Payable',

      value:
        'accounts_payable'
    },

    {
      label:
        'Fixed Asset',

      value:
        'fixed_asset'
    },

    {
      label:
        'Current Asset',

      value:
        'current_asset'
    },

    {
      label:
        'Current Liability',

      value:
        'current_liability'
    },

    {
      label:
        'Long Term Liability',

      value:
        'long_term_liability'
    },

    {
      label:
        'Capital',

      value:
        'capital'
    },

    {
      label:
        'Sales',

      value:
        'sales'
    },

    {
      label:
        'Purchase',

      value:
        'purchase'
    },

    {
      label:
        'Direct Income',

      value:
        'direct_income'
    },

    {
      label:
        'Indirect Income',

      value:
        'indirect_income'
    },

    {
      label:
        'Direct Expense',

      value:
        'direct_expense'
    },

    {
      label:
        'Indirect Expense',

      value:
        'indirect_expense'
    },

    {
      label:
        'Tax',

      value:
        'tax'
    },

    {
      label:
        'Other',

      value:
        'other'
    }

  ];


  readonly statusOptions:
    LedgerFilterOption[] = [

    {
      label:
        'All Statuses',

      value:
        ''
    },

    {
      label:
        'Active',

      value:
        'active'
    },

    {
      label:
        'Inactive',

      value:
        'inactive'
    }

  ];


  readonly sortOptions:
    LedgerFilterOption[] = [

    {
      label:
        'Account Code',

      value:
        'accountCode'
    },

    {
      label:
        'Account Name',

      value:
        'accountName'
    },

    {
      label:
        'Nature',

      value:
        'nature'
    },

    {
      label:
        'Account Type',

      value:
        'accountType'
    },

    {
      label:
        'Status',

      value:
        'status'
    }

  ];


  /* =======================================================
     DERIVED STATE
  ======================================================= */

  readonly hasAccounts =
    computed(
      () =>
        this.accounts()
          .length >
        0
    );


  readonly isEmpty =
    computed(
      () =>
        !this.isLoading() &&
        !this.errorMessage() &&
        this.accounts()
          .length ===
        0
    );


  readonly totalOpeningDebit =
    computed(
      () =>
        this.calculateBalanceTotal(
          this.accounts(),
          'openingBalance',
          'debit'
        )
    );


  readonly totalOpeningCredit =
    computed(
      () =>
        this.calculateBalanceTotal(
          this.accounts(),
          'openingBalance',
          'credit'
        )
    );


  readonly totalClosingDebit =
    computed(
      () =>
        this.calculateBalanceTotal(
          this.accounts(),
          'closingBalance',
          'debit'
        )
    );


  readonly totalClosingCredit =
    computed(
      () =>
        this.calculateBalanceTotal(
          this.accounts(),
          'closingBalance',
          'credit'
        )
    );


  readonly movementDifference =
    computed(
      () =>
        this.roundMoney(
          Number(
            this.summary()
              .totalDebit ||
            0
          ) -
          Number(
            this.summary()
              .totalCredit ||
            0
          )
        )
    );


  /* =======================================================
     LIFECYCLE
  ======================================================= */

  ngOnInit(): void {

    this.loadLedger();

  }


  /* =======================================================
     LOAD GENERAL LEDGER

     READ ONLY:
     GET /accounting/general-ledger
  ======================================================= */

  loadLedger(): void {

    if (
      this.isLoading()
    ) {

      return;

    }


    this.isLoading
      .set(
        true
      );


    this.errorMessage
      .set(
        ''
      );


    const query =
      this.buildQuery();


    this.generalLedgerService
      .getGeneralLedger(
        query
      )
      .pipe(
        finalize(
          () => {

            this.isLoading
              .set(
                false
              );

          }
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            const responseAccounts =
              Array.isArray(
                response?.accounts
              )
                ? response.accounts
                : [];


            const responseSummary =
              response?.summary;


            this.accounts
              .set(
                responseAccounts
              );


            this.summary
              .set({
                totalAccounts:
                  Number(
                    responseSummary
                      ?.totalAccounts ??
                    responseAccounts
                      .length ??
                    0
                  ),

                totalDebit:
                  this.roundMoney(
                    Number(
                      responseSummary
                        ?.totalDebit ||
                      0
                    )
                  ),

                totalCredit:
                  this.roundMoney(
                    Number(
                      responseSummary
                        ?.totalCredit ||
                      0
                    )
                  )
              });

          },


        error:
          (
            error
          ) => {

            console.error(
              'Failed to load General Ledger:',
              error
            );


            this.accounts
              .set(
                []
              );


            this.summary
              .set({
                totalAccounts:
                  0,

                totalDebit:
                  0,

                totalCredit:
                  0
              });


            this.errorMessage
              .set(
                this.resolveErrorMessage(
                  error
                )
              );

          }

      });

  }


  /* =======================================================
     APPLY FILTERS
  ======================================================= */

  openAccountLedger(
    account:
      GeneralLedgerAccount
  ): void {

    const accountId =
      String(
        account?.accountId ||
        account?._id ||
        ''
      )
        .trim();


    if (
      !accountId ||
      this.isAccountLedgerLoading()
    ) {

      return;

    }


    this.isAccountLedgerLoading
      .set(
        true
      );


    this.accountLedgerError
      .set(
        ''
      );


    this.selectedAccount
      .set(
        null
      );


    this.generalLedgerService
      .getAccountLedger(
        accountId,
        this.buildQuery()
      )
      .pipe(
        finalize(
          () => {

            this.isAccountLedgerLoading
              .set(
                false
              );

          }
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.selectedAccount
              .set(
                response
              );

          },


        error:
          (
            error
          ) => {

            console.error(
              'Failed to load Account Ledger:',
              error
            );


            this.accountLedgerError
              .set(
                this.resolveErrorMessage(
                  error
                )
              );

          }

      });

  }


  closeAccountLedger(): void {

    this.selectedAccount
      .set(
        null
      );


    this.accountLedgerError
      .set(
        ''
      );

  }


  formatRunningBalance(
    entry:
      AccountLedgerEntry
  ): string {

    return (
      `${this.formatMoney(
        entry.runningBalance
      )} ${
        entry.balanceType ===
          'credit'
          ? 'Cr'
          : 'Dr'
      }`
    );

  }

  applyFilters(): void {

    this.loadLedger();

  }


  /* =======================================================
     SEARCH INPUT
  ======================================================= */

  onSearchChange(
    value:
      string
  ): void {

    this.searchTerm
      .set(
        String(
          value ||
          ''
        )
      );

  }


  /* =======================================================
     NATURE FILTER
  ======================================================= */

  onNatureChange(
    value:
      string
  ): void {

    this.natureFilter
      .set(
        String(
          value ||
          ''
        )
      );


    this.loadLedger();

  }


  /* =======================================================
     ACCOUNT TYPE FILTER
  ======================================================= */

  onAccountTypeChange(
    value:
      string
  ): void {

    this.accountTypeFilter
      .set(
        String(
          value ||
          ''
        )
      );


    this.loadLedger();

  }


  /* =======================================================
     STATUS FILTER
  ======================================================= */

  onStatusChange(
    value:
      string
  ): void {

    this.statusFilter
      .set(
        String(
          value ||
          ''
        )
      );


    this.loadLedger();

  }


  /* =======================================================
     SORT FIELD
  ======================================================= */

  onSortByChange(
    value:
      string
  ): void {

    this.sortBy
      .set(
        String(
          value ||
          'accountCode'
        )
      );


    this.loadLedger();

  }


  /* =======================================================
     SORT DIRECTION
  ======================================================= */

  toggleSortOrder(): void {

    this.sortOrder
      .update(
        (
          current
        ) =>
          current ===
            'asc'
            ? 'desc'
            : 'asc'
      );


    this.loadLedger();

  }


  /* =======================================================
     RESET FILTERS
  ======================================================= */

  resetFilters(): void {

    this.searchTerm
      .set(
        ''
      );


    this.natureFilter
      .set(
        ''
      );


    this.accountTypeFilter
      .set(
        ''
      );


    this.statusFilter
      .set(
        ''
      );


    this.sortBy
      .set(
        'accountCode'
      );


    this.sortOrder
      .set(
        'asc'
      );


    this.loadLedger();

  }


  /* =======================================================
     REFRESH
  ======================================================= */

  refresh(): void {

    this.loadLedger();

  }


  /* =======================================================
     RETRY
  ======================================================= */

  retry(): void {

    this.loadLedger();

  }


  /* =======================================================
     BUILD QUERY
  ======================================================= */

  private buildQuery():
    GeneralLedgerQuery {

    const query:
      GeneralLedgerQuery =
      {};


    const search =
      this.searchTerm()
        .trim();


    if (
      search
    ) {

      query.search =
        search;

    }


    const nature =
      this.natureFilter()
        .trim();


    if (
      nature
    ) {

      query.nature =
        nature;

    }


    const accountType =
      this.accountTypeFilter()
        .trim();


    if (
      accountType
    ) {

      query.accountType =
        accountType;

    }


    const status =
      this.statusFilter()
        .trim();


    if (
      status
    ) {

      query.status =
        status;

    }


    const sortBy =
      this.sortBy()
        .trim();


    if (
      sortBy
    ) {

      query.sortBy =
        sortBy;

    }


    query.sortOrder =
      this.sortOrder();


    return query;

  }


  /* =======================================================
     DISPLAY HELPERS
  ======================================================= */

  formatMoney(
    value:
      number |
      null |
      undefined
  ): string {

    return new Intl
      .NumberFormat(
        'en-IN',
        {
          style:
            'currency',

          currency:
            'INR',

          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      )
      .format(
        Number(
          value ||
          0
        )
      );

  }


  formatBalance(
    balance:
      LedgerBalance |
      null |
      undefined
  ): string {

    if (
      !balance
    ) {

      return (
        `${this.formatMoney(
          0
        )} Dr`
      );

    }


    return (
      `${this.formatMoney(
        balance.amount
      )} ${
        this.balanceTypeLabel(
          balance.type
        )
      }`
    );

  }


  balanceTypeLabel(
    type:
      string |
      null |
      undefined
  ): string {

    return (
      String(
        type ||
        ''
      )
        .toLowerCase() ===
        'credit'
    )
      ? 'Cr'
      : 'Dr';

  }


  natureLabel(
    nature:
      AccountNature |
      string |
      null |
      undefined
  ): string {

    const labels:
      Record<
        string,
        string
      > = {

      asset:
        'Asset',

      liability:
        'Liability',

      equity:
        'Equity',

      income:
        'Income',

      expense:
        'Expense'

    };


    const value =
      String(
        nature ||
        ''
      )
        .trim()
        .toLowerCase();


    return (
      labels[
        value
      ] ||
      this.humanize(
        value
      ) ||
      '-'
    );

  }


  accountTypeLabel(
    type:
      AccountType |
      string |
      null |
      undefined
  ): string {

    return (
      this.humanize(
        String(
          type ||
          ''
        )
      ) ||
      '-'
    );

  }


  statusLabel(
    status:
      AccountStatus |
      string |
      null |
      undefined
  ): string {

    return (
      this.humanize(
        String(
          status ||
          ''
        )
      ) ||
      '-'
    );

  }


  /* =======================================================
     CSS CLASS HELPERS
  ======================================================= */

  natureClass(
    nature:
      string |
      null |
      undefined
  ): string {

    const normalized =
      String(
        nature ||
        ''
      )
        .trim()
        .toLowerCase();


    return (
      normalized
        ? `nature-${normalized}`
        : 'nature-other'
    );

  }


  statusClass(
    status:
      string |
      null |
      undefined
  ): string {

    return (
      String(
        status ||
        ''
      )
        .trim()
        .toLowerCase() ===
        'active'
    )
      ? 'status-active'
      : 'status-inactive';

  }


  balanceClass(
    balance:
      LedgerBalance |
      null |
      undefined
  ): string {

    return (
      balance
        ?.type ===
        'credit'
    )
      ? 'balance-credit'
      : 'balance-debit';

  }


  /* =======================================================
     TRACK ACCOUNT
  ======================================================= */

  trackAccount(
    index:
      number,
    account:
      GeneralLedgerAccount
  ): string {

    return String(
      account.accountId ||
      account._id ||
      account.accountCode ||
      index
    );

  }


  /* =======================================================
     BALANCE TOTAL
  ======================================================= */

  private calculateBalanceTotal(
    accounts:
      GeneralLedgerAccount[],
    field:
      'openingBalance' |
      'closingBalance',
    type:
      'debit' |
      'credit'
  ): number {

    return this.roundMoney(
      accounts
        .filter(
          (
            account
          ) =>
            account[
              field
            ]
              ?.type ===
            type
        )
        .reduce(
          (
            total,
            account
          ) =>
            total +
            Number(
              account[
                field
              ]
                ?.amount ||
              0
            ),
          0
        )
    );

  }


  /* =======================================================
     HUMANIZE
  ======================================================= */

  private humanize(
    value:
      string
  ): string {

    const normalized =
      String(
        value ||
        ''
      )
        .trim();


    if (
      !normalized
    ) {

      return '';

    }


    return normalized
      .replace(
        /[_-]+/g,
        ' '
      )
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character
            .toUpperCase()
      );

  }


  /* =======================================================
     MONEY ROUNDING
  ======================================================= */

  private roundMoney(
    value:
      number
  ): number {

    return (
      Math.round(
        (
          Number(
            value ||
            0
          ) +
          Number.EPSILON
        ) *
        100
      ) /
      100
    );

  }


  /* =======================================================
     ERROR MESSAGE
  ======================================================= */

  private resolveErrorMessage(
    error:
      unknown
  ): string {

    const candidate =
      error as {
        error?: {
          message?: string;
        };

        message?: string;
      };


    const backendMessage =
      candidate
        ?.error
        ?.message;


    if (
      typeof backendMessage ===
        'string' &&
      backendMessage
        .trim()
    ) {

      return backendMessage
        .trim();

    }


    if (
      typeof candidate
        ?.message ===
        'string' &&
      candidate
        .message
        .trim()
    ) {

      return candidate
        .message
        .trim();

    }


    return (
      'Unable to load General Ledger. Please try again.'
    );

  }

}
