import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  Router,
  RouterOutlet
} from '@angular/router';

import {
  AuthService
} from '../../../core/auth/auth.service';

import {
  AccountsSidebarComponent
} from '../components/accounts-sidebar/accounts-sidebar.component';


@Component({
  selector: 'app-accounts-shell',

  standalone: true,

  imports: [
    RouterOutlet,
    AccountsSidebarComponent
  ],

  templateUrl:
    './accounts-shell.component.html',

  styleUrl:
    './accounts-shell.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class AccountsShellComponent {

  private readonly router =
    inject(Router);

  private readonly auth =
    inject(AuthService);


  /* =========================================================
     CURRENT USER
  ========================================================= */

  readonly userMenuOpen =
    signal(false);


  readonly userName =
    computed(
      () => {

        const user =
          this.auth.currentUser() as {
            name?: string;
            fullName?: string;
            email?: string;
          } | null;

        return String(
          user?.name ||
          user?.fullName ||
          user?.email ||
          'Accountant'
        ).trim();

      }
    );


  readonly userDesignation =
    computed(
      () => {

        const user =
          this.auth.currentUser() as {
            designation?: string;
            role?: string;
            roleRef?: {
              name?: string;
            };
          } | null;

        const label =
          String(
            user?.designation ||
            user?.roleRef?.name ||
            user?.role ||
            'Accounts'
          )
            .trim()
            .replace(
              /_/g,
              ' '
            );

        return label.replace(
          /\b\w/g,
          character =>
            character.toUpperCase()
        );

      }
    );


  readonly userInitial =
    computed(
      () =>
        this.userName()
          .trim()
          .charAt(0)
          .toUpperCase() ||
        'A'
    );


  /* =========================================================
     MOBILE SIDEBAR
  ========================================================= */

  readonly mobileSidebarOpen =
    signal(false);


  openMobileSidebar(): void {

    this.mobileSidebarOpen.set(
      true
    );

  }


  closeMobileSidebar(): void {

    this.mobileSidebarOpen.set(
      false
    );

  }


  toggleMobileSidebar(): void {

    this.mobileSidebarOpen.update(
      value => !value
    );

  }


  /* =========================================================
     USER MENU
  ========================================================= */

  toggleUserMenu(): void {

    this.userMenuOpen.update(
      value => !value
    );

  }


  openProfile(): void {

    this.userMenuOpen.set(
      false
    );

    void this.router.navigate(
      [
        '/accounts/employee'
      ],
      {
        queryParams: {
          feature: 'profile'
        }
      }
    );

  }


  openSettings(): void {

    this.userMenuOpen.set(
      false
    );

    void this.router.navigate(
      [
        '/accounts/settings'
      ]
    );

  }


  logout(): void {

    this.userMenuOpen.set(
      false
    );

    this.auth.logout();

  }

}