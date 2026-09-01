import { Component, HostListener, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  imports: [
    NavbarComponent,
    RouterOutlet,
    SidebarComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  protected readonly isCollapsed = signal(false);
  protected readonly isMobileOpen = signal(false);

  protected readonly isHrWorkspace = signal(false);
  protected readonly isSuperAdminWorkspace = signal(false);
  protected readonly isCompanyAdminWorkspace = signal(false);

  // Logistics pages render their own premium workspace UI.
  protected readonly isLogisticsWorkspace = signal(false);

  constructor(
    private readonly router: Router
  ) {
    this.updateWorkspaceLayout(
      this.router.url
    );

    this.router.events
      .pipe(
        filter(
          (
            event
          ): event is NavigationEnd =>
            event instanceof NavigationEnd
        ),
        takeUntilDestroyed()
      )
      .subscribe(
        (event) =>
          this.updateWorkspaceLayout(
            event.urlAfterRedirects
          )
      );
  }

  @HostListener('window:resize')
  protected closeMobileSidebar(): void {
    if (window.innerWidth > 992) {
      this.isMobileOpen.set(false);
    }
  }

  protected toggleSidebar(): void {
    if (window.innerWidth <= 992) {
      this.isMobileOpen.update(
        (isOpen) => !isOpen
      );

      return;
    }

    this.isCollapsed.update(
      (isCollapsed) => !isCollapsed
    );
  }

  protected toggleCollapse(): void {
    this.isCollapsed.update(
      (isCollapsed) => !isCollapsed
    );
  }

  protected closeMobileMenu(): void {
    this.isMobileOpen.set(false);
  }

  protected usesGlobalNavigation(): boolean {
    return (
      !this.isHrWorkspace() &&
      !this.isSuperAdminWorkspace() &&
      !this.isCompanyAdminWorkspace() &&
      !this.isLogisticsWorkspace()
    );
  }

  private updateWorkspaceLayout(
    url: string
  ): void {
    const path =
      url.split('?')[0]
        .split('#')[0];

    this.isHrWorkspace.set(
      [
        '/hr-dashboard',
        '/employee-dashboard',
        '/employee/dashboard'
      ].includes(path)
    );

    this.isSuperAdminWorkspace.set(
      [
        '/super-admin',
        '/super-admin/dashboard',
        '/opasbizz/admin/dashboard'
      ].includes(path)
    );

    this.isCompanyAdminWorkspace.set(
      [
        '/dashboard',
        '/company/dashboard'
      ].includes(path)
    );

    this.isLogisticsWorkspace.set(
      path === '/logistics' ||
      path.startsWith('/logistics/')
    );

    // Never leave the old mobile overlay open after
    // entering a self-contained workspace.
    if (
      this.isHrWorkspace() ||
      this.isSuperAdminWorkspace() ||
      this.isCompanyAdminWorkspace() ||
      this.isLogisticsWorkspace()
    ) {
      this.isMobileOpen.set(false);
    }
  }
}