import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  AuthService
} from '../../../../core/auth/auth.service';

import {
  apiUrl
} from '../../../../core/config/api.config';


interface AccountsSidebarItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
  queryParams?: {
    feature: string;
  };
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

  private readonly auth =
    inject(AuthService);


  /* =========================================================
     WORKSPACE INFO
  ========================================================= */

  readonly workspaceName =
    'Accounts';

  readonly companyName = computed(() => {
    const user = this.auth.currentUser() as {
      company?: { name?: string; companyName?: string; logo?: string; logoUrl?: string };
      companyId?: string | { name?: string; companyName?: string; logo?: string; logoUrl?: string };
    } | null;

    const company = user?.company ||
      (typeof user?.companyId === 'object' ? user.companyId : undefined);

    return String(
      company?.name ||
      company?.companyName ||
      'Registered Company'
    ).trim();
  });

  private readonly failedCompanyLogo =
    signal('');


  readonly companyLogo = computed(() => {

    const user = this.auth.currentUser() as {
      company?: {
        logo?: string;
        logoUrl?: string;
      };
      companyId?:
        | string
        | {
            logo?: string;
            logoUrl?: string;
          };
    } | null;

    const company =
      user?.company ||
      (
        typeof user?.companyId === 'object'
          ? user.companyId
          : undefined
      );

    const logo =
      String(
        company?.logoUrl ||
        company?.logo ||
        ''
      ).trim();
      console.log('companyLogo computed:', logo);

    if (!logo) {
      return '';
    }

    const resolved =
      this.assetUrl(logo);

    return this.failedCompanyLogo() === resolved
      ? ''
      : resolved;

  });


  readonly workspaceSubtitle =
    'Finance & Accounting';


  onCompanyLogoError(): void {

    const currentLogo =
      this.companyLogo();

    if (currentLogo) {
      this.failedCompanyLogo.set(
        currentLogo
      );
    }

  }


  private assetUrl(
    value?: string
  ): string {

    const asset =
      String(value || '').trim();

    if (!asset) {
      return '';
    }

    if (
      /^https?:\/\//i.test(asset) ||
      asset.startsWith('data:') ||
      asset.startsWith('blob:') ||
      asset.startsWith('/brand/')
    ) {
      return asset;
    }

    return apiUrl(asset);

  }


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
            label: 'Incoming Invoices',
            route: '/accounts/department-invoices',
            icon: 'invoice'
          },

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
            label: 'Journal Vouchers',
            route: '/accounts/journal',
            icon: 'journal'
          },

          {
            label: 'Contra',
            route: '/accounts/contra',
            icon: 'bank'
          },

          {
            label: 'Journal Entries',
            route: '/accounts/journal-entries',
            icon: 'journal'
          },

          {
            label: 'Day Book',
            route: '/accounts/day-book',
            icon: 'reports'
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
          },

          {
            label: 'GST Report',
            route: '/accounts/gst-report',
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
          },

          {
            label: 'Trial Balance',
            route: '/accounts/trial-balance',
            icon: 'reports'
          },

          {
            label: 'Profit & Loss',
            route: '/accounts/profit-and-loss',
            icon: 'reports'
          },

          {
            label: 'Balance Sheet',
            route: '/accounts/balance-sheet',
            icon: 'reports'
          },

          {
            label: 'Outstanding',
            route: '/accounts/outstanding',
            icon: 'reports'
          }
        ]
      },


      /* =======================================================
         MY EMPLOYEE
      ======================================================= */

      {
        title: 'MY EMPLOYEE',

        items: [
          {
            label: 'Personal Details',
            route: '/accounts/employee',
            queryParams: { feature: 'profile' },
            icon: 'profile'
          },

          {
            label: 'Attendance',
            route: '/accounts/employee',
            queryParams: { feature: 'attendance' },
            icon: 'attendance'
          },

          {
            label: 'Attendance History',
            route: '/accounts/employee',
            queryParams: { feature: 'attendance-history' },
            icon: 'attendance'
          },

          {
            label: 'Leave',
            route: '/accounts/employee',
            queryParams: { feature: 'apply-leave' },
            icon: 'leave'
          },

          {
            label: 'Leave History',
            route: '/accounts/employee',
            queryParams: { feature: 'leave-history' },
            icon: 'leave'
          },

          {
            label: 'Leave Balance',
            route: '/accounts/employee',
            queryParams: { feature: 'leave-balance' },
            icon: 'leave'
          },

          {
            label: 'Payslips',
            route: '/accounts/employee',
            queryParams: { feature: 'payslip' },
            icon: 'payslip'
          },

          {
            label: 'Documents',
            route: '/accounts/employee',
            queryParams: { feature: 'documents' },
            icon: 'documents'
          },

          {
            label: 'Bank Details',
            route: '/accounts/employee',
            queryParams: { feature: 'bank' },
            icon: 'bank'
          },

          {
            label: 'Company Events',
            route: '/accounts/employee',
            queryParams: { feature: 'events' },
            icon: 'events'
          },

          {
            label: 'Holidays',
            route: '/accounts/employee',
            queryParams: { feature: 'holidays' },
            icon: 'calendar'
          },

          {
            label: 'Meetings',
            route: '/accounts/employee',
            queryParams: { feature: 'meetings' },
            icon: 'meetings'
          },

          {
            label: 'Messages',
            route: '/accounts/employee',
            queryParams: { feature: 'messages' },
            icon: 'messages'
          },

          {
            label: 'Change Password',
            route: '/accounts/employee',
            queryParams: { feature: 'settings' },
            icon: 'settings'
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

    return `${item.route}|${item.queryParams?.feature ?? ''}|${item.label}`;

  }


  /* =========================================================
     LOGOUT
  ========================================================= */

  logout(): void {

    this.auth.logout();

  }

}
