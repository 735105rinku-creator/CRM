import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { catchError, filter, of } from 'rxjs';

import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-placeholder-page',
  templateUrl: './placeholder-page.component.html',
  styleUrls: ['./placeholder-page.component.scss']
})
export class PlaceholderPageComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly title = computed(() => this.route.snapshot.data['title'] ?? 'CRM Module');
  protected readonly eyebrow = computed(() => this.route.snapshot.data['section'] ?? 'Workspace');
  protected readonly endpoint = signal('');
  protected readonly totalRecords = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    this.load();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => this.load());
  }

  private load(): void {
    const path = this.router.url.split('?')[0].replace(/^\//, '');
    const endpoint = endpointMap[path] ?? '';
    this.endpoint.set(endpoint);
    this.totalRecords.set(0);
    this.errorMessage.set('');

    if (!endpoint) {
      return;
    }

    this.isLoading.set(true);
    this.api
      .get<unknown>(endpoint)
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        this.isLoading.set(false);

        if (data === null) {
          this.errorMessage.set('Backend data is not available for this module right now.');
          return;
        }

        if (Array.isArray(data)) {
          this.totalRecords.set(data.length);
          return;
        }

        if (typeof data === 'object' && data) {
          const record = data as Record<string, unknown>;
          const list = Object.values(record).find((value) => Array.isArray(value)) as unknown[] | undefined;
          this.totalRecords.set(Number(record['total'] ?? record['count'] ?? list?.length ?? 0));
        }
      });
  }
}

const endpointMap: Record<string, string> = {
  leads: '/leads',
  contacts: '/contacts',
  accounts: '/accounts',
  deals: '/deals',
  invoices: '/invoices',
  payments: '/payments',
  expenses: '/expenses',
  quotations: '/quotations',
  'reports/sales': '/hr/reports/summary',
  'reports/financial': '/hr/reports/payroll',
  'reports/activity': '/hr/reports/summary',
  'settings/company': '/companies/my/profile',
  'settings/users': '/users',
  'settings/profile': '/auth/me'
};
