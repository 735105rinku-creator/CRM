import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-support-ticket-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (mode === 'launcher') {
      <button type="button" class="support-launcher" (click)="isOpen.set(true)">
        <span class="support-launcher__icon" aria-hidden="true">?</span>
        <span>Raise Support Ticket</span>
      </button>
      @if (isOpen()) {
        <div class="support-modal-backdrop" role="presentation" (click)="isOpen.set(false)">
          <section class="support-ticket-form support-modal" role="dialog" aria-modal="true" aria-labelledby="support-modal-title" (click)="$event.stopPropagation()">
            <button type="button" class="support-modal__close" aria-label="Close support ticket form" (click)="isOpen.set(false)">×</button>
            <ng-container *ngTemplateOutlet="ticketForm"></ng-container>
          </section>
        </div>
      }
    } @else {
      <section class="support-ticket-form support-page-card">
        <ng-container *ngTemplateOutlet="ticketForm"></ng-container>
      </section>
    }
    <ng-template #ticketForm>
      <div class="panel-heading">
        <div>
          <h2 id="support-modal-title">Raise a Support Ticket</h2>
          <p>Your ticket will be routed to the right support team automatically.</p>
        </div>
      </div>
      @if (message()) { <div class="notice">{{ message() }}</div> }
      <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()">
        <label class="span-2">Subject<input formControlName="subject" placeholder="What do you need help with?" /></label>
        <label>Category<select formControlName="category"><option value="General">General</option><option value="Technical">Technical</option><option value="Billing">Billing</option><option value="HR">HR</option></select></label>
        <label>Priority<select formControlName="priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
        <label class="span-2">Description<textarea formControlName="description" rows="6" placeholder="Describe the issue and any useful details"></textarea></label>
        <button class="primary-action" type="submit" [disabled]="form.invalid || isSaving()">{{ isSaving() ? 'Submitting...' : 'Submit Ticket' }}</button>
      </form>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .support-page-card, .support-modal { box-sizing: border-box; width: min(100%, 1100px); padding: 28px; border: 1px solid #d7e2ee; border-radius: 18px; background: #fff; box-shadow: 0 14px 35px rgba(27, 48, 74, .10); }
    .panel-heading { display: flex; justify-content: space-between; margin-bottom: 22px; }
    .panel-heading h2 { margin: 0 0 6px; color: #142238; font-size: 24px; line-height: 1.2; }
    .panel-heading p { margin: 0; color: #6d7e92; font-size: 14px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    label { display: flex; min-width: 0; flex-direction: column; gap: 8px; color: #33455c; font-size: 13px; font-weight: 700; }
    .span-2 { grid-column: 1 / -1; }
    input, select, textarea { box-sizing: border-box; width: 100%; border: 1px solid #cbd8e6; border-radius: 10px; background: #f8fbfe; color: #17263b; padding: 12px 13px; font: inherit; font-weight: 500; outline: none; }
    textarea { min-height: 130px; resize: vertical; }
    input:focus, select:focus, textarea:focus { border-color: #397be8; box-shadow: 0 0 0 3px rgba(57, 123, 232, .14); }
    .primary-action { grid-column: 1 / -1; justify-self: start; border: 0; border-radius: 10px; background: #2674e8; color: #fff; padding: 12px 22px; font: inherit; font-weight: 700; cursor: pointer; }
    .primary-action:disabled { cursor: not-allowed; opacity: .55; }
    .notice { margin: 0 0 16px; border-radius: 10px; background: #edf8f3; color: #15734d; padding: 11px 13px; font-size: 13px; }
    .support-launcher { position: fixed; right: 24px; bottom: 24px; z-index: 1000; display: inline-flex; align-items: center; gap: 9px; border: 0; border-radius: 999px; background: #1769d2; color: #fff; padding: 13px 18px 13px 13px; box-shadow: 0 12px 28px rgba(23, 105, 210, .28); font: inherit; font-weight: 800; cursor: pointer; }
    .support-launcher__icon { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; background: #fff; color: #1769d2; }
    .support-modal-backdrop { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 24px; background: rgba(9, 22, 40, .52); }
    .support-modal { position: relative; max-height: calc(100vh - 48px); overflow: auto; }
    .support-modal__close { position: absolute; top: 14px; right: 16px; border: 0; background: transparent; color: #6d7e92; font-size: 28px; line-height: 1; cursor: pointer; }
    @media (max-width: 640px) { .support-page-card, .support-modal { padding: 20px; } .form-grid { grid-template-columns: 1fr; } .span-2 { grid-column: auto; } .support-launcher { right: 14px; bottom: 14px; } }
  `]
})
export class SupportTicketFormComponent {
  @Input() mode: 'page' | 'launcher' = 'page';
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  protected readonly isSaving = signal(false);
  protected readonly message = signal('');
  protected readonly isOpen = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(180)]],
    category: ['General'],
    priority: ['medium'],
    description: ['', [Validators.maxLength(5000)]]
  });

  protected submit(): void {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    this.message.set('');
    this.api.post('/api/support/tickets', this.form.getRawValue())
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.form.reset({ subject: '', category: 'General', priority: 'medium', description: '' });
          this.message.set('Ticket submitted successfully. Your support team has been notified.');
          this.isOpen.set(false);
        },
        error: (error: { error?: { message?: string } }) => this.message.set(error.error?.message || 'Unable to submit ticket.')
      });
  }
}