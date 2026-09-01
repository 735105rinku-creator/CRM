import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly token = signal(this.route.snapshot.queryParamMap.get('token') || '');

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=]).{8,32}$/)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordsMatch });

  protected submit(): void {
    if (!this.token()) {
      this.error.set('Reset token is missing. Please request a new reset link.');
      return;
    }
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    this.message.set('');
    this.api.post('/auth/reset-password', { token: this.token(), ...this.form.getRawValue() }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.message.set('Password reset successful. Opening login page...');
        setTimeout(() => void this.router.navigate(['/login'], { queryParams: { reset: 'success' } }), 900);
      },
      error: (error: { error?: { message?: string } }) => {
        this.isLoading.set(false);
        this.error.set(error.error?.message || 'Unable to reset password.');
      }
    });
  }

  private passwordsMatch(control: AbstractControl): Record<string, boolean> | null {
    return control.get('password')?.value !== control.get('confirmPassword')?.value ? { passwordMismatch: true } : null;
  }
}
