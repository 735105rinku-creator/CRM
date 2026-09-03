import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';


interface AccountsSidebarItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}


interface AccountsSidebarGroup {
  title: string;
  items: AccountsSidebarItem[];
}


@Component({
  selector: 'app-accounts-sidebar',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],

  templateUrl:
    './accounts-sidebar.component.html',

  styleUrl:
    './accounts-sidebar.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class AccountsSidebarComponent {

  /* =========================================================
     WORKSPACE INFO
  ========================================================= */

  readonly workspaceName =
    'Accounts';

  readonly workspaceSubtitle =
    'Finance & Accounting';


  /* =========================================================
     SIDEBAR MENU
  ========================================================= */

  readonly menuGroups:
    AccountsSidebarGroup[] = [

      /* =======================================================
         OVERVIEW
      ======================================================= */

      {
        title: 'Overview',

        items: [
          {
            label: 'Dashboard',
            route: '/accounts/dashboard',
            icon: 'dashboard',
            exact: true
          }
        ]
      },


      /* =======================================================
         MASTERS
      ======================================================= */

      {
        title: 'Masters',

        items: [
          {
            label: 'Customers',
            route: '/accounts/customers',
            icon: 'customers'
          },

          {
            label: 'Vendors',
            route: '/accounts/vendors',
            icon: 'vendors'
          },

          {
            label: 'Chart of Accounts',
            route:
              '/accounts/chart-of-accounts',
            icon: 'chart'
          }
        ]
      },


      /* =======================================================
         SALES
      ======================================================= */

      {
        title: 'Sales',

        items: [
          {
            label: 'Sales Invoices',
            route: '/accounts/invoices',
            icon: 'invoice'
          },

          {
            label: 'Receipts',
            route: '/accounts/receipts',
            icon: 'receipt'
          },

          {
            label: 'Credit Notes',
            route: '/accounts/credit-notes',
            icon: 'credit'
          }
        ]
      },


      /* =======================================================
         PURCHASES
      ======================================================= */

      {
        title: 'Purchases',

        items: [
          {
            label: 'Purchase Bills',
            route: '/accounts/bills',
            icon: 'bill'
          },

          {
            label: 'Payments',
            route: '/accounts/payments',
            icon: 'payment'
          },

          {
            label: 'Debit Notes',
            route: '/accounts/debit-notes',
            icon: 'debit'
          }
        ]
      },


      /* =======================================================
         EXPENSES
      ======================================================= */

      {
        title: 'Expenses',

        items: [
          {
            label: 'All Expenses',
            route: '/accounts/expenses',
            icon: 'expense'
          }
        ]
      },


      /* =======================================================
         ACCOUNTING
      ======================================================= */

      {
        title: 'Accounting',

        items: [
          {
            label: 'Journal Entries',
            route: '/accounts/journal-entries',
            icon: 'journal'
          },

          {
            label: 'General Ledger',
            route: '/accounts/ledger',
            icon: 'ledger'
          },

          {
            label: 'Customer Ledger',
            route:
              '/accounts/ledger/customers',
            icon: 'customer-ledger'
          },

          {
            label: 'Vendor Ledger',
            route:
              '/accounts/ledger/vendors',
            icon: 'vendor-ledger'
          }
        ]
      },


      /* =======================================================
         CASH & BANK
      ======================================================= */

      {
        title: 'Cash & Bank',

        items: [
          {
            label: 'Cash & Bank',
            route: '/accounts/cash-bank',
            icon: 'bank'
          }
        ]
      },


      /* =======================================================
         TAX
      ======================================================= */

      {
        title: 'Tax',

        items: [
          {
            label: 'GST & Tax',
            route: '/accounts/tax',
            icon: 'tax'
          }
        ]
      },


      /* =======================================================
         REPORTS
      ======================================================= */

      {
        title: 'Reports',

        items: [
          {
            label: 'Financial Reports',
            route: '/accounts/reports',
            icon: 'reports'
          }
        ]
      },


      /* =======================================================
         SETTINGS
      ======================================================= */

      {
        title: 'Configuration',

        items: [
          {
            label: 'Accounts Settings',
            route: '/accounts/settings',
            icon: 'settings'
          }
        ]
      }

    ];


  /* =========================================================
     TRACK FUNCTIONS
  ========================================================= */

  trackGroup(
    index: number,
    group: AccountsSidebarGroup
  ): string {

    return group.title;

  }


  trackItem(
    index: number,
    item: AccountsSidebarItem
  ): string {

    return item.route;

  }

}
