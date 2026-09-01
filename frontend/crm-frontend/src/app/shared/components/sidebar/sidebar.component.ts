import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { Company } from '../../../core/models/company.model';
import { HasRoleDirective } from '../../directives/has-role.directive';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles?: string[];
  permission?: { module: string; subModule: string; action?: 'view' | 'create' | 'edit' | 'delete' | 'updateStatus' };
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, HasRoleDirective, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  readonly collapsed = input(false);
  readonly collapseToggle = output<void>();
  readonly navigateItem = output<void>();

  protected readonly menuSections: MenuSection[] = [
    {
      title: 'Sales',
      items: [
        { label: 'Admin Dashboard', route: '/dashboard', icon: 'D', roles: ['company_admin', 'super_admin'] },
        { label: 'Sales Dashboard', route: '/sales-dashboard', icon: 'S' },
        { label: 'Leads', route: '/leads', icon: 'L' },
        { label: 'Contacts', route: '/contacts', icon: 'C' },
        { label: 'Accounts', route: '/accounts', icon: 'A' },
        { label: 'Deals', route: '/deals', icon: '$' }
      ]
    },
    {
      title: 'Finance',
      items: [
        { label: 'Invoices', route: '/invoices', icon: 'I', roles: ['company_admin', 'accounts', 'super_admin'] },
        { label: 'Payments', route: '/payments', icon: 'P', roles: ['company_admin', 'accounts', 'super_admin'] },
        { label: 'Expenses', route: '/expenses', icon: 'E', roles: ['company_admin', 'accounts', 'super_admin'] },
        { label: 'Quotations', route: '/quotations', icon: 'Q' }
      ]
    },
    {
      title: 'Reports',
      items: [
        { label: 'Sales Report', route: '/reports/sales', icon: 'S', roles: ['company_admin', 'manager', 'super_admin'] },
        { label: 'Financial Report', route: '/reports/financial', icon: 'F', roles: ['company_admin', 'accounts', 'super_admin'] },
        { label: 'Activity Log', route: '/reports/activity', icon: 'A', roles: ['company_admin', 'super_admin'] }
      ]
    },
    {
      title: 'Logistics',
      items: [
        { label: 'Logistics Overview', route: '/logistics-overview', icon: 'L', permission: { module: 'logistics', subModule: 'airCargo', action: 'view' } },
        { label: 'Air Cargo', route: '/logistics/air-cargo', icon: 'A', permission: { module: 'logistics', subModule: 'airCargo', action: 'view' } },
        { label: 'Sea Freight', route: '/logistics/sea-freight', icon: 'S', permission: { module: 'logistics', subModule: 'seaFreight', action: 'view' } },
        { label: 'CHA', route: '/logistics/cha', icon: 'C', permission: { module: 'logistics', subModule: 'cha', action: 'view' } },
        { label: 'Transporters', route: '/logistics/transporters', icon: 'T', permission: { module: 'logistics', subModule: 'transporters', action: 'view' } },
        { label: 'Warehouse', route: '/logistics/warehouse', icon: 'W', permission: { module: 'logistics', subModule: 'warehouse', action: 'view' } },
        { label: 'Tracking', route: '/logistics/tracking', icon: 'R', permission: { module: 'logistics', subModule: 'tracking', action: 'view' } },
        { label: 'Documents', route: '/logistics/documents', icon: 'D', permission: { module: 'logistics', subModule: 'documents', action: 'view' } }
      ]
    },
    {
      title: 'Settings',
      items: [
        { label: 'Super Admin', route: '/super-admin', icon: 'O', roles: ['super_admin'] },
        { label: 'HR Dashboard', route: '/hr-dashboard', icon: 'H', roles: ['hr', 'company_admin', 'super_admin'] },
        { label: 'Employee Dashboard', route: '/employee-dashboard', icon: 'E', roles: ['employee', 'hr', 'company_admin', 'super_admin'] },
        { label: 'Calendar', route: '/calendar', icon: 'C' },
        { label: 'Company Settings', route: '/settings/company', icon: 'C', roles: ['company_admin', 'super_admin'] },
        { label: 'Users & Roles', route: '/settings/users', icon: 'U', roles: ['company_admin', 'super_admin'] },
        { label: 'Profile', route: '/settings/profile', icon: 'P' }
      ]
    }
  ];

  protected readonly visibleMenuSections = computed(() =>
    this.menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => this.canShowItem(item))
      }))
      .filter((section) => section.items.length > 0)
  );

  protected readonly user = computed(() => this.authService.currentUser());
  protected readonly userName = computed(() => this.user()?.name ?? this.user()?.email ?? 'CRM User');
  protected readonly companyName = computed(() => {
    const user = this.user();
    const company = user && 'company' in user ? (user.company as Company | undefined) : undefined;
    return company?.name ?? 'Company CRM';
  });
  protected readonly companyLogoUrl = computed(() => {
    const user = this.user();
    const company = user && 'company' in user ? (user.company as Company | undefined) : undefined;
    return company?.logoUrl ?? '/brand/opasbizz-crm.webp';
  });
  protected readonly initials = computed(() =>
    this.userName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  );

  constructor(private readonly authService: AuthService) {}

  protected canShowItem(item: MenuItem): boolean {
    if (item.permission) {
      return this.authService.hasStructuredPermission(
        item.permission.module,
        item.permission.subModule,
        item.permission.action || 'view'
      );
    }
    return true;
  }

  protected logout(): void {
    this.authService.logout();
  }
}

