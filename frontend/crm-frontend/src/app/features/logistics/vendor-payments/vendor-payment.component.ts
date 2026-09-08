import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

/* ============================================================
   SELECT OPTION
============================================================ */

interface SelectOption {
  label: string;
  value: string;
}

/* ============================================================
   VENDOR LOOKUP ROW

   The user sees vendorName.
   _id stays internal and is sent automatically to backend.
============================================================ */

interface VendorApiRow {
  _id?: string;
  vendorCode?: string;
  vendorName?: string;
  companyName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  paymentTerms?: string;
  openingPayable?: number;
  status?: string;
}

interface PaymentProof {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/* ============================================================
   VENDOR PAYMENT ROW
============================================================ */

interface EditAuditEntry { changedBy?: string; changedByName?: string; changedAt?: string; }

interface VendorPaymentRow {
  editHistory?: EditAuditEntry[];
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
  paymentProof?: PaymentProof | null;

  remarks: string;
}

/* ============================================================
   COMPONENT
============================================================ */

@Component({
  selector: 'app-vendor-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-payment.component.html',
  styleUrl: './vendor-payment.component.scss'
})
export class VendorPaymentComponent implements OnInit {

  private readonly api = inject(ApiService);

  /* ============================================================
     FILE INPUT REF

     Needed so we can clear the native <input type="file"> value
     when the form is reset — clearing the signal alone does not
     clear what the browser displays as the selected filename.

     Add `#fileInput` on the file input element in the template:
       <input type="file" #fileInput (change)="onPaymentProofSelected($event)">
  ============================================================ */

  @ViewChild('paymentForm')
  private paymentFormRef?: ElementRef<HTMLElement>;

  @ViewChild('fileInput')
  private fileInputRef?: ElementRef<HTMLInputElement>;

  /* ============================================================
     LOADING STATES
  ============================================================ */

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isVendorLoading = signal(false);
  protected readonly vendorLoadError = signal('');

  protected readonly selectedPaymentProof = signal<File | null>(null);
  protected readonly paymentProofError = signal('');

  /* ============================================================
     EDIT MODE

     null  -> form is in "create new" mode, save = POST
     value -> form is editing an existing payment, save = PATCH
  ============================================================ */

  protected readonly editingPaymentId = signal<string | null>(null);

  protected readonly isEditMode = computed(() => this.editingPaymentId() !== null);

  /* ============================================================
     FILTERS
  ============================================================ */

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal('all');

  /* ============================================================
     VENDOR OPTIONS

     IMPORTANT:
     No fake/hardcoded vendor IDs.
     Vendors are loaded only from backend Vendor Master.
  ============================================================ */

  protected vendors: SelectOption[] = [];

  private vendorRecords: VendorApiRow[] = [];

  /* ============================================================
     SOURCE OPTIONS
  ============================================================ */

  protected readonly sourceOptions: SelectOption[] = [
    { label: 'Air Cargo', value: 'air-cargo' },
    { label: 'Sea Freight', value: 'sea-freight' },
    { label: 'Transporter', value: 'transporter' },
    { label: 'CHA', value: 'cha' },
    { label: 'Warehouse', value: 'warehouse' },
    { label: 'Other', value: 'other' }
  ];

  /* ============================================================
     STATUS OPTIONS
  ============================================================ */

  protected readonly statusOptions: SelectOption[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Partial', value: 'partial' },
    { label: 'Paid', value: 'paid' },
    { label: 'On Hold', value: 'on-hold' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Other', value: 'other' }
  ];

  /* ============================================================
     FORM
  ============================================================ */

  protected form: VendorPaymentRow = this.emptyPayment();

  /* ============================================================
     PAYMENT LIST
  ============================================================ */

  protected readonly payments = signal<VendorPaymentRow[]>([]);

  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {
    this.loadVendors();
    this.loadPayments();
  }

  /* ============================================================
     LOAD PAYMENT LIST
  ============================================================ */

  protected loadPayments(): void {
    this.isLoading.set(true);

    this.api
      .get<any>('/logistics/vendor-payments', {
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          const rows = this.extractPaymentRows(response);
          this.payments.set(this.normalizePayments(rows));
        },

        error: (error: any) => {
          this.payments.set([]);
          window.alert(error?.error?.message || 'Unable to load vendor payments.');
        }
      });
  }

  /* ============================================================
     LOAD REAL VENDORS

     Vendor Payment-specific endpoint.

     User sees:
       Skyline Cargo Services

     Internally Angular keeps:
       68xxxxxxxxxxxxxxxxxxxxxx

     Mongo ID is NEVER manually typed by the employee.
  ============================================================ */

  private loadVendors(): void {
    this.isVendorLoading.set(true);
    this.vendorLoadError.set('');

    /*
     * Never retain any stale/fake options while
     * the live Vendor Master request is running.
     */
    this.vendors = [];
    this.vendorRecords = [];

    this.api
      .get<any>('/logistics/vendor-payments/vendor-options')
      .pipe(finalize(() => this.isVendorLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          const rows = this.extractVendorRows(response);

          /*
           * Only records with valid Mongo ObjectId are usable
           * as Vendor Payment references.
           */
          const validRows = rows.filter((row) =>
            Boolean(row?._id && this.isMongoObjectId(row._id))
          );

          this.vendorRecords = validRows;

          this.vendors = validRows.map((row) => ({
            label: this.vendorLabel(row),
            value: String(row._id)
          }));

          this.ensureSelectedVendor();
          if (!this.vendors.length) {
            this.vendorLoadError.set(
              'No active vendors found. Please add an active vendor in Vendor Master first.'
            );
          }
        },

        error: (error: any) => {
          this.vendorRecords = [];
          this.vendors = [];

          const message = error?.error?.message || 'Unable to load vendors for payment.';

          this.vendorLoadError.set(message);

          /*
           * Do not silently fall back to fake vendor IDs.
           */
          window.alert(message);
        }
      });
  }

  /* ============================================================
     VENDOR SELECTED

     Autofill existing vendor information.
  ============================================================ */

  protected onVendorSelected(): void {
    const vendor = this.vendorRecords.find(
      (row) => String(row._id || '') === String(this.form.vendor || '')
    );

    if (!vendor) {
      this.form.vendorOther = '';

      /*
       * When vendor selection is removed,
       * clear vendor-derived advance.
       */
      if (!this.form.vendor) {
        this.form.previousAdvance = 0;
      }

      return;
    }

    this.form.vendorOther = vendor.vendorName || vendor.companyName || '';
    this.form.previousAdvance = this.number(vendor.openingPayable);
  }

  protected onPaymentProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.paymentProofError.set('');

    if (!file) {
      this.selectedPaymentProof.set(null);
      return;
    }

    const extension = file.name.toLowerCase().split('.').pop();

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (
      !extension ||
      !allowedExtensions.includes(extension) ||
      !allowedMimeTypes.includes(file.type)
    ) {
      this.paymentProofError.set('Only JPG, JPEG, PNG or PDF files are allowed.');
      this.selectedPaymentProof.set(null);
      input.value = '';
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      this.paymentProofError.set('Payment proof cannot exceed 10 MB.');
      this.selectedPaymentProof.set(null);
      input.value = '';
      return;
    }

    this.selectedPaymentProof.set(file);
  }

  /* ============================================================
     FILTERED PAYMENTS
  ============================================================ */

  protected readonly filteredPayments = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.payments().filter((payment) => {
      const vendorName = this.resolveVendorName(payment).toLowerCase();
      const exportInvoiceNo = String(payment.exportInvoiceNo || '').toLowerCase();
      const vendorInvoiceNo = String(payment.vendorInvoiceNo || '').toLowerCase();

      const matchesSearch =
        !search ||
        vendorName.includes(search) ||
        exportInvoiceNo.includes(search) ||
        vendorInvoiceNo.includes(search);

      const matchesStatus = status === 'all' || payment.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  /* ============================================================
     SUMMARY
  ============================================================ */

  protected readonly summary = computed(() => {
    const payments = this.payments();

    const totalAmount = payments.reduce(
      (sum, payment) => sum + this.number(payment.totalAmount),
      0
    );

    const previousAdvance = payments.reduce(
      (sum, payment) => sum + this.number(payment.previousAdvance),
      0
    );

    const paidAmount = payments.reduce(
      (sum, payment) => sum + this.number(payment.paidAmount),
      0
    );

    const deduction = payments.reduce(
      (sum, payment) => sum + this.number(payment.deduction),
      0
    );

    const supplierBalance = payments.reduce(
      (sum, payment) => sum + this.getSupplierBalance(payment),
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

  /* ============================================================
     CURRENT CALCULATIONS
  ============================================================ */

  protected get currentPendingAmount(): number {
    return this.getPendingAmount(this.form);
  }

  protected get currentSupplierBalance(): number {
    return this.getSupplierBalance(this.form);
  }

  /* ============================================================
     PENDING AMOUNT

     Pending = Total - Previous Advance
  ============================================================ */

  protected getPendingAmount(payment: VendorPaymentRow): number {
    return Math.max(0, this.number(payment.totalAmount) - this.number(payment.previousAdvance));
  }

  /* ============================================================
     SUPPLIER BALANCE

     Supplier Balance =
       Pending
       - Paid
       - Deduction
  ============================================================ */

  protected getSupplierBalance(payment: VendorPaymentRow): number {
    return Math.max(
      0,
      this.getPendingAmount(payment) - this.number(payment.paidAmount) - this.number(payment.deduction)
    );
  }

  /* ============================================================
     VALIDATE FORM

     Shared between create and update.
  ============================================================ */

  private validateForm(): boolean {
    if (!this.form.vendor) {
      alert('Please select a Vendor.');
      return false;
    }

    /*
     * Important:
     * Employee should never type MongoDB IDs.
     *
     * This check only protects against stale/invalid frontend
     * data. The employee only selects a normal Vendor name.
     */
    if (!this.isMongoObjectId(this.form.vendor)) {
      alert('Selected Vendor is not valid. Please refresh the page and select the Vendor again.');
      return false;
    }

    const selectedVendor = this.vendorRecords.find(
      (vendor) => String(vendor._id || '') === String(this.form.vendor)
    );

    if (!selectedVendor) {
      alert('Selected Vendor is not available. Please refresh the Vendor list.');
      return false;
    }

    if (!this.form.exportInvoiceNo.trim()) {
      alert('Please enter Export Invoice No.');
      return false;
    }

    if (!this.form.invoiceDate) {
      alert('Please select Invoice Date.');
      return false;
    }

    if (!this.form.from) {
      alert('Please select From.');
      return false;
    }

    if (this.form.from === 'other' && !this.form.fromOther.trim()) {
      alert('Please enter source details for Other.');
      return false;
    }

    if (!this.form.vendorInvoiceNo.trim()) {
      alert('Please enter Vendor Invoice No.');
      return false;
    }

    if (!this.form.vendorInvoiceDate) {
      alert('Please select Vendor Invoice Date.');
      return false;
    }

    if (this.number(this.form.totalAmount) <= 0) {
      alert('Total Amount must be greater than zero.');
      return false;
    }

    if (
      this.number(this.form.previousAdvance) < 0 ||
      this.number(this.form.paidAmount) < 0 ||
      this.number(this.form.deduction) < 0
    ) {
      alert('Advance, Paid Amount and Deduction cannot be negative.');
      return false;
    }

    if (this.form.status === 'other' && !this.form.statusOther.trim()) {
      alert('Please enter payment status.');
      return false;
    }

    if (!this.form.remarks.trim()) {
      alert('Please enter Remarks.');
      return false;
    }

    return true;
  }

  /* ============================================================
     BUILD FORM DATA

     Shared between create and update.
  ============================================================ */

  private buildFormData(): FormData {
    const payload = {
      /*
       * Real Mongo ObjectId from Vendor Master.
       * Never typed by user.
       */
      vendorId: this.form.vendor,

      exportInvoiceNo: this.form.exportInvoiceNo.trim(),
      invoiceDate: this.form.invoiceDate,

      from: this.form.from === 'other' ? this.form.fromOther.trim() : this.form.from,

      vendorInvoiceNo: this.form.vendorInvoiceNo.trim(),
      vendorInvoiceDate: this.form.vendorInvoiceDate,

      weight: this.number(this.form.weight),
      weightUnit: 'kg',

      totalAmount: this.number(this.form.totalAmount),
      previousAdvance: this.number(this.form.previousAdvance),
      paidAmount: this.number(this.form.paidAmount),
      deduction: this.number(this.form.deduction),

      status: this.form.status === 'on-hold' ? 'hold' : this.form.status,
      statusOther: this.form.status === 'other' ? this.form.statusOther.trim() : '',

      currency: 'INR',

      remarks: this.form.remarks.trim()
    };

    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const paymentProof = this.selectedPaymentProof();

    if (paymentProof) {
      formData.append('paymentProof', paymentProof, paymentProof.name);
    }

    return formData;
  }

  /* ============================================================
     SAVE PAYMENT

     Single entry point for both create and update.
     - editingPaymentId() === null  -> POST (create)
     - editingPaymentId() !== null  -> PATCH (update)

     This replaces the old addPayment() which always POSTed,
     even while editing an existing record.
  ============================================================ */

  protected savePayment(): void {
    if (!this.validateForm()) {
      return;
    }

    const formData = this.buildFormData();
    const editingId = this.editingPaymentId();

    this.isSaving.set(true);

    const request = editingId
      ? this.api.patch(`/logistics/vendor-payments/${editingId}`, formData)
      : this.api.post('/logistics/vendor-payments', formData);

    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.resetForm();
        this.loadPayments();

        window.alert(
          editingId ? 'Vendor payment updated successfully.' : 'Vendor payment saved successfully.'
        );
      },

      error: (error: any) => {
        window.alert(
          error?.error?.message ||
            (editingId ? 'Unable to update vendor payment.' : 'Unable to save vendor payment.')
        );
      }
    });
  }

  /* ============================================================
     RESET FORM

     Also exits edit mode and clears the native file input,
     since clearing the signal alone leaves the browser showing
     the previously selected filename.
  ============================================================ */

  protected resetForm(): void {
    this.form = this.emptyPayment();
    this.editingPaymentId.set(null);

    this.selectedPaymentProof.set(null);
    this.paymentProofError.set('');

    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  /* ============================================================
     EDIT PAYMENT

     Now puts the form into edit mode so savePayment() issues a
     PATCH instead of creating a duplicate record.
  ============================================================ */

  protected editPayment(payment: VendorPaymentRow): void {
    if (!payment._id) return;
    this.form = { ...payment };
    this.ensureSelectedVendor();

    this.editingPaymentId.set(payment._id ? String(payment._id) : null);

    /*
     * Editing does not carry over a previously selected file —
     * the employee must re-attach if they want to replace it.
     */
    this.selectedPaymentProof.set(null);
    this.paymentProofError.set('');

    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }

    this.paymentFormRef?.nativeElement.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  /* ============================================================
     CANCEL EDIT

     Lets the user back out of edit mode without saving.
  ============================================================ */

  private ensureSelectedVendor(): void {
    if (!this.form._id || !this.form.vendor) return;
    if (!this.vendorRecords.some(x => x._id === this.form.vendor)) {
      this.vendorRecords.push({ _id: this.form.vendor, vendorName: this.form.vendorOther });
    }
    if (!this.vendors.some(x => x.value === this.form.vendor)) {
      this.vendors = [{ value: this.form.vendor, label: this.form.vendorOther || 'Vendor' }, ...this.vendors];
    }
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected viewPayment(payment: VendorPaymentRow): void {
    console.log('View vendor payment', payment);
  }

  protected viewPaymentProof(payment: VendorPaymentRow): void {
    if (!payment._id || !payment.paymentProof?.url) {
      window.alert('No payment proof available.');
      return;
    }

    const previewWindow = window.open('', '_blank');

    this.api.getBlob(`/logistics/vendor-payments/${payment._id}/payment-proof/download`).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);

        if (previewWindow) {
          previewWindow.location.href = objectUrl;
        } else {
          window.open(objectUrl, '_blank');
        }

        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 60000);
      },

      error: () => {
        if (previewWindow) {
          previewWindow.close();
        }

        window.alert('Unable to open payment proof.');
      }
    });
  }

  protected downloadPaymentProof(payment: VendorPaymentRow): void {
    if (!payment._id || !payment.paymentProof?.url) {
      window.alert('No payment proof available.');
      return;
    }

    this.api.getBlob(`/logistics/vendor-payments/${payment._id}/payment-proof/download`).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = payment.paymentProof?.originalName || 'payment-proof';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(objectUrl);
      },

      error: () => {
        window.alert('Unable to download payment proof.');
      }
    });
  }

  /* ============================================================
     EXPORT

     Existing behavior preserved.
  ============================================================ */

  protected exportPayments(): void {
    console.log('Export vendor payment records', this.filteredPayments());
  }

  /* ============================================================
     FILTER HELPERS
  ============================================================ */

  protected setSearch(value: string): void {
    this.searchTerm.set(value);
  }

  protected setStatusFilter(value: string): void {
    this.statusFilter.set(value);
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }

  /* ============================================================
     PAYMENT RESPONSE EXTRACTION
  ============================================================ */

  private extractPaymentRows(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    /*
     * ApiService may already unwrap ApiResponse.
     */
    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.records)) {
      return response.records;
    }

    if (Array.isArray(response?.payments)) {
      return response.payments;
    }

    if (Array.isArray(response?.vendorPayments)) {
      return response.vendorPayments;
    }

    /*
     * Support nested paginated response.
     */
    const nested = response?.data;

    if (nested && typeof nested === 'object') {
      if (Array.isArray(nested.data)) {
        return nested.data;
      }

      if (Array.isArray(nested.records)) {
        return nested.records;
      }

      if (Array.isArray(nested.payments)) {
        return nested.payments;
      }

      if (Array.isArray(nested.vendorPayments)) {
        return nested.vendorPayments;
      }

      if (Array.isArray(nested.items)) {
        return nested.items;
      }
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    return [];
  }

  /* ============================================================
     VENDOR RESPONSE EXTRACTION
  ============================================================ */

  private extractVendorRows(response: any): VendorApiRow[] {
    if (Array.isArray(response)) {
      return response;
    }

    /*
     * With ApiService unwrapping, controller response:
     *
     * {
     *   vendors: [...]
     * }
     */
    if (Array.isArray(response?.vendors)) {
      return response.vendors;
    }

    /*
     * Without unwrapping:
     *
     * {
     *   data: {
     *     vendors: [...]
     *   }
     * }
     */
    if (Array.isArray(response?.data?.vendors)) {
      return response.data.vendors;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    return [];
  }

  /* ============================================================
     NORMALIZE PAYMENTS
  ============================================================ */

  private normalizePayments(rows: any[]): VendorPaymentRow[] {
    return rows.map((row, index) => ({
      _id: row._id,
      editHistory: row.editHistory || [],

      id: row._id || index + 1,

      /*
       * When vendorId is populated:
       * vendorId._id
       *
       * When unpopulated:
       * vendorId
       */
      vendor: row.vendorId?._id || row.vendorId || '',

      vendorOther:
        row.vendorName || row.vendorId?.vendorName || row.vendorId?.companyName || row.vendor || '',

      exportInvoiceNo: row.exportInvoiceNo || row.shipmentNumber || '',

      invoiceDate: row.invoiceDate ? String(row.invoiceDate).slice(0, 10) : '',

      from: row.from || '',

      fromOther: '',

      vendorInvoiceNo: row.vendorInvoiceNo || '',

      vendorInvoiceDate: row.vendorInvoiceDate
        ? String(row.vendorInvoiceDate).slice(0, 10)
        : '',

      weight: this.number(row.weight),

      totalAmount: this.number(row.totalAmount),
      previousAdvance: this.number(row.previousAdvance),
      paidAmount: this.number(row.paidAmount),
      deduction: this.number(row.deduction),

      status: row.status === 'hold' ? 'on-hold' : row.status || 'pending',

      statusOther: row.statusOther || '',

      paymentProof: row.paymentProof?.url
        ? {
            url: String(row.paymentProof.url || ''),
            originalName: String(row.paymentProof.originalName || ''),
            mimeType: String(row.paymentProof.mimeType || ''),
            size: this.number(row.paymentProof.size)
          }
        : null,

      remarks: row.remarks || ''
    }));
  }

  /* ============================================================
     RESOLVE VENDOR NAME
  ============================================================ */

  protected resolveVendorName(payment: VendorPaymentRow): string {
    const fromOptions = this.vendors.find((vendor) => vendor.value === payment.vendor)?.label;

    if (fromOptions) {
      return fromOptions;
    }

    if (payment.vendorOther) {
      return payment.vendorOther;
    }

    /*
     * Do not display Mongo ObjectId to normal employee
     * when label cannot be resolved.
     */
    if (this.isMongoObjectId(payment.vendor)) {
      return 'Vendor';
    }

    return payment.vendor || '-';
  }

  /* ============================================================
     RESOLVE SOURCE
  ============================================================ */

  protected resolveSourceName(payment: VendorPaymentRow): string {
    if (payment.from === 'other') {
      return payment.fromOther || 'Other';
    }

    return (
      this.sourceOptions.find((option) => option.value === payment.from)?.label ||
      payment.from ||
      '-'
    );
  }

  /* ============================================================
     RESOLVE STATUS
  ============================================================ */

  protected resolveStatusName(payment: VendorPaymentRow): string {
    if (payment.status === 'other') {
      return payment.statusOther || 'Other';
    }

    return (
      this.statusOptions.find((option) => option.value === payment.status)?.label ||
      payment.status ||
      '-'
    );
  }

  /* ============================================================
     STATUS CSS CLASS
  ============================================================ */

  protected statusClass(status: string): string {
    return String(status || '').toLowerCase().replace(/\s+/g, '-');
  }

  /* ============================================================
     CURRENCY
  ============================================================ */

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(this.number(value));
  }

  /* ============================================================
     DATE
  ============================================================ */

  protected formatDate(date: string): string {
    if (!date) {
      return '-';
    }

    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(parsed);
  }

  /* ============================================================
     EMPTY PAYMENT
  ============================================================ */

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
      paymentProof: null,

      remarks: ''
    };
  }

  /* ============================================================
     VENDOR LABEL
  ============================================================ */

  private vendorLabel(vendor: VendorApiRow): string {
    const name = vendor.vendorName || vendor.companyName || 'Vendor';
    const code = String(vendor.vendorCode || '').trim();

    return code ? `${name} (${code})` : name;
  }

  /* ============================================================
     OBJECT ID SAFETY

     Mongo ObjectId remains an internal implementation detail.
     This does NOT ask the employee to type it.
  ============================================================ */

  private isMongoObjectId(value: unknown): boolean {
    return /^[a-f\d]{24}$/i.test(String(value || '').trim());
  }

  /* ============================================================
     NUMBER SAFETY
  ============================================================ */

  private number(value: unknown): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }
}