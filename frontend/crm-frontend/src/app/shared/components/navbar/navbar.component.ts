import { CommonModule } from '@angular/common';
import { Component, computed, output, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { Company } from '../../../core/models/company.model';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  readonly menuToggle = output<void>();

  protected readonly pageTitle = signal('Dashboard');
  protected readonly user = computed(() => this.authService.currentUser());
  protected readonly userName = computed(() => this.user()?.name ?? 'CRM User');
  protected readonly companyLogoUrl = computed(() => {
    const user = this.user();
    const company = user && 'company' in user ? (user.company as Company | undefined) : undefined;
    return company?.logoUrl || '/brand/opasbizz-crm.webp';
  });
  protected readonly notifications = signal(3);

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.setPageTitle();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.setPageTitle();
    });
  }

  protected logout(): void {
    this.authService.logout();
  }

  private setPageTitle(): void {
    let child = this.router.routerState.root;

    while (child?.firstChild) {
      child = child.firstChild;
    }

    this.pageTitle.set(child?.snapshot?.data?.['title'] ?? 'Dashboard');
  }

}
