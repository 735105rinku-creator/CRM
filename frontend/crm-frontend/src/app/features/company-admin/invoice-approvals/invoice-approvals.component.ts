import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  DepartmentInvoice,
  DepartmentInvoiceApprovalStatus,
  DepartmentInvoiceSourceModule
} from '../../accounts/models/accounts.models';
import { DepartmentInvoiceService } from '../../accounts/services/department-invoice.service';

@Component({
  selector: 'app-invoice-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-approvals.component.html',
  styleUrl: './invoice-approvals.component.scss'
})
export class InvoiceApprovalsComponent implements OnInit {
  private readonly invoicesApi = inject(DepartmentInvoiceService);

  readonly rows = signal<DepartmentInvoice[]>([]);
  readonly loading = signal(false);
  readonly deciding = signal(false);
  readonly error = signal('');
  readonly selected = signal<DepartmentInvoice | null>(null);
  readonly total = signal(0);

  approvalStatus: DepartmentInvoiceApprovalStatus = 'pending';
  sourceModule: DepartmentInvoiceSourceModule | '' = '';
  search = '';
  remarks = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.invoicesApi.getApprovalInvoices({
      companyAdminApprovalStatus: this.approvalStatus,
      sourceModule: this.sourceModule || undefined,
      search: this.search.trim(),
      limit: 100
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        this.rows.set(response.rows || []);
        this.total.set(response.pagination?.total || 0);
      },
      error: error => this.error.set(error?.error?.message || 'Unable to load invoice approvals.')
    });
  }

  open(row: DepartmentInvoice): void {
    this.selected.set(row);
    this.remarks = row.companyAdminApprovalRemarks || '';
  }

  close(): void {
    this.selected.set(null);
    this.remarks = '';
  }

  decide(decision: 'approved' | 'rejected'): void {
    const row = this.selected();
    if (!row || this.deciding()) return;
    if (decision === 'rejected' && !this.remarks.trim()) {
      this.error.set('Rejection reason is required.');
      return;
    }

    this.deciding.set(true);
    this.error.set('');
    this.invoicesApi.decideApproval(row._id, {
      decision,
      remarks: this.remarks.trim()
    }).pipe(finalize(() => this.deciding.set(false))).subscribe({
      next: updated => {
        this.selected.set(updated);
        this.load();
      },
      error: error => this.error.set(error?.error?.message || 'Unable to save the approval decision.')
    });
  }

  viewDocument(row: DepartmentInvoice, index: number): void {
    this.invoicesApi.getDocumentBlob(row._id, index).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.error.set('Unable to open the invoice document.')
    });
  }

  formatDate(value?: string | null): string {
    return value ? new Date(value).toLocaleString() : '—';
  }
}
