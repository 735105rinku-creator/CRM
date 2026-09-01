import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink
} from '@angular/router';


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
  selector: 'app-accounts-dashboard',

  standalone: true,

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
export class AccountsDashboardComponent {

  /* =========================================================
     FINANCIAL YEAR
  ========================================================= */

  readonly financialYear =
    signal('2026–27');


  /* =========================================================
     CURRENCY
  ========================================================= */

  readonly currencyCode =
    signal('INR');


  /* =========================================================
     DASHBOARD SUMMARY

     These values remain zero until the Accounts dashboard
     service is connected to real backend accounting data.

     Do not use demo/fake financial values here.
  ========================================================= */

  readonly totalReceivable =
    signal(0);

  readonly totalPayable =
    signal(0);

  readonly totalIncome =
    signal(0);

  readonly totalExpense =
    signal(0);

  readonly cashBalance =
    signal(0);

  readonly bankBalance =
    signal(0);


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
     SUMMARY CARDS
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
    ).format(
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