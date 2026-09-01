import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthResponse, AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isPasswordVisible = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required]],
    role: ['hr', [Validators.required]],
    rememberMe: [true]
  });

  constructor() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const queryEmail = this.route.snapshot.queryParamMap.get('email');
    const email = queryEmail || rememberedEmail;

    if (email) {
      this.loginForm.controls.email.setValue(email);
    }

    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.successMessage.set('Company registered successfully. Login with the admin email and password you just created.');
    }

    if (this.route.snapshot.queryParamMap.get('payment') === 'success') {
      this.successMessage.set('Payment successful. Login as Company Admin to open your dashboard.');
      this.loginForm.controls.role.setValue('company_admin');
    }

    const queryRole = this.route.snapshot.queryParamMap.get('role');
    if (queryRole) {
      this.loginForm.controls.role.setValue(queryRole);
    }

    if (this.route.snapshot.queryParamMap.get('reset') === 'success') {
      this.successMessage.set('Password reset successful. Login with your new password.');
    }
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((isVisible) => !isVisible);
  }

  submit(): void {
    if (this.loginForm.invalid || this.isLoading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password, role, rememberMe } = this.loginForm.getRawValue();
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(email, password, role).subscribe({
      next: (response) => {
        if (!this.matchesSelectedRole(response, role)) {
          this.authService.logout(false);
          this.errorMessage.set('Selected role does not match this user account.');
          this.isLoading.set(false);
          return;
        }

        if (!rememberMe) {
          localStorage.removeItem('rememberedEmail');
        } else {
          localStorage.setItem('rememberedEmail', email);
        }

        const defaultUrl = this.redirectUrlForRole(role);
        const requestedReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const shouldIgnoreReturnUrl =
          role === 'hr' ||
          !requestedReturnUrl ||
          requestedReturnUrl === '/dashboard' ||
          requestedReturnUrl === '/login';
        const returnUrl = shouldIgnoreReturnUrl ? defaultUrl : requestedReturnUrl;
        void this.router.navigateByUrl(returnUrl);
      },
      error: (error: { status?: number; error?: { message?: string; data?: { requiresPasswordChange?: boolean } } }) => {
        if (error.error?.data?.requiresPasswordChange) {
          this.errorMessage.set('Password change is required before dashboard access.');
        } else if (error.status === 403) {
          this.errorMessage.set(error.error?.message || 'Please verify your email before login.');
        } else if (error.status === 423) {
          this.errorMessage.set(error.error?.message || 'Account is locked. Please check unlock instructions.');
        } else {
          this.errorMessage.set(error.error?.message || 'Invalid email or password. Please try again.');
        }
        this.isLoading.set(false);
      }
    });
  }

  private matchesSelectedRole(response: AuthResponse, selectedRole: string): boolean {
    const user = response.user;

    if (!user) {
      return true;
    }

    const roles = new Set<string>();

    if (user.role) {
      roles.add(user.role);
    }

    user.roles?.forEach((userRole) => roles.add(userRole));

    return roles.has('super_admin') || roles.has(selectedRole);
  }

  private redirectUrlForRole(role: string): string {
    const roleRedirects: Record<string, string> = {
      hr: '/hr-dashboard',
      employee: '/logistics/dashboard',
      accounts: '/invoices',
      super_admin: '/super-admin'
    };

    return roleRedirects[role] || this.authService.getDefaultRedirectUrl();
  }
}




