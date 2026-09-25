import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface SupportTicket {
  _id?: string;
  ticketNumber?: string;
  requesterName?: string;
  requesterEmail?: string;
  subject?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-support-ticket-inbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="ticket-inbox">
      <header class="ticket-inbox__header">
        <div>
          <p class="ticket-inbox__eyebrow">Support Desk</p>
          <h2>Tickets Assigned To You</h2>
          <span>Review tickets routed to your team and track their current status.</span>
        </div>
        <button type="button" class="ticket-inbox__refresh" (click)="load()" [disabled]="isLoading()">{{ isLoading() ? 'Loading...' : 'Refresh' }}</button>
      </header>
      <div class="ticket-inbox__summary"><span><strong>{{ tickets().length }}</strong>Total tickets</span><span><strong>{{ openCount() }}</strong>Open</span><span><strong>{{ urgentCount() }}</strong>Urgent</span></div>
      <div class="ticket-inbox__table-wrap">
        <table>
          <thead><tr><th>Ticket</th><th>Requester</th><th>Description</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            @for (ticket of tickets(); track ticket._id || ticket.ticketNumber) {
              <tr><td><strong>{{ ticket.ticketNumber || 'Ticket' }}</strong><small>{{ ticket.subject }}</small></td><td>{{ ticket.requesterName || ticket.requesterEmail || '-' }}</td><td class="ticket-description">{{ ticket.description || 'No description provided.' }}</td><td>{{ ticket.category || 'General' }}</td><td><span class="ticket-badge" [class]="'priority-' + ticket.priority">{{ ticket.priority || 'medium' }}</span></td><td><span class="ticket-status" [class]="'status-' + ticket.status">{{ ticket.status || 'open' }}</span></td><td>{{ formatDate(ticket.createdAt) }}</td></tr>
            } @empty {
              <tr><td colspan="7" class="ticket-inbox__empty">No tickets are waiting for your team.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .ticket-inbox { width: min(100%, 1100px); border: 1px solid #d9e4ef; border-radius: 18px; background: #fff; box-shadow: 0 14px 35px rgba(27, 48, 74, .09); overflow: hidden; }
    .ticket-inbox__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 26px 28px 20px; }
    .ticket-inbox__eyebrow { margin: 0 0 6px; color: #2876df; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h2 { margin: 0 0 7px; color: #142238; font-size: 25px; }
    .ticket-inbox__header span { color: #718196; font-size: 14px; }
    .ticket-inbox__refresh { border: 0; border-radius: 9px; background: #2674e8; color: #fff; padding: 10px 16px; font: inherit; font-weight: 700; cursor: pointer; }
    .ticket-inbox__refresh:disabled { opacity: .6; cursor: wait; }
    .ticket-inbox__summary { display: flex; gap: 12px; padding: 0 28px 22px; }
    .ticket-inbox__summary span { min-width: 120px; border: 1px solid #e1e9f2; border-radius: 11px; background: #f7faff; padding: 12px 14px; color: #718196; font-size: 12px; }
    .ticket-inbox__summary strong { display: block; margin-bottom: 4px; color: #1b2f49; font-size: 21px; }
    .ticket-inbox__table-wrap { overflow-x: auto; border-top: 1px solid #e4ebf3; }
    table { width: 100%; border-collapse: collapse; min-width: 980px; }
    th, td { padding: 15px 18px; border-bottom: 1px solid #edf1f6; text-align: left; color: #40546d; font-size: 13px; white-space: nowrap; vertical-align: top; }
    th { background: #f7faff; color: #6d7e92; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; }
    td strong, td small { display: block; } td strong { color: #1b2f49; } td small { max-width: 220px; overflow: hidden; color: #718196; text-overflow: ellipsis; }
    .ticket-description { width: 360px; max-width: 360px; white-space: pre-wrap; overflow-wrap: anywhere; color: #273d58; line-height: 1.55; }
    .ticket-badge, .ticket-status { display: inline-flex; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 800; text-transform: capitalize; }
    .priority-low { background: #edf8f3; color: #21815c; } .priority-medium { background: #eef4ff; color: #2765bd; } .priority-high { background: #fff5df; color: #a46708; } .priority-urgent { background: #fff0f0; color: #c23b3b; }
    .status-open { background: #eef4ff; color: #2765bd; } .status-pending { background: #fff5df; color: #a46708; } .status-resolved, .status-closed { background: #edf8f3; color: #21815c; }
    .ticket-inbox__empty { padding: 45px; color: #8594a7; text-align: center; }
    @media (max-width: 640px) { .ticket-inbox__header { display: block; } .ticket-inbox__refresh { margin-top: 16px; } .ticket-inbox__summary { overflow-x: auto; } }
  `]
})
export class SupportTicketInboxComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly tickets = signal<SupportTicket[]>([]);
  protected readonly isLoading = signal(false);

  ngOnInit(): void { this.load(); }

  protected load(): void {
    this.isLoading.set(true);
    this.api.get<{ tickets?: SupportTicket[] }>('/api/support/tickets')
      .pipe(catchError(() => of({ tickets: [] })),)
      .subscribe((response) => { this.tickets.set(response.tickets || []); this.isLoading.set(false); });
  }

  protected openCount(): number { return this.tickets().filter((ticket) => ticket.status === 'open').length; }
  protected urgentCount(): number { return this.tickets().filter((ticket) => ticket.priority === 'urgent').length; }
  protected formatDate(value?: string): string { return value ? new Date(value).toLocaleDateString() : '-'; }
}