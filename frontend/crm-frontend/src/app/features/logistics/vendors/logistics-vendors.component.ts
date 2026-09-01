import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option { label: string; value: string; }
interface PageResult<T> { data?: T[] | { data?: T[]; records?: T[] }; records?: T[]; pagination?: { total?: number }; }
interface VendorRecord {
  _id?: string;
  id?: number;
  vendorCode: string;
  vendorName: string;
  vendorType: string;
  contactPerson: string;
  mobile: string;
  city: string;
  totalInvoices: number;
  balance: number;
  status: string;
  raw?: any;
}

@Component({
  selector: 'app-logistics-vendors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics-vendors.component.html',
  styleUrl: './logistics-vendors.component.scss'
})
export class LogisticsVendorsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly showForm = signal(false);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly selectedVendor = signal<any | null>(null);
  protected editingId = '';

  protected readonly vendorTypes: Option[] = [
    { label: 'Airline', value: 'airline' },
    { label: 'Shipping Line', value: 'shipping-line' },
    { label: 'CHA', value: 'cha' },
    { label: 'Transporter', value: 'transporter' },
    { label: 'Warehouse', value: 'warehouse' },
    { label: 'Packaging Supplier', value: 'packaging' },
    { label: 'Insurance Provider', value: 'insurance' },
    { label: 'Freight Forwarder', value: 'freight-forwarder' },
    { label: 'Other', value: 'other' }
  ];
  protected readonly paymentTerms: Option[] = [
    { label: 'Advance', value: 'advance' }, { label: 'Immediate', value: 'immediate' },
    { label: '7 Days', value: '7-days' }, { label: '15 Days', value: '15-days' },
    { label: '30 Days', value: '30-days' }, { label: '45 Days', value: '45-days' },
    { label: 'Other', value: 'other' }
  ];
  protected readonly statuses: Option[] = [
    { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' },
    { label: 'Blocked', value: 'blocked' }, { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();
  protected readonly records = signal<VendorRecord[]>([]);

  ngOnInit(): void { this.loadVendors(); }

  protected readonly filteredRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.records().filter((item) => {
      const matchesSearch = !query || item.vendorCode.toLowerCase().includes(query) || item.vendorName.toLowerCase().includes(query) || item.vendorType.toLowerCase().includes(query) || item.contactPerson.toLowerCase().includes(query) || item.mobile.toLowerCase().includes(query);
      return matchesSearch && (status === 'all' || item.status === status);
    });
  });

  protected readonly summary = computed(() => ({
    total: this.records().length,
    active: this.records().filter((item) => item.status === 'active').length,
    invoices: this.records().reduce((sum, item) => sum + item.totalInvoices, 0),
    balance: this.records().reduce((sum, item) => sum + item.balance, 0)
  }));

  protected loadVendors(): void {
    this.isLoading.set(true);
    this.api.get<PageResult<any>>('/logistics/vendors', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => this.records.set(this.normalizeRows(this.extractRows(response))),
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load Logistics vendors.')
      });
  }

  protected openForm(): void { this.editingId = ''; this.selectedVendor.set(null); this.form = this.emptyForm(); this.showForm.set(true); }
  protected closeForm(): void { this.showForm.set(false); this.editingId = ''; }

  protected saveVendor(): void {
    const payload = this.buildPayload();
    const validationMessage = this.validatePayload(payload);

    if (validationMessage) {
      this.errorMessage.set(validationMessage);
      window.alert(validationMessage);
      return;
    }

    this.isSaving.set(true);
    this.message.set('');
    this.errorMessage.set('');

    const request = this.editingId
      ? this.api.patch<VendorRecord>('/logistics/vendors/' + this.editingId, payload)
      : this.api.post<VendorRecord>('/logistics/vendors', payload);

    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Vendor saved successfully.');
          this.showForm.set(false);
          this.loadVendors();
          window.alert('Vendor saved successfully.');
        },
        error: (error) => {
          const message = this.apiErrorMessage(error, 'Unable to save Logistics vendor. Please check backend server and required fields.');
          this.errorMessage.set(message);
          window.alert(message);
        }
      });
  }

  protected viewVendor(item: VendorRecord): void {
    this.selectedVendor.set(item.raw || item);
    this.showForm.set(false);
    this.editingId = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected editVendor(item: VendorRecord): void {
    const record = item.raw || item;
    this.editingId = record?._id || item._id || '';
    this.selectedVendor.set(null);
    this.form = this.formFromRecord(record);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }

  protected statusLabel(status: string): string {
    return this.statuses.find((option) => option.value === status)?.label || status;
  }

  private validatePayload(payload: Record<string, unknown>): string {
    if (!payload['vendorName']) return 'Vendor Name is required.';
    if (!this.form.vendorType) return 'Vendor Type is required.';
    if (!payload['contactPerson']) return 'Contact Person is required.';
    if (!payload['mobile']) return 'Mobile is required.';
    if (String(payload['vendorType']) === 'other' && !this.form.vendorTypeOther.trim()) return 'Vendor type is required when Other is selected.';
    if (String(payload['paymentTerms']) === 'other' && !this.form.paymentTermOther.trim()) return 'Payment term is required when Other is selected.';
    if (String(payload['status']) === 'other' && !this.form.statusOther.trim()) return 'Vendor status is required when Other is selected.';
    if (!String(payload['remarks'] || '').trim()) return 'Remarks are required.';
    return '';
  }

  private apiErrorMessage(error: any, fallback: string): string {
    if (error?.status === 0) {
      return 'Backend server is not running or API is unreachable. Please start backend, then try again.';
    }

    return error?.error?.message || error?.error?.errors?.[0]?.message || error?.message || fallback;
  }
  private extractRows<T>(response: PageResult<T> | T[] | null | undefined): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const data = response?.data;

    if (Array.isArray(data)) {
      return data;
    }

    return data?.data || data?.records || response?.records || [];
  }
  private buildPayload(): Record<string, unknown> {
    return {
      vendorType: this.mapVendorType(this.form.vendorType),
      vendorTypeOther: this.form.vendorTypeOther,
      vendorName: this.form.vendorName.trim(),
      companyName: this.form.vendorName.trim(),
      contactPerson: this.form.contactPerson.trim(),
      mobile: this.form.mobile.trim(),
      alternateMobile: this.form.alternateMobile.trim(),
      email: this.form.email.trim(),
      gstNumber: this.form.gstNumber.trim(),
      panNumber: this.form.panNumber.trim(),
      address: { addressLine1: this.form.address.trim(), city: this.form.city, state: this.form.state, country: this.form.country, pincode: this.form.pincode },
      serviceCategory: this.mapServiceCategory(this.form.vendorType),
      paymentTerms: this.form.paymentTerm === 'other' ? 'other' : this.form.paymentTerm,
      paymentTermsOther: this.form.paymentTermOther,
      creditDays: this.creditDays(this.form.paymentTerm),
      openingPayable: Number(this.form.creditLimit || 0),
      currency: 'INR',
      preferredPaymentMode: 'bank_transfer',
      bankDetails: { accountHolderName: this.form.accountName, bankName: this.form.bankName, accountNumber: this.form.accountNumber, ifscCode: this.form.ifscSwift },
      status: this.mapStatus(this.form.status),
      statusOther: this.form.statusOther,
      remarks: this.form.remarks.trim() || 'Created from logistics vendor form.'
    };
  }

  private normalizeRows(rows: any[]): VendorRecord[] {
    return rows.map((row, index) => ({
      _id: row._id,
      id: index + 1,
      vendorCode: row.vendorCode || `VEN-${String(index + 1).padStart(3, '0')}`,
      vendorName: row.vendorName || '-',
      vendorType: this.vendorTypeLabel(row.vendorType || row.serviceCategory || ''),
      contactPerson: row.contactPerson || '-',
      mobile: row.mobile || '-',
      city: row.address?.city || '',
      totalInvoices: Number(row.totalInvoices || 0),
      balance: Number(row.balance || row.openingPayable || 0),
      status: row.status || 'active'
    }));
  }

  private mapVendorType(value: string): string {
    const map: Record<string, string> = { airline: 'service_provider', 'shipping-line': 'service_provider', packaging: 'supplier', insurance: 'service_provider', 'freight-forwarder': 'freight_forwarder' };
    return map[value] || (['cha', 'transporter', 'warehouse', 'other'].includes(value) ? value : 'supplier');
  }

  private mapServiceCategory(value: string): string {
    const map: Record<string, string> = { airline: 'air_cargo', 'shipping-line': 'sea_freight', cha: 'customs_cha', transporter: 'road_transport', packaging: 'packaging', insurance: 'insurance', warehouse: 'warehouse', 'freight-forwarder': 'multi_service' };
    return map[value] || 'goods';
  }

  private creditDays(value: string): number {
    const match = String(value || '').match(/^(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  private vendorTypeValue(row: any): string {
    const categoryMap: Record<string, string> = { air_cargo: 'airline', sea_freight: 'shipping-line', customs_cha: 'cha', road_transport: 'transporter', packaging: 'packaging', insurance: 'insurance', warehouse: 'warehouse', multi_service: 'freight-forwarder' };
    return categoryMap[row.serviceCategory] || this.vendorTypes.find((option) => this.mapVendorType(option.value) === row.vendorType || option.value === row.vendorType)?.value || row.vendorType || '';
  }

  private vendorTypeLabel(value: string): string {
    return this.vendorTypes.find((option) => this.mapVendorType(option.value) === value || option.value === value)?.label || value || '-';
  }

  private mapStatus(value: string): string { return value === 'blacklisted' ? 'blocked' : value === 'hold' ? 'inactive' : value; }


  private formFromRecord(row: any) {
    return {
      vendorCode: row.vendorCode || '',
      vendorName: row.vendorName || row.companyName || '',
      vendorType: this.vendorTypeValue(row),
      vendorTypeOther: row.vendorTypeOther || '',
      contactPerson: row.contactPerson || '',
      mobile: row.mobile || '',
      alternateMobile: row.alternateMobile || '',
      email: row.email || '',
      gstNumber: row.gstNumber || '',
      panNumber: row.panNumber || '',
      address: row.address?.addressLine1 || '',
      city: row.address?.city || '',
      state: row.address?.state || '',
      country: row.address?.country || 'India',
      pincode: row.address?.pincode || '',
      paymentTerm: row.paymentTerms || 'advance',
      paymentTermOther: row.paymentTermsOther || '',
      creditLimit: Number(row.openingPayable || 0),
      bankName: row.bankDetails?.bankName || '',
      accountName: row.bankDetails?.accountHolderName || '',
      accountNumber: row.bankDetails?.accountNumber || '',
      ifscSwift: row.bankDetails?.ifscCode || '',
      status: row.status || 'active',
      statusOther: row.statusOther || '',
      remarks: row.remarks || ''
    };
  }
  private emptyForm() {
    return { vendorCode: '', vendorName: '', vendorType: '', vendorTypeOther: '', contactPerson: '', mobile: '', alternateMobile: '', email: '', gstNumber: '', panNumber: '', address: '', city: '', state: '', country: 'India', pincode: '', paymentTerm: 'advance', paymentTermOther: '', creditLimit: 0, bankName: '', accountName: '', accountNumber: '', ifscSwift: '', status: 'active', statusOther: '', remarks: '' };
  }
}






