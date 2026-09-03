import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink
} from '@angular/router';

import {
  ChartOfAccountsSummary
} from '../../models/accounts.models';

import {
  ChartOfAccountsService
} from '../../services/chart-of-accounts.service';


interface AccountsSummaryCard {
  title: string;
  value: number;
  type: 'currency' | 'number';
  subtitle: string;
  route?: string;
}


interface AccountsQuickAction {
  label: string;
  description: string;
  route: string;
  shortCode: string;
}


interface AccountsModuleShortcut {
  title: string;
  description: string;
  route: string;
  shortCode: string;
}


@Component({
  selector:
    'app-accounts-dashboard',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl:
    './accounts-dashboard.component.html',

  styleUrl:
    './accounts-dashboard.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class AccountsDashboardComponent
  implements OnInit {

  /* =========================================================
     SERVICES
  ========================================================= */

  private readonly chartOfAccountsService =
  inject(ChartOfAccountsService);

  /* =========================================================
     FINANCIAL YEAR
  ========================================================= */

  readonly financialYear =
    signal(
      '2026–27'
    );


  /* =========================================================
     CURRENCY
  ========================================================= */

  readonly currencyCode =
    signal(
      'INR'
    );


  /* =========================================================
     CHART OF ACCOUNTS SUMMARY
  ========================================================= */

  readonly chartOfAccountsSummary =
    signal<ChartOfAccountsSummary | null>(
      null
    );


  readonly isChartSummaryLoading =
    signal(
      false
    );


  readonly chartSummaryError =
    signal(
      ''
    );


  /*
   * Always expose a safe zero-state object to the template.
   *
   * These are ACCOUNT COUNTS, not financial balances.
   */

  readonly chartSummary =
    computed<ChartOfAccountsSummary>(
      () =>
        this.chartOfAccountsSummary() ??
        {

          totalAccounts:
            0,

          asset: {
            accountCount:
              0,

            openingBalance:
              0
          },

          liability: {
            accountCount:
              0,

            openingBalance:
              0
          },

          equity: {
            accountCount:
              0,

            openingBalance:
              0
          },

          income: {
            accountCount:
              0,

            openingBalance:
              0
          },

          expense: {
            accountCount:
              0,

            openingBalance:
              0
          }

        }
    );


  readonly chartSummaryCards =
    computed<AccountsSummaryCard[]>(
      () => {

        const summary =
          this.chartSummary();


        return [

          {
            title:
              'Active Accounts',

            value:
              summary.totalAccounts,

            type:
              'number',

            subtitle:
              'Total active chart accounts',

            route:
              '/accounts/chart-of-accounts'
          },

          {
            title:
              'Asset Accounts',

            value:
              summary.asset.accountCount,

            type:
              'number',

            subtitle:
              'Active asset accounts',

            route:
              '/accounts/chart-of-accounts'
          },

          {
            title:
              'Liability Accounts',

            value:
              summary.liability.accountCount,

            type:
              'number',

            subtitle:
              'Active liability accounts',

            route:
              '/accounts/chart-of-accounts'
          },

          {
            title:
              'Equity Accounts',

            value:
              summary.equity.accountCount,

            type:
              'number',

            subtitle:
              'Active equity accounts',

            route:
              '/accounts/chart-of-accounts'
          },

          {
            title:
              'Income Accounts',

            value:
              summary.income.accountCount,

            type:
              'number',

            subtitle:
              'Active income accounts',

            route:
              '/accounts/chart-of-accounts'
          },

          {
            title:
              'Expense Accounts',

            value:
              summary.expense.accountCount,

            type:
              'number',

            subtitle:
              'Active expense accounts',

            route:
              '/accounts/chart-of-accounts'
          }

        ];

      }
    );


  /* =========================================================
     DASHBOARD FINANCIAL SUMMARY

     Keep these values at zero until their real accounting
     sources are implemented.

     Receivable / Payable:
       Sales + Purchase documents

     Income / Expense:
       Journal + Ledger

     Cash / Bank:
       Ledger balances

     Do NOT derive these values from Chart of Accounts opening
     balances because that would present master-data balances
     as live financial balances.
  ========================================================= */

  readonly totalReceivable =
    signal(
      0
    );


  readonly totalPayable =
    signal(
      0
    );


  readonly totalIncome =
    signal(
      0
    );


  readonly totalExpense =
    signal(
      0
    );


  readonly cashBalance =
    signal(
      0
    );


  readonly bankBalance =
    signal(
      0
    );


  /* =========================================================
     PROFIT / LOSS
  ========================================================= */

  readonly netProfit =
    computed(
      () =>
        this.totalIncome() -
        this.totalExpense()
    );


  readonly profitStatus =
    computed<
      'profit' |
      'loss' |
      'neutral'
    >(
      () => {

        const value =
          this.netProfit();


        if (
          value > 0
        ) {

          return 'profit';

        }


        if (
          value < 0
        ) {

          return 'loss';

        }


        return 'neutral';

      }
    );


  /* =========================================================
     FINANCIAL SUMMARY CARDS
  ========================================================= */

  readonly summaryCards =
    computed<AccountsSummaryCard[]>(
      () => [

        {
          title:
            'Receivables',

          value:
            this.totalReceivable(),

          type:
            'currency',

          subtitle:
            'Amount to be received',

          route:
            '/accounts/ledger/customers'
        },

        {
          title:
            'Payables',

          value:
            this.totalPayable(),

          type:
            'currency',

          subtitle:
            'Amount to be paid',

          route:
            '/accounts/ledger/vendors'
        },

        {
          title:
            'Income',

          value:
            this.totalIncome(),

          type:
            'currency',

          subtitle:
            'Recorded income',

          route:
            '/accounts/reports'
        },

        {
          title:
            'Expenses',

          value:
            this.totalExpense(),

          type:
            'currency',

          subtitle:
            'Recorded expenses',

          route:
            '/accounts/expenses'
        },

        {
          title:
            'Cash Balance',

          value:
            this.cashBalance(),

          type:
            'currency',

          subtitle:
            'Cash account balance',

          route:
            '/accounts/cash-bank'
        },

        {
          title:
            'Bank Balance',

          value:
            this.bankBalance(),

          type:
            'currency',

          subtitle:
            'Bank account balance',

          route:
            '/accounts/cash-bank'
        }

      ]
    );


  /* =========================================================
     QUICK ACTIONS
  ========================================================= */

  readonly quickActions:
    AccountsQuickAction[] = [

    {
      label:
        'Sales Invoice',

      description:
        'Create or review customer invoices.',

      route:
        '/accounts/invoices',

      shortCode:
        'SI'
    },

    {
      label:
        'Receipt',

      description:
        'Record customer payment receipts.',

      route:
        '/accounts/receipts',

      shortCode:
        'RC'
    },

    {
      label:
        'Purchase Bill',

      description:
        'Record supplier and vendor bills.',

      route:
        '/accounts/bills',

      shortCode:
        'PB'
    },

    {
      label:
        'Payment',

      description:
        'Record outgoing business payments.',

      route:
        '/accounts/payments',

      shortCode:
        'PY'
    },

    {
      label:
        'Expense',

      description:
        'Record company operating expenses.',

      route:
        '/accounts/expenses',

      shortCode:
        'EX'
    },

    {
      label:
        'Journal Entry',

      description:
        'Record debit and credit entries.',

      route:
        '/accounts/journal',

      shortCode:
        'JE'
    }

  ];


  /* =========================================================
     ACCOUNTING MODULE SHORTCUTS
  ========================================================= */

  readonly moduleShortcuts:
    AccountsModuleShortcut[] = [

    {
      title:
        'Chart of Accounts',

      description:
        'Manage assets, liabilities, income, expenses and equity accounts.',

      route:
        '/accounts/chart-of-accounts',

      shortCode:
        'COA'
    },

    {
      title:
        'General Ledger',

      description:
        'Review debit, credit and account balances.',

      route:
        '/accounts/ledger',

      shortCode:
        'GL'
    },

    {
      title:
        'Customer Ledger',

      description:
        'Track customer invoices, receipts and outstanding balances.',

      route:
        '/accounts/ledger/customers',

      shortCode:
        'CL'
    },

    {
      title:
        'Vendor Ledger',

      description:
        'Track supplier bills, payments and outstanding balances.',

      route:
        '/accounts/ledger/vendors',

      shortCode:
        'VL'
    },

    {
      title:
        'Cash & Bank',

      description:
        'Manage cash, bank balances, transfers and reconciliation.',

      route:
        '/accounts/cash-bank',

      shortCode:
        'BK'
    },

    {
      title:
        'Financial Reports',

      description:
        'View Trial Balance, Profit & Loss and Balance Sheet.',

      route:
        '/accounts/reports',

      shortCode:
        'RP'
    }

  ];


  /* =========================================================
     INIT
  ========================================================= */

  ngOnInit():
    void {

    this.loadChartOfAccountsSummary();

  }


  /* =========================================================
     LOAD CHART OF ACCOUNTS SUMMARY

     Read-only request:
       GET /accounting/chart-of-accounts/summary
  ========================================================= */

  private loadChartOfAccountsSummary():
    void {

    this.isChartSummaryLoading.set(
      true
    );


    this.chartSummaryError.set(
      ''
    );


    this.chartOfAccountsService
      .getSummary()
      .subscribe({

        next:
          (
            summary
          ) => {

            this.chartOfAccountsSummary.set(
              summary
            );


            this.isChartSummaryLoading.set(
              false
            );

          },


        error:
          (
            error: {
              error?: {
                message?: string;
              };
            }
          ) => {

            console.error(
              'Unable to load Chart of Accounts summary',
              error
            );


            this.chartOfAccountsSummary.set(
              null
            );


            this.chartSummaryError.set(
              error?.error?.message ||
              'Unable to load Chart of Accounts summary.'
            );


            this.isChartSummaryLoading.set(
              false
            );

          }

      });

  }


  /* =========================================================
     FORMAT CURRENCY
  ========================================================= */

  formatCurrency(
    value: number
  ): string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style:
          'currency',

        currency:
          this.currencyCode(),

        maximumFractionDigits:
          2
      }
    )
      .format(
        value
      );

  }


  /* =========================================================
     TRACK FUNCTIONS
  ========================================================= */

  trackSummaryCard(
    index: number,
    item: AccountsSummaryCard
  ): string {

    return item.title;

  }


  trackQuickAction(
    index: number,
    item: AccountsQuickAction
  ): string {

    return item.route;

  }


  trackModuleShortcut(
    index: number,
    item: AccountsModuleShortcut
  ): string {

    return item.route;

  }

}