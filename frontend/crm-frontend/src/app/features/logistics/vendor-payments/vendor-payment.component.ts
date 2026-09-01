import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { FormsModule } from '@angular/forms';

interface SelectOption {
  label: string;
  value: string;
}

interface VendorApiRow {
  _id?: string;
  vendorName?: string;
  companyName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  paymentTerms?: string;
  openingPayable?: number;
}

interface VendorPaymentRow {
  id: number | string;
  _id?: string;

  vendor: string;
  vendorOther: string;

  exportInvoiceNo: string;
  invoiceDate: string;

  from: string;
  fromOther: string;

  vendorInvoiceNo: string;
  vendorInvoiceDate: string;

  weight: number;

  totalAmount: number;
  previousAdvance: number;
  paidAmount: number;
  deduction: number;

  status: string;
  statusOther: string;

  remarks: string;
}

@Component({
  selector: 'app-vendor-payment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './vendor-payment.component.html',
  styleUrl: './vendor-payment.component.scss'
})
export class VendorPaymentComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('all');

  protected vendors: SelectOption[] = [
    {
      label: 'Skyline Cargo Services',
      value: 'skyline-cargo'
    },
    {
      label: 'Trans India Logistics',
      value: 'trans-india-logistics'
    },
    {
      label: 'Global Freight Solutions',
      value: 'global-freight-solutions'
    },
    {
      label: 'Fast Move Transport',
      value: 'fast-move-transport'
    },
    {
      label: 'National Roadways',
      value: 'national-roadways'
    },
    {
      label: 'Other',
      value: 'other'
    }
  ];

  protected readonly sourceOptions: SelectOption[] = [
    {
      label: 'Air Cargo',
      value: 'air-cargo'
    },
    {
      label: 'Sea Freight',
      value: 'sea-freight'
    },
    {
      label: 'Transporter',
      value: 'transporter'
    },
    {
      label: 'CHA',
      value: 'cha'
    },
    {
      label: 'Warehouse',
      value: 'warehouse'
    },
    {
      label: 'Other',
      value: 'other'
    }
  ];

  protected readonly statusOptions: SelectOption[] = [
    {
      label: 'Pending',
      value: 'pending'
    },
    {
      label: 'Partial',
      value: 'partial'
    },
    {
      label: 'Paid',
      value: 'paid'
    },
    {
      label: 'On Hold',
      value: 'on-hold'
    },
    {
      label: 'Cancelled',
      value: 'cancelled'
    },
    {
      label: 'Other',
      value: 'other'
    }
  ];

  protected form: VendorPaymentRow = this.emptyPayment();

  private vendorRecords: VendorApiRow[] = [];

  protected readonly payments = signal<VendorPaymentRow[]>([]);

  ngOnInit(): void {
    this.loadVendors();
    this.loadPayments();
  }

  protected loadPayments(): void {
    this.isLoading.set(true);
    this.api.get<any>('/logistics/vendor-payments', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => this.payments.set(this.normalizePayments(response?.data || response?.records || [])),
        error: (error: any) => window.alert(error?.error?.message || 'Unable to load vendor payments.')
      });
  }

  private loadVendors(): void {
    this.api.get<any>('/logistics/vendors', { page: 1, limit: 100, status: 'active' }).subscribe({
      next: (response: any) => {
        const rows = this.extractRows<VendorApiRow>(response);
        this.vendorRecords = rows;
        const options = rows
          .filter((row: VendorApiRow) => row?._id)
          .map((row: VendorApiRow) => ({ label: row.vendorName || row.companyName || 'Vendor', value: row._id! }));
        if (options.length) {
          this.vendors = [...options, { label: 'Other', value: 'other' }];
        }
      },
      error: () => undefined
    });
  }

  protected onVendorSelected(): void {
    const vendor = this.vendorRecords.find((row) => row._id === this.form.vendor);

    if (!vendor) {
      if (!this.form.vendor) {
        this.form.vendorOther = '';
        this.form.previousAdvance = 0;
      }
      return;
    }

    this.form.vendorOther = vendor.vendorName || vendor.companyName || this.form.vendorOther;
    this.form.previousAdvance = vendor.openingPayable ?? this.form.previousAdvance;
  }

  protected readonly filteredPayments = computed(() => {
    const search = this.searchTerm()
      .trim()
      .toLowerCase();

    const status = this.statusFilter();

    return this.payments().filter((payment) => {

      const vendorName =
        this.resolveVendorName(payment)
          .toLowerCase();

      const matchesSearch =
        !search ||
        vendorName.includes(search) ||
        payment.exportInvoiceNo
          .toLowerCase()
          .includes(search) ||
        payment.vendorInvoiceNo
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        status === 'all' ||
        payment.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  protected readonly summary = computed(() => {

    const payments = this.payments();

    const totalAmount = payments.reduce(
      (sum, payment) =>
        sum + this.number(payment.totalAmount),
      0
    );

    const previousAdvance = payments.reduce(
      (sum, payment) =>
        sum + this.number(payment.previousAdvance),
      0
    );

    const paidAmount = payments.reduce(
      (sum, payment) =>
        sum + this.number(payment.paidAmount),
      0
    );

    const deduction = payments.reduce(
      (sum, payment) =>
        sum + this.number(payment.deduction),
      0
    );

    const supplierBalance = payments.reduce(
      (sum, payment) =>
        sum + this.getSupplierBalance(payment),
      0
    );

    return {
      totalAmount,
      previousAdvance,
      paidAmount,
      deduction,
      supplierBalance
    };
  });

  protected get currentPendingAmount(): number {
    return this.getPendingAmount(this.form);
  }

  protected get currentSupplierBalance(): number {
    return this.getSupplierBalance(this.form);
  }

  protected getPendingAmount(
    payment: VendorPaymentRow
  ): number {

    return Math.max(
      0,
      this.number(payment.totalAmount) -
      this.number(payment.previousAdvance)
    );
  }

  protected getSupplierBalance(
    payment: VendorPaymentRow
  ): number {

    return Math.max(
      0,
      this.getPendingAmount(payment) -
      this.number(payment.paidAmount) -
      this.number(payment.deduction)
    );
  }

  protected addPayment(): void {

    if (!this.form.vendor || this.form.vendor === 'other') {
      alert('Please select saved Vendor from vendor master.');
      return;
    }

    if (!this.form.exportInvoiceNo.trim()) {
      alert('Please enter Export Invoice No.');
      return;
    }

    if (!this.form.invoiceDate) {
      alert('Please select Invoice Date.');
      return;
    }

    if (!this.form.vendorInvoiceNo.trim()) {
      alert('Please enter Vendor Invoice No.');
      return;
    }

    if (!this.form.vendorInvoiceDate) {
      alert('Please select Vendor Invoice Date.');
      return;
    }

    if (this.form.totalAmount <= 0) {
      alert('Total Amount must be greater than zero.');
      return;
    }

    const payload = {
      vendorId: this.form.vendor,
      exportInvoiceNo: this.form.exportInvoiceNo.trim(),
      invoiceDate: this.form.invoiceDate,
      from: this.form.from === 'other' ? this.form.fromOther || 'Other' : this.form.from,
      vendorInvoiceNo: this.form.vendorInvoiceNo.trim(),
      vendorInvoiceDate: this.form.vendorInvoiceDate,
      weight: Number(this.form.weight || 0),
      weightUnit: 'kg',
      totalAmount: Number(this.form.totalAmount || 0),
      previousAdvance: Number(this.form.previousAdvance || 0),
      paidAmount: Number(this.form.paidAmount || 0),
      deduction: Number(this.form.deduction || 0),
      status: this.form.status === 'on-hold' ? 'hold' : this.form.status,
      statusOther: this.form.statusOther,
      shipmentNumber: this.form.exportInvoiceNo,
      currency: 'INR',
      remarks: this.form.remarks.trim() || 'Created from vendor payment form.'
    };

    this.isSaving.set(true);
    this.api.post('/logistics/vendor-payments', payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => { this.resetForm(); this.loadPayments(); window.alert('Vendor payment saved successfully.'); },
        error: (error: any) => window.alert(error?.error?.message || 'Unable to save vendor payment.')
      });
  }

  protected resetForm(): void {
    this.form = this.emptyPayment();
  }

  protected editPayment(
    payment: VendorPaymentRow
  ): void {

    this.form = {
      ...payment
    };

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  protected deletePayment(
    payment: VendorPaymentRow
  ): void {

    const confirmed = window.confirm(
      `Delete vendor payment ${payment.vendorInvoiceNo}?`
    );

    if (!confirmed) {
      return;
    }

    if (payment._id) {
      this.api.delete(`/logistics/vendor-payments/${payment._id}`).subscribe({
        next: () => { this.loadPayments(); window.alert('Vendor payment deleted successfully.'); },
        error: (error: any) => window.alert(error?.error?.message || 'Unable to delete vendor payment.')
      });
      return;
    }

    this.payments.update((current) => current.filter((item) => item.id !== payment.id));
  }

  protected viewPayment(
    payment: VendorPaymentRow
  ): void {

    console.log(
      'View vendor payment',
      payment
    );
  }

  protected exportPayments(): void {

    console.log(
      'Export vendor payment records',
      this.filteredPayments()
    );
  }

  protected setSearch(
    value: string
  ): void {

    this.searchTerm.set(value);
  }

  protected setStatusFilter(
    value: string
  ): void {

    this.statusFilter.set(value);
  }

  protected clearFilters(): void {

    this.searchTerm.set('');
    this.statusFilter.set('all');
  }


  private extractRows<T>(response: any): T[] {
    if (Array.isArray(response)) return response;
    const data = response?.data;
    if (Array.isArray(data)) return data;
    return data?.data || data?.records || data?.vendors || data?.items || response?.records || response?.vendors || response?.items || [];
  }
  private normalizePayments(rows: any[]): VendorPaymentRow[] {
    return rows.map((row, index) => ({
      _id: row._id,
      id: row._id || index + 1,
      vendor: row.vendorId?._id || row.vendorId || '',
      vendorOther: row.vendorName || row.vendorId?.vendorName || '',
      exportInvoiceNo: row.exportInvoiceNo || row.shipmentNumber || '',
      invoiceDate: row.invoiceDate ? String(row.invoiceDate).slice(0, 10) : '',
      from: row.from || '',
      fromOther: '',
      vendorInvoiceNo: row.vendorInvoiceNo || '',
      vendorInvoiceDate: row.vendorInvoiceDate ? String(row.vendorInvoiceDate).slice(0, 10) : '',
      weight: Number(row.weight || 0),
      totalAmount: Number(row.totalAmount || 0),
      previousAdvance: Number(row.previousAdvance || 0),
      paidAmount: Number(row.paidAmount || 0),
      deduction: Number(row.deduction || 0),
      status: row.status === 'hold' ? 'on-hold' : row.status || 'pending',
      statusOther: row.statusOther || '',
      remarks: row.remarks || ''
    }));
  }
  protected resolveVendorName(
    payment: VendorPaymentRow
  ): string {

    if (payment.vendor === 'other') {
      return payment.vendorOther || 'Other';
    }

    return (
      this.vendors.find(
        (vendor) =>
          vendor.value === payment.vendor
      )?.label || payment.vendor
    );
  }

  protected resolveSourceName(
    payment: VendorPaymentRow
  ): string {

    if (payment.from === 'other') {
      return payment.fromOther || 'Other';
    }

    return (
      this.sourceOptions.find(
        (option) =>
          option.value === payment.from
      )?.label || payment.from
    );
  }

  protected resolveStatusName(
    payment: VendorPaymentRow
  ): string {

    if (payment.status === 'other') {
      return payment.statusOther || 'Other';
    }

    return (
      this.statusOptions.find(
        (option) =>
          option.value === payment.status
      )?.label || payment.status
    );
  }

  protected statusClass(
    status: string
  ): string {

    return status
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  protected formatCurrency(
    value: number
  ): string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }
    ).format(
      this.number(value)
    );
  }

  protected formatDate(
    date: string
  ): string {

    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    ).format(
      new Date(`${date}T00:00:00`)
    );
  }

  private emptyPayment(): VendorPaymentRow {

    return {
      id: 0,

      vendor: '',
      vendorOther: '',

      exportInvoiceNo: '',
      invoiceDate: '',

      from: '',
      fromOther: '',

      vendorInvoiceNo: '',
      vendorInvoiceDate: '',

      weight: 0,

      totalAmount: 0,
      previousAdvance: 0,
      paidAmount: 0,
      deduction: 0,

      status: 'pending',
      statusOther: '',

      remarks: ''
    };
  }

  private number(
    value: unknown
  ): number {

    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : 0;
  }
}