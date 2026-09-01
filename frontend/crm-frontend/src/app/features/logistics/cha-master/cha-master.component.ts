import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option { label: string; value: string; }
interface PageResult<T> { data?: T[] | { data?: T[]; records?: T[]; vendors?: T[]; items?: T[] }; records?: T[]; vendors?: T[]; items?: T[]; }
interface ChaVendor {
  _id?: string;
  vendorCode?: string;
  vendorName?: string;
  companyName?: string;
  contactPerson?: string;
  mobile?: string;
  alternateMobile?: string;
  email?: string;
  website?: string;
  gstNumber?: string;
  panNumber?: string;
  iecNumber?: string;
  chaLicenseNumber?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  registrationNumber?: string;
  address?: { addressLine1?: string; addressLine2?: string; city?: string; state?: string; country?: string; pincode?: string };
  serviceLocations?: ChaLocation[];
  servicesOffered?: string[];
  chaCommercial?: ChaCommercial;
  paymentTerms?: string;
  paymentTermsOther?: string;
  creditDays?: number;
  currency?: string;
  bankDetails?: { bankName?: string; accountHolderName?: string; accountNumber?: string; ifscCode?: string; branchName?: string };
  openingPayable?: number;
  status?: string;
  remarks?: string;
}
interface ChaLocation { locationName: string; locationType: string; locationCode: string; city: string; }
interface ChaCommercial { defaultClearanceCharge: number; documentationCharge: number; handlingCharge: number; examinationCharge: number; gstRate: number; }
interface ChaCase { _id?: string; chaVendorId?: string; chaAgent?: string; status?: string; charges?: { totalCharges?: number }; }

@Component({
  selector: 'app-cha-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cha-master.component.html',
  styleUrl: './cha-master.component.scss'
})
export class ChaMasterComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly locationFilter = signal('all');
  protected readonly records = signal<ChaVendor[]>([]);
  protected readonly jobs = signal<ChaCase[]>([]);

  protected mode: 'list' | 'new' | 'detail' = 'list';
  protected selectedId = '';
  protected form = this.emptyForm();

  protected readonly statuses: Option[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Blocked', value: 'blocked' }
  ];

  protected readonly locationTypes: Option[] = [
    { label: 'Airport', value: 'airport' },
    { label: 'Seaport', value: 'seaport' },
    { label: 'ICD', value: 'icd' },
    { label: 'Land Customs Station', value: 'land_customs_station' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly serviceOptions: Option[] = [
    { label: 'Import Customs Clearance', value: 'import_customs_clearance' },
    { label: 'Export Customs Clearance', value: 'export_customs_clearance' },
    { label: 'Shipping Bill Filing', value: 'shipping_bill_filing' },
    { label: 'Bill of Entry Filing', value: 'bill_of_entry_filing' },
    { label: 'Documentation', value: 'documentation' },
    { label: 'Customs Examination', value: 'customs_examination' },
    { label: 'Duty Coordination', value: 'duty_coordination' },
    { label: 'Drawback Processing', value: 'drawback_processing' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly paymentTerms: Option[] = [
    { label: 'Advance', value: 'advance' },
    { label: 'Immediate', value: 'immediate' },
    { label: '7 Days', value: '7-days' },
    { label: '15 Days', value: '15-days' },
    { label: '30 Days', value: '30-days' },
    { label: 'Other', value: 'other' }
  ];

  ngOnInit(): void {
    this.route.url.subscribe(() => {
      this.selectedId = this.route.snapshot.paramMap.get('id') || '';
      this.mode = this.route.snapshot.routeConfig?.path === 'cha/master/new'
        ? 'new'
        : this.selectedId
          ? 'detail'
          : 'list';
      if (this.mode === 'new') this.form = this.emptyForm();
      this.loadChaMasters();
      this.loadJobs();
    });
  }

  protected readonly locationOptions = computed(() => {
    const names = new Set<string>();
    this.records().forEach((row) => (row.serviceLocations || []).forEach((loc) => {
      if (loc.locationName) names.add(loc.locationName);
    }));
    return Array.from(names).sort();
  });

  protected readonly filteredRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const location = this.locationFilter();
    return this.records().filter((row) => {
      const primaryLocation = this.primaryLocation(row).toLowerCase();
      const matchesSearch = !query || [
        row.vendorCode, row.vendorName, row.companyName, row.contactPerson, row.mobile,
        row.chaLicenseNumber, row.gstNumber
      ].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = status === 'all' || row.status === status;
      const matchesLocation = location === 'all' || primaryLocation.includes(location.toLowerCase());
      return matchesSearch && matchesStatus && matchesLocation;
    });
  });

  protected readonly selectedCha = computed(() => this.records().find((row) => row._id === this.selectedId) || null);

  protected readonly summary = computed(() => ({
    total: this.records().length,
    active: this.records().filter((row) => row.status === 'active').length,
    inactive: this.records().filter((row) => row.status === 'inactive' || row.status === 'blocked').length,
    expiring: this.records().filter((row) => this.isLicenseExpiring(row)).length
  }));

  protected readonly detailSummary = computed(() => {
    const cha = this.selectedCha();
    const jobs = cha?._id ? this.jobs().filter((job) => this.jobChaId(job) === cha._id || job.chaAgent === cha.vendorName) : [];
    return {
      total: jobs.length,
      pending: jobs.filter((job) => !['cleared', 'hold', 'query_raised', 'cancelled'].includes(String(job.status || ''))).length,
      hold: jobs.filter((job) => ['hold', 'query_raised'].includes(String(job.status || ''))).length,
      cleared: jobs.filter((job) => job.status === 'cleared').length,
      outstanding: Number(cha?.openingPayable || 0)
    };
  });

  protected loadChaMasters(): void {
    this.isLoading.set(true);
    this.api.get<PageResult<ChaVendor>>('/logistics/vendors', { page: 1, limit: 100, vendorType: 'cha', sortBy: 'vendorName', sortOrder: 'asc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const rows = this.extractRows(response);
          this.records.set(rows);
          if (this.mode === 'detail' && this.selectedId && !rows.some((row) => row._id === this.selectedId)) {
            this.errorMessage.set('CHA record not found.');
          }
        },
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load CHA master records.')
      });
  }

  protected loadJobs(): void {
    this.api.get<PageResult<ChaCase>>('/logistics/cha', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .subscribe({ next: (response) => this.jobs.set(this.extractRows(response)), error: () => this.jobs.set([]) });
  }

  protected saveCha(): void {
    const error = this.validate();
    if (error) { this.errorMessage.set(error); window.alert(error); return; }
    const payload = this.buildPayload();
    const request = this.selectedId
      ? this.api.patch<ChaVendor>(`/logistics/vendors/${this.selectedId}`, payload)
      : this.api.post<ChaVendor>('/logistics/vendors', payload);
    this.isSaving.set(true);
    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (record) => {
          const savedId = record?._id || this.selectedId;
          this.message.set('CHA saved successfully.');
          window.alert('CHA saved successfully.');
          void this.router.navigate(['/logistics/cha/master', savedId].filter(Boolean));
        },
        error: (error) => {
          const text = error?.error?.message || error?.error?.errors?.[0]?.message || 'Unable to save CHA.';
          this.errorMessage.set(text);
          window.alert(text);
        }
      });
  }

  protected viewCha(row: ChaVendor): void { if (row._id) void this.router.navigate(['/logistics/cha/master', row._id]); }
  protected addCha(): void { void this.router.navigate(['/logistics/cha/master/new']); }
  protected cancel(): void { void this.router.navigate(['/logistics/cha/master']); }

  protected editCha(row: ChaVendor): void {
    this.mode = 'new';
    this.selectedId = row._id || '';
    this.form = this.formFromRecord(row);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected updateStatus(row: ChaVendor): void {
    if (!row._id) return;
    const nextStatus = row.status === 'active' ? 'inactive' : 'active';
    this.api.patch(`/logistics/vendors/${row._id}`, { status: nextStatus })
      .subscribe({ next: () => this.loadChaMasters(), error: (error) => window.alert(error?.error?.message || 'Unable to update CHA status.') });
  }


  protected deleteCha(row: ChaVendor): void {
    if (!row._id) return;
    if (!window.confirm('Delete this CHA master?')) return;
    this.api.delete('/logistics/vendors/' + row._id)
      .subscribe({
        next: () => {
          this.loadChaMasters();
          window.alert('CHA deleted successfully.');
        },
        error: (error) => window.alert(error?.error?.message || 'Unable to delete CHA.')
      });
  }
  protected addLocation(): void { this.form.serviceLocations.push({ locationName: '', locationType: 'airport', locationCode: '', city: '' }); }
  protected removeLocation(index: number): void { if (this.form.serviceLocations.length > 1) this.form.serviceLocations.splice(index, 1); }

  protected toggleService(value: string): void {
    const current = new Set(this.form.servicesOffered);
    current.has(value) ? current.delete(value) : current.add(value);
    this.form.servicesOffered = Array.from(current);
  }
  protected hasService(value: string): boolean { return this.form.servicesOffered.includes(value); }

  protected primaryLocation(row: ChaVendor): string { return row.serviceLocations?.[0]?.locationName || row.address?.city || '-'; }
  protected formatDate(value?: string): string { return value ? new Date(value).toLocaleDateString('en-IN') : '-'; }
  protected statusLabel(value?: string): string { return this.statuses.find((item) => item.value === value)?.label || value || '-'; }
  protected serviceLabel(value: string): string { return this.serviceOptions.find((item) => item.value === value)?.label || value; }
  protected locationTypeLabel(value: string): string { return this.locationTypes.find((item) => item.value === value)?.label || value; }
  protected formatCurrency(value: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0)); }

  private isLicenseExpiring(row: ChaVendor): boolean {
    if (!row.licenseExpiryDate) return false;
    const expiry = new Date(row.licenseExpiryDate).getTime();
    const now = Date.now();
    const in90Days = now + 90 * 24 * 60 * 60 * 1000;
    return expiry >= now && expiry <= in90Days;
  }

  private jobChaId(job: ChaCase): string {
    const value: any = job.chaVendorId;
    return typeof value === 'object' && value ? value._id || '' : String(value || '');
  }

  private validate(): string {
    if (!this.form.vendorName.trim()) return 'CHA / Company Name is required.';
    if (!this.form.contactPerson.trim()) return 'Contact Person is required.';
    if (!this.form.mobile.trim()) return 'Mobile is required.';
    if (!this.form.email.trim()) return 'Email is required.';
    if (!this.form.chaLicenseNumber.trim()) return 'CHA License Number is required.';
    if (!this.form.remarks.trim()) return 'Internal Remarks are required.';
    return '';
  }

  private buildPayload(): Record<string, unknown> {
    return {
      vendorType: 'cha',
      vendorName: this.form.vendorName.trim(),
      companyName: this.form.vendorName.trim(),
      contactPerson: this.form.contactPerson.trim(),
      mobile: this.form.mobile.trim(),
      alternateMobile: this.form.alternateMobile.trim(),
      email: this.form.email.trim(),
      website: this.form.website.trim(),
      gstNumber: this.form.gstNumber.trim(),
      panNumber: this.form.panNumber.trim(),
      iecNumber: this.form.iecNumber.trim(),
      chaLicenseNumber: this.form.chaLicenseNumber.trim(),
      licenseIssueDate: this.form.licenseIssueDate || null,
      licenseExpiryDate: this.form.licenseExpiryDate || null,
      registrationNumber: this.form.registrationNumber.trim(),
      address: {
        addressLine1: this.form.addressLine1.trim(), addressLine2: this.form.addressLine2.trim(),
        city: this.form.city.trim(), state: this.form.state.trim(), country: this.form.country.trim() || 'India', pincode: this.form.pincode.trim()
      },
      serviceCategory: 'customs_cha',
      serviceLocations: this.form.serviceLocations.filter((loc) => loc.locationName.trim() || loc.locationCode.trim() || loc.city.trim()),
      servicesOffered: this.form.servicesOffered,
      chaCommercial: this.form.chaCommercial,
      paymentTerms: this.form.paymentTerms,
      paymentTermsOther: this.form.paymentTerms === 'other' ? this.form.paymentTermsOther.trim() : '',
      creditDays: Number(this.form.creditDays || 0),
      openingPayable: Number(this.form.openingPayable || 0),
      currency: this.form.currency.trim() || 'INR',
      preferredPaymentMode: 'bank_transfer',
      bankDetails: {
        bankName: this.form.bankName.trim(), accountHolderName: this.form.accountHolderName.trim(),
        accountNumber: this.form.accountNumber.trim(), ifscCode: this.form.ifscCode.trim(), branchName: this.form.branchName.trim()
      },
      status: this.form.status,
      remarks: this.form.remarks.trim()
    };
  }

  private formFromRecord(row: ChaVendor): any {
    return {
      ...this.emptyForm(),
      vendorName: row.vendorName || row.companyName || '', contactPerson: row.contactPerson || '', mobile: row.mobile || '',
      alternateMobile: row.alternateMobile || '', email: row.email || '', website: row.website || '', status: row.status || 'active',
      chaLicenseNumber: row.chaLicenseNumber || '', licenseIssueDate: this.dateInput(row.licenseIssueDate), licenseExpiryDate: this.dateInput(row.licenseExpiryDate),
      panNumber: row.panNumber || '', gstNumber: row.gstNumber || '', iecNumber: row.iecNumber || '', registrationNumber: row.registrationNumber || '',
      addressLine1: row.address?.addressLine1 || '', addressLine2: row.address?.addressLine2 || '', city: row.address?.city || '',
      state: row.address?.state || '', country: row.address?.country || 'India', pincode: row.address?.pincode || '',
      serviceLocations: row.serviceLocations?.length ? row.serviceLocations : [{ locationName: '', locationType: 'airport', locationCode: '', city: '' }],
      servicesOffered: row.servicesOffered || [], chaCommercial: row.chaCommercial || this.emptyCommercial(),
      paymentTerms: row.paymentTerms || 'advance', paymentTermsOther: row.paymentTermsOther || '', creditDays: Number(row.creditDays || 0),
      openingPayable: Number(row.openingPayable || 0), currency: row.currency || 'INR', bankName: row.bankDetails?.bankName || '',
      accountHolderName: row.bankDetails?.accountHolderName || '', accountNumber: row.bankDetails?.accountNumber || '',
      ifscCode: row.bankDetails?.ifscCode || '', branchName: row.bankDetails?.branchName || '', remarks: row.remarks || ''
    };
  }

  private extractRows<T>(response: PageResult<T> | T[] | null | undefined): T[] {
    if (Array.isArray(response)) return response;
    const data = response?.data;
    if (Array.isArray(data)) return data;
    return data?.data || data?.records || data?.vendors || data?.items || response?.records || response?.vendors || response?.items || [];
  }

  private dateInput(value?: string): string { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
  private emptyCommercial(): ChaCommercial { return { defaultClearanceCharge: 0, documentationCharge: 0, handlingCharge: 0, examinationCharge: 0, gstRate: 18 }; }
  private emptyForm() {
    return {
      vendorName: '', contactPerson: '', mobile: '', alternateMobile: '', email: '', website: '', status: 'active',
      chaLicenseNumber: '', licenseIssueDate: '', licenseExpiryDate: '', panNumber: '', gstNumber: '', iecNumber: '', registrationNumber: '',
      addressLine1: '', addressLine2: '', city: '', state: '', country: 'India', pincode: '',
      serviceLocations: [{ locationName: '', locationType: 'airport', locationCode: '', city: '' }],
      servicesOffered: ['import_customs_clearance', 'export_customs_clearance'],
      chaCommercial: this.emptyCommercial(), paymentTerms: 'advance', paymentTermsOther: '', creditDays: 0, openingPayable: 0, currency: 'INR',
      bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: '', remarks: ''
    };
  }
}


