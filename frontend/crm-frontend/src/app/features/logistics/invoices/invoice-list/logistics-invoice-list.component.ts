import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';

interface InvoiceRow {
  _id?: string;
  invoiceNumber?: string;
  customerName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  shipmentNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  invoiceType?: string;
  currency?: string;
  invoiceTotal?: number;
  amountReceived?: number;
  balanceDue?: number;
  paymentStatus?: string;
  status?: string;
  createdAt?: string;
}

interface PageResult<T> {
  data?: T[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

interface InvoiceSummary {
  totalInvoices?: number;
  totalBilled?: number;
  totalReceived?: number;
  totalOutstanding?: number;
  draft?: number;
  issued?: number;
}

@Component({
  selector: 'app-logistics-invoice-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics-invoice-list.component.html',
  styleUrl: './logistics-invoice-list.component.scss'
})
export class LogisticsInvoiceListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly invoices = signal<InvoiceRow[]>([]);
  protected readonly summary = signal<InvoiceSummary>({});
  protected readonly isLoading = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('');
  protected readonly paymentFilter = signal('');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly totalRecords = signal(0);
  protected readonly serverTotalPages = signal(1);

  protected readonly filteredInvoices = computed(() => this.invoices());

  ngOnInit(): void {
    this.loadSummary();
    this.loadInvoices();
  }

  protected loadInvoices(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.get<PageResult<InvoiceRow>>('/logistics/invoices', {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchTerm().trim(),
      status: this.statusFilter(),
      paymentStatus: this.paymentFilter(),
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const rows = response?.data || [];
          const pagination = response?.pagination || {};
          this.invoices.set(rows);
          this.totalRecords.set(Number(pagination.total ?? rows.length));
          this.serverTotalPages.set(Math.max(1, Number(pagination.totalPages || 1)));
        },
        error: (error: { error?: { message?: string; errors?: Array<{ message?: string }> } }) => {
          this.invoices.set([]);
          this.totalRecords.set(0);
          this.errorMessage.set(
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Unable to load logistics invoices.'
          );
        }
      });
  }

  protected loadSummary(): void {
    this.api.get<InvoiceSummary>('/logistics/invoices/summary')
      .subscribe({
        next: (response) => this.summary.set(response || {}),
        error: () => this.summary.set({})
      });
  }

  protected applyFilters(): void {
    this.currentPage.set(1);
    this.loadInvoices();
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.paymentFilter.set('');
    this.currentPage.set(1);
    this.loadInvoices();
  }

  protected nextPage(): void {
    if (this.currentPage() >= this.serverTotalPages()) return;
    this.currentPage.update((page) => page + 1);
    this.loadInvoices();
  }

  protected previousPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((page) => page - 1);
    this.loadInvoices();
  }

  protected newInvoice(): void {
    void this.router.navigate(['/logistics/invoices/new']);
  }

  protected editInvoice(invoice: InvoiceRow): void {
    if (!invoice._id) return;
    void this.router.navigate(['/logistics/invoices/new'], { queryParams: { invoiceId: invoice._id } });
  }

  protected viewInvoice(invoice: InvoiceRow): void {
    const text = [
      `Invoice: ${invoice.invoiceNumber || '-'}`,
      `Customer: ${invoice.customerName || '-'}`,
      `Shipment: ${invoice.shipmentNumber || '-'}`,
      `Date: ${this.formatDate(invoice.invoiceDate)}`,
      `Total: ${this.formatCurrency(invoice.invoiceTotal, invoice.currency)}`,
      `Received: ${this.formatCurrency(invoice.amountReceived, invoice.currency)}`,
      `Balance: ${this.formatCurrency(invoice.balanceDue, invoice.currency)}`,
      `Status: ${this.label(invoice.status)}`,
      `Payment: ${this.label(invoice.paymentStatus)}`
    ].join('\n');

    window.alert(text);
  }

  protected deleteInvoice(invoice: InvoiceRow): void {
    if (!invoice._id || this.isDeleting()) return;
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber || ''}?`)) return;

    this.isDeleting.set(true);
    this.message.set('');
    this.errorMessage.set('');

    this.api.delete(`/logistics/invoices/${invoice._id}`)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.message.set(`Invoice ${invoice.invoiceNumber || ''} deleted successfully.`);
          this.loadSummary();
          this.loadInvoices();
        },
        error: (error: { error?: { message?: string; errors?: Array<{ message?: string }> } }) => {
          this.errorMessage.set(
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Unable to delete invoice.'
          );
        }
      });
  }

  protected exportInvoices(): void {
    const rows = this.invoices();
    if (!rows.length) {
      this.errorMessage.set('There are no invoices to export.');
      return;
    }

    const header = ['Invoice Number', 'Customer', 'Shipment', 'Invoice Date', 'Due Date', 'Total', 'Received', 'Balance', 'Status', 'Payment'];
    const body = rows.map((row) => [
      row.invoiceNumber || '', row.customerName || '', row.shipmentNumber || '',
      this.formatDate(row.invoiceDate), this.formatDate(row.dueDate),
      this.number(row.invoiceTotal), this.number(row.amountReceived), this.number(row.balanceDue),
      this.label(row.status), this.label(row.paymentStatus)
    ]);
    const csv = [header, ...body].map((line) => line.map((value) => this.csvValue(value)).join(',')).join('\n');
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `logistics-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  protected formatCurrency(value: unknown, currency = 'INR'): string {
    const code = String(currency || 'INR').toUpperCase();
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(this.number(value));
    } catch {
      return `${code} ${this.number(value).toFixed(2)}`;
    }
  }

  protected formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  protected label(value?: string): string {
    return String(value || '-')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  protected statusClass(value?: string): string {
    return String(value || 'draft').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private number(value: unknown): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  private csvValue(value: unknown): string {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}
