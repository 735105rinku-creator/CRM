import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';

export const ACCOUNTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],

    loadComponent: () =>
      import('./layout/accounts-shell.component')
        .then(
          (module) =>
            module.AccountsShellComponent
        ),

    children: [
      /* ======================================================
         DEFAULT
      ====================================================== */

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },

      /* ======================================================
         DASHBOARD
      ====================================================== */

      {
        path: 'dashboard',

        loadComponent: () =>
          import(
            './pages/dashboard/accounts-dashboard.component'
          ).then(
            (module) =>
              module.AccountsDashboardComponent
          ),

        data: {
          title: 'Accounts Dashboard',
          section: 'Accounts'
        }
      },

      /* ======================================================
         MASTERS
      ====================================================== */

      {
        path: 'customers',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Customers',
          section: 'Accounts',
          feature: 'customers',
          description:
            'Customer accounting profiles and receivable relationships.'
        }
      },

      {
        path: 'vendors',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Vendors',
          section: 'Accounts',
          feature: 'vendors',
          description:
            'Supplier and vendor accounting profiles and payables.'
        }
      },

      {
        path: 'chart-of-accounts',

        loadComponent: () =>
          import(
            './pages/chart-of-accounts/chart-of-accounts.component'
          ).then(
            (module) =>
              module.ChartOfAccountsComponent
          ),

        data: {
          title: 'Chart of Accounts',
          section: 'Accounts'
        }
      },

      /* ======================================================
         SALES / RECEIVABLES
      ====================================================== */

      {
        path: 'invoices',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Sales Invoices',
          section: 'Accounts',
          feature: 'invoices',
          description:
            'Sales invoices and accounts receivable.'
        }
      },

      {
        path: 'receipts',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Receipts',
          section: 'Accounts',
          feature: 'receipts',
          description:
            'Customer payments and money received.'
        }
      },

      {
        path: 'credit-notes',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Credit Notes',
          section: 'Accounts',
          feature: 'credit-notes',
          description:
            'Customer credit adjustments and returns.'
        }
      },

      /* ======================================================
         PURCHASES / PAYABLES
      ====================================================== */

      {
        path: 'bills',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Purchase Bills',
          section: 'Accounts',
          feature: 'bills',
          description:
            'Supplier bills and accounts payable.'
        }
      },

      {
        path: 'payments',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Payments',
          section: 'Accounts',
          feature: 'payments',
          description:
            'Payments made to suppliers, vendors and other parties.'
        }
      },

      {
        path: 'debit-notes',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Debit Notes',
          section: 'Accounts',
          feature: 'debit-notes',
          description:
            'Vendor debit adjustments and purchase returns.'
        }
      },

      /* ======================================================
         EXPENSES
      ====================================================== */

      {
        path: 'expenses',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Expenses',
          section: 'Accounts',
          feature: 'expenses',
          description:
            'Company expenses and expense approvals.'
        }
      },

      /* ======================================================
         ACCOUNTING
      ====================================================== */

      {
        path: 'journal',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Journal Entries',
          section: 'Accounts',
          feature: 'journal',
          description:
            'Manual debit and credit accounting entries.'
        }
      },

      {
        path: 'ledger',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'General Ledger',
          section: 'Accounts',
          feature: 'ledger',
          description:
            'Account-wise debit and credit history will be available after journal posting is enabled.'
        }
      },

      {
        path: 'ledger/customers',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Customer Ledger',
          section: 'Accounts',
          feature: 'customer-ledger',
          description:
            'Customer outstanding balances and receivable history.'
        }
      },

      {
        path: 'ledger/vendors',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Vendor Ledger',
          section: 'Accounts',
          feature: 'vendor-ledger',
          description:
            'Vendor outstanding balances and payable history.'
        }
      },

      /* ======================================================
         CASH & BANK
      ====================================================== */

      {
        path: 'cash-bank',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Cash & Bank',
          section: 'Accounts',
          feature: 'cash-bank',
          description:
            'Cash accounts, bank accounts, transfers and reconciliation.'
        }
      },

      /* ======================================================
         TAX
      ====================================================== */

      {
        path: 'tax',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'GST & Tax',
          section: 'Accounts',
          feature: 'tax',
          description:
            'GST, TDS and other statutory accounting.'
        }
      },

      /* ======================================================
         REPORTS
      ====================================================== */

      {
        path: 'reports',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Financial Reports',
          section: 'Accounts',
          feature: 'reports',
          description:
            'Profit & Loss, Balance Sheet, Trial Balance and Cash Flow.'
        }
      },

      /* ======================================================
         SETTINGS
      ====================================================== */

      {
        path: 'settings',

        loadComponent: () =>
          import(
            './pages/placeholder/accounts-placeholder.component'
          ).then(
            (module) =>
              module.AccountsPlaceholderComponent
          ),

        data: {
          title: 'Accounts Settings',
          section: 'Accounts',
          feature: 'settings',
          description:
            'Financial year, payment terms and accounting configuration.'
        }
      },

      /* ======================================================
         UNKNOWN ACCOUNTS ROUTE
      ====================================================== */

      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];