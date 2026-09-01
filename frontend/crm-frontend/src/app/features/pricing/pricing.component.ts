import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';
import { ApiService } from '../../core/services/api.service';

interface PricingPlan {
  code: string;
  name: string;
  description?: string;
  priceInr: number;
  payableInr?: number;
  discountInr?: number;
  durationMonths: number;
  employeeLimit: number;
  hrAccountLimit: number;
  features?: string[];
  activeOffer?: {
    code?: string;
    title?: string;
    discountType?: string;
    discountValue?: number;
  } | null;
}

@Component({
  selector: 'app-pricing',
  imports: [CommonModule, PublicFooterComponent, PublicHeaderComponent, RouterLink],
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent {
  private readonly api = inject(ApiService);

  protected readonly plans = signal<PricingPlan[]>([]);
  protected readonly fallbackPlans: PricingPlan[] = [
    { code: 'basic', name: 'Basic', description: 'Lean access for early teams.', priceInr: 999, durationMonths: 1, employeeLimit: 20, hrAccountLimit: 1, features: ['20 employee profiles', '1 HR account', 'CRM pipeline', 'Attendance and leave basics'] },
    { code: 'standard', name: 'Standard', description: 'Balanced growth plan.', priceInr: 2499, durationMonths: 1, employeeLimit: 100, hrAccountLimit: 2, features: ['100 employee profiles', '2 HR accounts', 'CRM + HRMS suite', 'Payroll records'] },
    { code: 'business', name: 'Business', description: 'Unlimited access for larger teams.', priceInr: 4999, durationMonths: 1, employeeLimit: -1, hrAccountLimit: -1, features: ['Unlimited employees', 'Unlimited HR accounts', 'All CRM and HRM modules', 'Priority support'] }
  ];

  constructor() {
    this.api
      .get<{ plans?: PricingPlan[] }>('/api/billing/plans')
      .pipe(catchError(() => of({ plans: this.fallbackPlans })))
      .subscribe((data) => this.plans.set(data.plans?.length ? data.plans : this.fallbackPlans));
  }

  protected formatCurrency(value?: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  protected limitLabel(value?: number): string {
    return Number(value) < 0 ? 'Unlimited' : String(value ?? 0);
  }

  protected offerLabel(plan: PricingPlan): string {
    const offer = plan.activeOffer;
    if (!offer) return '';
    const value = offer.discountType === 'flat' ? this.formatCurrency(offer.discountValue) : `${offer.discountValue || 0}%`;
    return `${value} off · ${offer.code || offer.title}`;
  }
}
