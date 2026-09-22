import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { CookieService } from 'ngx-cookie-service';

import { AuthResponse, AuthService } from '../../../core/auth/auth.service';

interface LoginRoleOption {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
}

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
  private readonly meta = inject(Meta);
  private readonly cookieService = inject(CookieService);

  readonly isPasswordVisible = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly isRoleDropdownOpen = signal(false);

  readonly roleOptions: LoginRoleOption[] = [
    {
      value: 'hr',
      label: 'HR',
      shortLabel: 'HR',
      description: 'Human resources workspace'
    },
    {
      value: 'company_admin',
      label: 'Company Admin',
      shortLabel: 'CA',
      description: 'Company administration workspace'
    },
    {
      value: 'employee',
      label: 'Employee',
      shortLabel: 'EM',
      description: 'Employee workspace'
    },
    {
      value: 'super_admin',
      label: 'Super Admin',
      shortLabel: 'SA',
      description: 'Platform administration'
    }
  ];

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required]],
    role: ['hr', [Validators.required]],
    rememberMe: [false]
  });

  constructor() {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    const rememberedEmail = this.cookieService.get('rememberedEmail');
    const queryEmail = this.route.snapshot.queryParamMap.get('email');
    const email = queryEmail || rememberedEmail;

    if (email) {
      this.loginForm.controls.email.setValue(email);
    }

    this.loginForm.controls.rememberMe.setValue(Boolean(rememberedEmail));

    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.successMessage.set(
        'Company registered successfully. Login with the admin email and password you just created.'
      );
    }

    if (this.route.snapshot.queryParamMap.get('payment') === 'success') {
      this.successMessage.set(
        'Payment successful. Login as Company Admin to open your dashboard.'
      );
      this.loginForm.controls.role.setValue('company_admin');
    }

    const queryRole = this.route.snapshot.queryParamMap.get('role');

    if (queryRole && this.roleOptions.some((option) => option.value === queryRole)) {
      this.loginForm.controls.role.setValue(queryRole);
    }

    if (this.route.snapshot.queryParamMap.get('reset') === 'success') {
      this.successMessage.set(
        'Password reset successful. Login with your new password.'
      );
    }
  }

  get selectedRole(): LoginRoleOption {
    const selectedValue = this.loginForm.controls.role.value;

    return (
      this.roleOptions.find((option) => option.value === selectedValue) ??
      this.roleOptions[0]
    );
  }

  toggleRoleDropdown(): void {
    if (this.isLoading()) {
      return;
    }

    this.isRoleDropdownOpen.update((isOpen) => !isOpen);
  }

  closeRoleDropdown(): void {
    this.isRoleDropdownOpen.set(false);
  }

  selectRole(role: LoginRoleOption): void {
    this.loginForm.controls.role.setValue(role.value);
    this.loginForm.controls.role.markAsTouched();
    this.loginForm.controls.role.markAsDirty();
    this.closeRoleDropdown();
  }

  handleRoleDropdownKeydown(event: KeyboardEvent): void {
    const currentIndex = Math.max(
      0,
      this.roleOptions.findIndex(
        (option) => option.value === this.loginForm.controls.role.value
      )
    );

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleRoleDropdown();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeRoleDropdown();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      if (!this.isRoleDropdownOpen()) {
        this.isRoleDropdownOpen.set(true);
        return;
      }

      const nextIndex = (currentIndex + 1) % this.roleOptions.length;
      this.selectRole(this.roleOptions[nextIndex]);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      if (!this.isRoleDropdownOpen()) {
        this.isRoleDropdownOpen.set(true);
        return;
      }

      const previousIndex =
        (currentIndex - 1 + this.roleOptions.length) %
        this.roleOptions.length;

      this.selectRole(this.roleOptions[previousIndex]);
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

    const { email, password, role, rememberMe } =
      this.loginForm.getRawValue();

    this.closeRoleDropdown();
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(email, password, role, rememberMe).subscribe({
      next: (response) => {
        if (!this.matchesSelectedRole(response, role)) {
          this.authService.logout(false);
          this.errorMessage.set(
            'Selected role does not match this user account.'
          );
          this.isLoading.set(false);
          return;
        }

        if (!rememberMe) {
          this.cookieService.delete('rememberedEmail', '/');
        } else {
          this.cookieService.set('rememberedEmail', email, 30, '/', undefined, true, 'Lax');
        }

        const defaultUrl = this.redirectUrlForRole(role);
        const requestedReturnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl');

        const shouldIgnoreReturnUrl =
          role === 'hr' ||
          role === 'company_admin' ||
          !requestedReturnUrl ||
          requestedReturnUrl === '/dashboard' ||
          requestedReturnUrl === '/login';

        const returnUrl = shouldIgnoreReturnUrl
          ? defaultUrl
          : requestedReturnUrl;

        void this.router.navigateByUrl(returnUrl);
      },
      error: (error: {
        status?: number;
        error?: {
          message?: string;
          data?: {
            requiresPasswordChange?: boolean;
          };
        };
      }) => {
        if (error.error?.data?.requiresPasswordChange) {
          this.errorMessage.set(
            'Password change is required before dashboard access.'
          );
        } else if (error.status === 403) {
          this.errorMessage.set(
            error.error?.message ||
              'Please verify your email before login.'
          );
        } else if (error.status === 423) {
          this.errorMessage.set(
            error.error?.message ||
              'Account is locked. Please check unlock instructions.'
          );
        } else {
          this.errorMessage.set(
            error.error?.message ||
              'Invalid email or password. Please try again.'
          );
        }

        this.isLoading.set(false);
      }
    });
  }

  private matchesSelectedRole(
    response: AuthResponse,
    selectedRole: string
  ): boolean {
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
      employee: '/employee/dashboard',
      logistics: '/logistics/dashboard',
      purchase: '/purchase/dashboard',
      sales: '/sales/dashboard',
      accounts: '/accounts/dashboard',
      super_admin: '/super-admin'
    };

    return roleRedirects[role] || this.authService.getDefaultRedirectUrl();
  }
}