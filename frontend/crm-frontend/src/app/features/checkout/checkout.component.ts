import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface CheckoutPlan {
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
}

interface CheckoutOrderResponse {
  order: { id: string; amount: number; currency: string; gatewayMode?: string };
  payment: { _id?: string; razorpayOrderId?: string; payableInr?: number };
  plan: CheckoutPlan;
  keyId?: string;
  companyName?: string;
}

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, RouterLink, PublicHeaderComponent, PublicFooterComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly selectedPlanCode = signal(this.route.snapshot.queryParamMap.get('plan') || 'basic');
  protected readonly adminEmail = signal(this.route.snapshot.queryParamMap.get('email') || this.auth.currentUser()?.email || '');
  protected readonly plans = signal<CheckoutPlan[]>([]);
  protected readonly selectedPlan = signal<CheckoutPlan | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isPaying = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');

  constructor() {
    this.loadPlans();
  }

  protected formatCurrency(value?: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  protected limitLabel(value?: number): string {
    return Number(value) < 0 ? 'Unlimited' : String(value ?? 0);
  }

  protected payNow(): void {
    const plan = this.selectedPlan();
    if (!plan || this.isPaying()) return;

    this.isPaying.set(true);
    this.error.set('');
    this.message.set('Creating secure checkout order...');

    this.api.post<CheckoutOrderResponse>('/api/billing/checkout/order', { planCode: plan.code }).pipe(
      finalize(() => this.isPaying.set(false))
    ).subscribe({
      next: (checkout) => this.openCheckout(checkout),
      error: (error: { error?: { message?: string } }) => {
        this.message.set('');
        this.error.set(error.error?.message || 'Unable to start checkout. Please login/register again.');
      }
    });
  }

  private loadPlans(): void {
    this.isLoading.set(true);
    this.api.get<{ plans?: CheckoutPlan[] }>('/api/billing/plans').pipe(
      catchError(() => of({ plans: [] })),
      finalize(() => this.isLoading.set(false))
    ).subscribe((data) => {
      const rows = data.plans || [];
      this.plans.set(rows);
      this.selectedPlan.set(rows.find((plan) => plan.code === this.selectedPlanCode()) || rows[0] || null);
    });
  }

  private openCheckout(checkout: CheckoutOrderResponse): void {
    if (checkout.order.gatewayMode === 'demo' || !checkout.keyId || checkout.keyId === 'rzp_test_demo') {
      this.message.set('Demo Razorpay mode: activating subscription...');
      this.verifyPayment({
        razorpay_order_id: checkout.order.id,
        razorpay_payment_id: `demo_payment_${Date.now()}`,
        razorpay_signature: 'demo_signature'
      });
      return;
    }

    this.loadRazorpayScript().then(() => {
      if (!window.Razorpay) {
        this.error.set('Razorpay checkout script is not available.');
        this.message.set('');
        return;
      }

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.order.amount,
        currency: checkout.order.currency || 'INR',
        name: checkout.companyName || 'Opas Bizz CRM',
        description: `${checkout.plan.name} subscription`,
        order_id: checkout.order.id,
        prefill: { email: this.adminEmail() },
        theme: { color: '#4c1d95' },
        handler: (response: unknown) => this.verifyPayment(response as Record<string, string>)
      });
      razorpay.open();
    });
  }

  private verifyPayment(payload: Record<string, string>): void {
    this.isPaying.set(true);
    this.api.post('/api/billing/checkout/verify', payload).pipe(finalize(() => this.isPaying.set(false))).subscribe({
      next: () => {
        this.message.set('Payment successful. Opening Company Admin login...');
        this.auth.logout(false);
        setTimeout(() => void this.router.navigate(['/login'], {
          queryParams: { email: this.adminEmail(), role: 'company_admin', payment: 'success' }
        }), 700);
      },
      error: (error: { error?: { message?: string } }) => {
        this.message.set('');
        this.error.set(error.error?.message || 'Payment verification failed. Please try again.');
      }
    });
  }

  private loadRazorpayScript(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }
}
