import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  protected submit(): void {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.message.set('');
    this.error.set('');
    this.api.post('/auth/forgot-password', this.form.getRawValue()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.message.set('If this email exists, a reset link has been sent from Opas Bizz pvt ltd.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.isLoading.set(false);
        this.error.set(this.cleanErrorMessage(error.error?.message));
      }
    });
  }

  private cleanErrorMessage(message = ''): string {
    if (/gmail|smtp|535|authentication|password not accepted|badcredentials/i.test(message)) {
      return 'Super Admin Gmail SMTP is not authenticated. Update the Gmail app password, restart backend, then send the reset link again.';
    }

    return message || 'Unable to send reset link right now.';
  }}
