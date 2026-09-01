import {
  ChangeDetectionStrategy,
  Component,
  signal
} from '@angular/core';

import {
  RouterOutlet
} from '@angular/router';

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

}