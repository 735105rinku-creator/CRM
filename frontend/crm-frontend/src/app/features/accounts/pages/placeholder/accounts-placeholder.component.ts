import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  toSignal
} from '@angular/core/rxjs-interop';


interface AccountsPlaceholderRouteData {
  title?: string;
  section?: string;
  feature?: string;
  description?: string;
}


@Component({
  selector: 'app-accounts-placeholder',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl:
    './accounts-placeholder.component.html',

  styleUrl:
    './accounts-placeholder.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class AccountsPlaceholderComponent {

  /* =========================================================
     DEPENDENCIES
  ========================================================= */

  private readonly route =
    inject(ActivatedRoute);


  /* =========================================================
     ROUTE DATA
  ========================================================= */

  private readonly routeData =
    toSignal(
      this.route.data,
      {
        initialValue:
          {} as AccountsPlaceholderRouteData
      }
    );


  /* =========================================================
     PAGE INFORMATION
  ========================================================= */

  readonly title =
    computed(
      () =>
        this.routeData().title ??
        'Accounts'
    );


  readonly section =
    computed(
      () =>
        this.routeData().section ??
        'Accounts'
    );


  readonly feature =
    computed(
      () =>
        this.routeData().feature ??
        'accounts'
    );


  readonly description =
    computed(
      () =>
        this.routeData().description ??
        'Manage this Accounts feature from your finance workspace.'
    );


  /* =========================================================
     FEATURE ICON
  ========================================================= */

  readonly featureIcon =
    computed(
      () => {

        switch (
          this.feature()
        ) {

          case 'customers':
            return 'CU';

          case 'vendors':
            return 'VE';

          case 'invoices':
            return 'IN';

          case 'receipts':
            return 'RC';

          case 'credit-notes':
            return 'CN';

          case 'bills':
            return 'BL';

          case 'payments':
            return 'PY';

          case 'debit-notes':
            return 'DN';

          case 'expenses':
            return 'EX';

          case 'journal':
            return 'JE';

          case 'ledger':
            return 'GL';

          case 'customer-ledger':
            return 'CL';

          case 'vendor-ledger':
            return 'VL';

          case 'cash-bank':
            return 'BK';

          case 'tax':
            return 'GST';

          case 'reports':
            return 'RP';

          case 'settings':
            return 'ST';

          default:
            return 'AC';

        }

      }
    );


  /* =========================================================
     FEATURE STATUS
  ========================================================= */

  readonly statusLabel =
    computed(
      () => {

        switch (
          this.feature()
        ) {

          case 'invoices':
          case 'payments':
          case 'expenses':
            return 'Existing Accounting Integration';

          default:
            return 'Module Foundation Ready';

        }

      }
    );


  /* =========================================================
     DASHBOARD NAVIGATION
  ========================================================= */

  readonly dashboardRoute =
    '/accounts/dashboard';

}