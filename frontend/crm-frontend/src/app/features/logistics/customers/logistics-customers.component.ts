import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option { label: string; value: string; }

interface PageResult<T> { data?: T[] | { data?: T[]; records?: T[] }; records?: T[]; total?: number; }

interface CustomerRecord {
  _id?: string;
  id?: number;
  customerCode: string;
  customerName: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  city: string;
  country: string;
  gstNumber: string;
  totalShipments: number;
  outstandingAmount: number;
  status: string;
  raw?: any;
}

@Component({
  selector: 'app-logistics-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics-customers.component.html',
  styleUrl: './logistics-customers.component.scss'
})
export class LogisticsCustomersComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly showForm = signal(false);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly selectedCustomer = signal<any | null>(null);
  protected editingId = '';

  protected readonly customerTypes: Option[] = [
    { label: 'Exporter', value: 'exporter' },
    { label: 'Importer', value: 'importer' },
    { label: 'Manufacturer', value: 'manufacturer' },
    { label: 'Trader', value: 'trader' },
    { label: 'Distributor', value: 'distributor' },
    { label: 'Retailer', value: 'retailer' },
    { label: 'Individual', value: 'individual' },
    { label: 'Other', value: 'other' }
  ];
  protected readonly preferredModes: Option[] = [
    { label: 'Air Cargo', value: 'air-cargo' },
    { label: 'Sea Freight', value: 'sea-freight' },
    { label: 'Road Transport', value: 'road' },
    { label: 'Multi Modal', value: 'multi-modal' },
    { label: 'Other', value: 'other' }
  ];
  protected readonly creditTerms: Option[] = [
    { label: 'Advance Payment', value: 'advance' },
    { label: '7 Days', value: '7-days' },
    { label: '15 Days', value: '15-days' },
    { label: '30 Days', value: '30-days' },
    { label: '45 Days', value: '45-days' },
    { label: '60 Days', value: '60-days' },
    { label: 'Other', value: 'other' }
  ];
  protected readonly statuses: Option[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Blocked', value: 'blocked' },
    { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();
  protected readonly records = signal<CustomerRecord[]>([]);

  ngOnInit(): void { this.loadCustomers(); }

  protected readonly filteredRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.records().filter((item) => {
      const matchesSearch = !query ||
        item.customerCode.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        item.companyName.toLowerCase().includes(query) ||
        item.contactPerson.toLowerCase().includes(query) ||
        item.mobile.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query);
      const matchesStatus = status === 'all' || item.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  protected readonly summary = computed(() => ({
    total: this.records().length,
    active: this.records().filter((item) => item.status === 'active').length,
    shipments: this.records().reduce((sum, item) => sum + item.totalShipments, 0),
    outstanding: this.records().reduce((sum, item) => sum + item.outstandingAmount, 0)
  }));

  protected loadCustomers(): void {
    this.isLoading.set(true);
    this.api.get<PageResult<any>>('/logistics/customers', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => this.records.set(this.normalizeRows(this.extractRows(response))),
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load Logistics customers.')
      });
  }

  protected openForm(): void {
    this.form = this.emptyForm();
    this.showForm.set(true);
  }

  protected closeForm(): void { this.showForm.set(false); this.editingId = ''; }

  protected saveCustomer(): void {
    if (this.isSaving()) return;

    const payload = this.buildPayload();
    const validationError = this.validateForm(payload);

    if (validationError) {
      this.errorMessage.set(validationError);
      window.alert(validationError);
      return;
    }

    this.isSaving.set(true);
    this.message.set('');
    this.errorMessage.set('');

    const request = this.editingId
      ? this.api.patch<CustomerRecord>('/logistics/customers/' + this.editingId, payload)
      : this.api.post<CustomerRecord>('/logistics/customers', payload);

    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Customer saved successfully.');
          this.showForm.set(false);
          this.form = this.emptyForm();
          this.loadCustomers();
          window.alert('Customer saved successfully.');
        },
        error: (error: { status?: number; error?: { message?: string; errors?: Array<{ message?: string }> } }) => {
          const message = this.apiErrorMessage(error, 'Unable to save Logistics customer.');
          this.errorMessage.set(message);
          window.alert(message);
        }
      });
  }

  private validateForm(payload: Record<string, unknown>): string {
    if (!this.form.customerType) return 'Customer Type is required.';
    if (this.form.customerType === 'other' && !this.form.customerTypeOther.trim()) return 'Customer Type is required when Other is selected.';
    if (!String(payload['customerName'] || '').trim()) return 'Customer Name is required.';
    if (!String(payload['contactPerson'] || '').trim()) return 'Contact Person is required.';
    if (!String(payload['mobile'] || '').trim()) return 'Mobile is required.';
    if (!this.form.preferredMode) return 'Preferred Mode is required.';
    if (this.form.preferredMode === 'other' && !this.form.preferredModeOther.trim()) return 'Preferred Mode is required when Other is selected.';
    if (this.form.creditTerm === 'other' && !this.form.creditTermOther.trim()) return 'Credit Term is required when Other is selected.';
    if (this.form.status === 'other' && !this.form.statusOther.trim()) return 'Customer Status is required when Other is selected.';
    if (!String(payload['remarks'] || '').trim()) return 'Remarks are compulsory.';
    return '';
  }

  private apiErrorMessage(error: { status?: number; error?: { message?: string; errors?: Array<{ message?: string }> } }, fallback: string): string {
    if (error?.status === 0) {
      return 'Backend server is not running or API is unreachable. Please start backend and try again.';
    }

    return error?.error?.message || error?.error?.errors?.[0]?.message || fallback;
  }

  protected editCustomer(item: CustomerRecord): void {
    const record = item.raw || item;
    this.editingId = record?._id || item._id || '';
    this.selectedCustomer.set(null);
    this.form = this.formFromRecord(record);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected viewCustomer(item: CustomerRecord): void {
    this.selectedCustomer.set(item.raw || item);
    this.showForm.set(false);
    this.editingId = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected statusLabel(status: string): string {
    return this.statuses.find((option) => option.value === status)?.label || status;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
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
      customerType: this.mapCustomerType(this.form.customerType),
      customerTypeOther: this.form.customerTypeOther,
      customerName: this.form.customerName.trim(),
      companyName: this.form.companyName.trim(),
      contactPerson: this.form.contactPerson.trim(),
      mobile: this.form.mobile.trim(),
      alternateMobile: this.form.alternateMobile.trim(),
      email: this.form.email.trim(),
      gstNumber: this.form.gstNumber.trim(),
      panNumber: this.form.panNumber.trim(),
      iecNumber: this.form.iecCode.trim(),
      billingAddress: this.addressPayload(this.form.billingAddress),
      shippingAddress: this.addressPayload(this.form.shippingAddress),
      pickupAddress: this.addressPayload(this.form.pickupAddress),
      paymentTerms: this.form.creditTerm,
      paymentTermsOther: this.form.creditTermOther,
      creditLimit: Number(this.form.creditLimit || 0),
      preferredMode: this.mapPreferredMode(this.form.preferredMode),
      preferredModeOther: this.form.preferredModeOther,
      status: this.mapStatus(this.form.status),
      statusOther: this.form.statusOther,
      remarks: this.form.remarks.trim() || 'Created from logistics customer form.'
    };
  }

  private normalizeRows(rows: any[]): CustomerRecord[] {
    return rows.map((row, index) => ({
      _id: row._id,
      id: index + 1,
      customerCode: row.customerCode || `CUS-${String(index + 1).padStart(3, '0')}`,
      customerName: row.customerName || '-',
      companyName: row.companyName || row.customerName || '-',
      contactPerson: row.contactPerson || '-',
      mobile: row.mobile || '-',
      email: row.email || '',
      city: row.billingAddress?.city || row.shippingAddress?.city || '',
      country: row.billingAddress?.country || row.shippingAddress?.country || 'India',
      gstNumber: row.gstNumber || '',
      totalShipments: Number(row.totalShipments || 0),
      outstandingAmount: Number(row.outstandingAmount || row.openingBalance || 0),
      status: row.status || 'active'
    }));
  }

  private addressPayload(address: string): Record<string, string> {
    return { addressLine1: String(address || '').trim(), city: this.form.city, state: this.form.state, country: this.form.country, pincode: this.form.pincode };
  }

  private mapCustomerType(value: string): string {
    return ['exporter', 'importer', 'individual', 'other'].includes(value) ? value : 'company';
  }

  private preferredModeValue(value: string): string {
    const map: Record<string, string> = { air_cargo: 'air-cargo', sea_freight: 'sea-freight', multi_mode: 'multi-modal' };
    return map[value] || value || '';
  }

  private mapPreferredMode(value: string): string {
    if (value === 'air-cargo') return 'air_cargo';
    if (value === 'sea-freight') return 'sea_freight';
    if (value === 'multi-modal') return 'multi_mode';
    return ['road', 'other'].includes(value) ? value : 'multi_mode';
  }

  private mapStatus(value: string): string {
    return value === 'hold' ? 'inactive' : value;
  }


  private formFromRecord(row: any) {
    return {
      customerCode: row.customerCode || '',
      customerName: row.customerName || '',
      companyName: row.companyName || '',
      customerType: row.customerType === 'company' ? 'exporter' : row.customerType || '',
      customerTypeOther: row.customerTypeOther || '',
      contactPerson: row.contactPerson || '',
      mobile: row.mobile || '',
      alternateMobile: row.alternateMobile || '',
      email: row.email || '',
      gstNumber: row.gstNumber || '',
      panNumber: row.panNumber || '',
      iecCode: row.iecNumber || row.iecCode || '',
      billingAddress: row.billingAddress?.addressLine1 || '',
      shippingAddress: row.shippingAddress?.addressLine1 || '',
      pickupAddress: row.pickupAddress?.addressLine1 || '',
      city: row.billingAddress?.city || row.shippingAddress?.city || '',
      state: row.billingAddress?.state || row.shippingAddress?.state || '',
      country: row.billingAddress?.country || row.shippingAddress?.country || 'India',
      pincode: row.billingAddress?.pincode || row.shippingAddress?.pincode || '',
      preferredMode: this.preferredModeValue(row.preferredMode),
      preferredModeOther: row.preferredModeOther || '',
      creditTerm: row.paymentTerms || 'advance',
      creditTermOther: row.paymentTermsOther || '',
      creditLimit: Number(row.creditLimit || 0),
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
    return {
      customerCode: '', customerName: '', companyName: '', customerType: '', customerTypeOther: '', contactPerson: '', mobile: '', alternateMobile: '', email: '', gstNumber: '', panNumber: '', iecCode: '', billingAddress: '', shippingAddress: '', pickupAddress: '', city: '', state: '', country: 'India', pincode: '', preferredMode: '', preferredModeOther: '', creditTerm: 'advance', creditTermOther: '', creditLimit: 0, bankName: '', accountName: '', accountNumber: '', ifscSwift: '', status: 'active', statusOther: '', remarks: ''
    };
  }
}






