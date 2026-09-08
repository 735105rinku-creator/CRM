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
            './pages/customers/customers.component'
          ).then(
            (module) =>
              module.CustomersComponent
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
            './pages/vendors/vendors.component'
          ).then(
            (module) =>
              module.VendorsComponent
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
            './pages/sales-invoices/sales-invoices.component'
          ).then(
            (module) =>
              module.SalesInvoicesComponent
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
            './pages/voucher-entry/voucher-entry.component'
          ).then(
            (module) =>
              module.VoucherEntryComponent
          ),

        data: {
          title: 'Receipts',
          section: 'Accounts',
          feature: 'receipts',
          description:
            'Customer payments and money received.',
          voucherType: 'receipt'
        }
      },

      {
        path: 'credit-notes',

        loadComponent: () =>
          import(
            './pages/voucher-entry/voucher-entry.component'
          ).then(
            (module) =>
              module.VoucherEntryComponent
          ),

        data: {
          title: 'Credit Notes',
          section: 'Accounts',
          feature: 'credit-notes',
          description:
            'Customer credit adjustments and returns.',
          voucherType: 'credit_note'
        }
      },

      /* ======================================================
         PURCHASES / PAYABLES
      ====================================================== */

      {
        path: 'bills',

        loadComponent: () =>
          import(
            './pages/purchase-bills/purchase-bills.component'
          ).then(
            (module) =>
              module.PurchaseBillsComponent
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
            './pages/voucher-entry/voucher-entry.component'
          ).then(
            (module) =>
              module.VoucherEntryComponent
          ),

        data: {
          title: 'Payments',
          section: 'Accounts',
          feature: 'payments',
          description:
            'Payments made to suppliers, vendors and other parties.',
          voucherType: 'payment'
        }
      },

      {
        path: 'debit-notes',

        loadComponent: () =>
          import(
            './pages/voucher-entry/voucher-entry.component'
          ).then(
            (module) =>
              module.VoucherEntryComponent
          ),

        data: {
          title: 'Debit Notes',
          section: 'Accounts',
          feature: 'debit-notes',
          description:
            'Vendor debit adjustments and purchase returns.',
          voucherType: 'debit_note'
        }
      },

      /* ======================================================
         EXPENSES
      ====================================================== */

      {
        path: 'expenses',

        loadComponent: () =>
          import(
            './pages/expense-register/expense-register.component'
          ).then(
            (module) =>
              module.ExpenseRegisterComponent
          ),

        data: {
          title: 'Expenses',
          section: 'Accounts',
          feature: 'expenses',
          description:
            'Read-only operational expense register and expense review.'
        }
      },

      /* ======================================================
         ACCOUNTING
      ====================================================== */

      {
        path: 'journal-entries',

        loadComponent: () =>
          import(
            './pages/journal-entries/journal-entries.component'
          ).then(
            (module) =>
              module.JournalEntriesComponent
          ),

        data: {
          title: 'Journal Entries',
          section: 'Accounts',
          feature: 'journal-entries'
        }
      },

      {
        path: 'journal',

        loadComponent: () =>
          import(
            './pages/voucher-entry/voucher-entry.component'
          ).then(
            (module) =>
              module.VoucherEntryComponent
          ),

        data: {
          title: 'Journal Vouchers',
          section: 'Accounts',
          feature: 'journal-vouchers',
          description:
            'Tally-style journal vouchers and balanced accounting entries.',
          voucherType: 'journal'
        }
      },

      {
        path: 'contra',

        loadComponent: () =>
          import(
            './pages/voucher-entry/voucher-entry.component'
          ).then(
            (module) =>
              module.VoucherEntryComponent
          ),

        data: {
          title: 'Contra',
          section: 'Accounts',
          feature: 'contra',
          description:
            'Cash and bank transfer vouchers.',
          voucherType: 'contra'
        }
      },

      {
        path: 'day-book',

        loadComponent: () =>
          import(
            './pages/day-book/day-book.component'
          ).then(
            (module) =>
              module.DayBookComponent
          ),

        data: {
          title: 'Day Book',
          section: 'Accounts',
          feature: 'day-book',
          description:
            'Read-only chronological accounting voucher and journal register.'
        }
      },
      {
        path: 'ledger',

        loadComponent: () =>
          import(
            './pages/general-ledger/general-ledger.component'
          ).then(
            (module) =>
              module.GeneralLedgerComponent
          ),

        data: {
          title: 'General Ledger',
          section: 'Accounts',
          feature: 'ledger'
        }
      },
      {
        path: 'ledger/customers',

        loadComponent: () =>
          import(
            './pages/party-ledger/party-ledger.component'
          ).then(
            (module) =>
              module.PartyLedgerComponent
          ),

        data: {
          title: 'Customer Ledger',
          section: 'Accounts',
          feature: 'customer-ledger',
          description:
            'Customer outstanding balances and receivable history.',
          partyType: 'customer'
        }
      },

      {
        path: 'ledger/vendors',

        loadComponent: () =>
          import(
            './pages/party-ledger/party-ledger.component'
          ).then(
            (module) =>
              module.PartyLedgerComponent
          ),

        data: {
          title: 'Vendor Ledger',
          section: 'Accounts',
          feature: 'vendor-ledger',
          description:
            'Vendor outstanding balances and payable history.',
          partyType: 'vendor'
        }
      },

      /* ======================================================
         CASH & BANK
      ====================================================== */

      {
        path: 'outstanding',

        loadComponent: () =>
          import(
            './pages/outstanding/outstanding.component'
          ).then(
            (module) =>
              module.OutstandingComponent
          ),

        data: {
          title: 'Outstanding',
          section: 'Accounts',
          feature: 'outstanding',
          description:
            'Customer receivables and vendor payables outstanding report.'
        }
      },

      {
        path: 'cash-bank',

        loadComponent: () =>
          import(
            './pages/cash-bank-book/cash-bank-book.component'
          ).then(
            (module) =>
              module.CashBankBookComponent
          ),

        data: {
          title: 'Cash & Bank',
          section: 'Accounts',
          feature: 'cash-bank',
          description:
            'Cash accounts, bank accounts, transfers and reconciliation.'
        }
      },

      {
        path: 'gst-report',

        loadComponent: () =>
          import(
            './pages/gst-report/gst-report.component'
          ).then(
            (module) =>
              module.GstReportComponent
          ),

        data: {
          title: 'GST Report',
          section: 'Accounts',
          feature: 'gst-report',
          description:
            'Output GST, input GST and net GST report.'
        }
      },

      /* ======================================================
         TAX
      ====================================================== */

      {
        path: 'tax',

        loadComponent: () =>
          import(
            './pages/tax-hub/tax-hub.component'
          ).then(
            (module) =>
              module.TaxHubComponent
          ),

        data: {
          title: 'GST & Tax',
          section: 'Accounts',
          feature: 'tax',
          description:
            'GST reporting access and statutory accounting capability overview.'
        }
      },
      /* ======================================================
         REPORTS
      ====================================================== */
      {
        path: 'balance-sheet',

        loadComponent: () =>
          import(
            './pages/balance-sheet/balance-sheet.component'
          ).then(
            (module) =>
              module.BalanceSheetComponent
          ),

        data: {
          title: 'Balance Sheet',
          section: 'Accounts',
          feature: 'balance-sheet'
        }
      },
      {
        path: 'profit-and-loss',

        loadComponent: () =>
          import(
            './pages/profit-loss/profit-loss.component'
          ).then(
            (module) =>
              module.ProfitLossComponent
          ),

        data: {
          title: 'Profit & Loss',
          section: 'Accounts',
          feature: 'profit-and-loss'
        }
      },
      {
        path: 'trial-balance',

        loadComponent: () =>
          import(
            './pages/trial-balance/trial-balance.component'
          ).then(
            (module) =>
              module.TrialBalanceComponent
          ),

        data: {
          title: 'Trial Balance',
          section: 'Accounts',
          feature: 'trial-balance'
        }
      },

      {
        path: 'reports',

        loadComponent: () =>
          import(
            './pages/financial-reports-hub/financial-reports-hub.component'
          ).then(
            (module) =>
              module.FinancialReportsHubComponent
          ),

        data: {
          title: 'Financial Reports',
          section: 'Accounts',
          feature: 'reports',
          description:
            'Central access to existing accounting and statutory reports.'
        }
      },
      /* ======================================================
         SETTINGS
      ====================================================== */

      {
        path: 'settings',

        loadComponent: () =>
          import(
            './pages/accounts-settings/accounts-settings.component'
          ).then(
            (module) =>
              module.AccountsSettingsComponent
          ),

        data: {
          title: 'Accounts Settings',
          section: 'Accounts',
          feature: 'settings',
          description:
            'Read-only overview of the existing Accounts configuration.'
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
