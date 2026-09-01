import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';

@Component({
  selector: 'app-about',
  imports: [PublicFooterComponent, PublicHeaderComponent, RouterLink],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  protected readonly highlights = [
    { value: '4', label: 'Role dashboards' },
    { value: '24/7', label: 'Workspace access' },
    { value: 'CRM + HRMS', label: 'Unified product' }
  ];

  protected readonly pillars = [
    {
      image: '/assets/home/crm-dashboard.jpg',
      title: 'Sales Command Center',
      copy: 'Leads, contacts, deals, quotations and activity reports stay connected for daily sales work.'
    },
    {
      image: '/assets/about/hrm-employees.jpg',
      title: 'Employee Operations',
      copy: 'HR teams manage employees, attendance, leave, payroll records, meetings and communication from one place.'
    },
    {
      image: '/assets/about/role-security.jpg',
      title: 'Scoped Access',
      copy: 'Super admin, company admin, HR and employee users get dashboards aligned with their responsibility.'
    }
  ];
}
