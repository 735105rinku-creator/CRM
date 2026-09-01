import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { FormsModule } from '@angular/forms';

interface Option {
  label: string;
  value: string;
}

interface TransporterRecord {
  _id?: string;
  id: number;
  transporterCode: string;
  transporterName: string;
  contactPerson: string;
  mobile: string;
  city: string;
  vehicleCount: number;
  status: string;
  raw?: any;
}

@Component({
  selector: 'app-transporter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transporter.component.html',
  styleUrl: './transporter.component.scss'
})
export class TransporterComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly selectedTransporter = signal<any | null>(null);
  protected editingId = '';

  protected readonly transporterTypes: Option[] = [
    { label: 'Local Transporter', value: 'local' },
    { label: 'Interstate Transporter', value: 'interstate' },
    { label: 'Dedicated Fleet', value: 'dedicated' },
    { label: 'Third Party Logistics', value: '3pl' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly vehicleTypes: Option[] = [
    { label: 'Pickup', value: 'pickup' },
    { label: 'Mini Truck', value: 'mini-truck' },
    { label: '14 FT Truck', value: '14-ft' },
    { label: '17 FT Truck', value: '17-ft' },
    { label: '19 FT Truck', value: '19-ft' },
    { label: '32 FT Container', value: '32-ft-container' },
    { label: 'Trailer', value: 'trailer' },
    { label: 'Reefer Truck', value: 'reefer' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly statusOptions: Option[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Blacklisted', value: 'blacklisted' },
    { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();

  protected readonly records = signal<TransporterRecord[]>([]);

  ngOnInit(): void { this.loadTransporters(); }

  protected loadTransporters(): void {
    this.isLoading.set(true);
    this.api.get<any>('/logistics/transporters', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => this.records.set(this.normalizeRows(this.extractRows(response))),
        error: (error: any) => window.alert(error?.error?.message || 'Unable to load transporters.')
      });
  }

  protected readonly filteredRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.records().filter((item) => {
      const matchesSearch =
        !query ||
        item.transporterCode.toLowerCase().includes(query) ||
        item.transporterName.toLowerCase().includes(query) ||
        item.contactPerson.toLowerCase().includes(query) ||
        item.mobile.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query);

      const matchesStatus =
        status === 'all' || item.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  protected readonly summary = computed(() => ({
    total: this.records().length,
    active: this.records().filter(x => x.status === 'active').length,
    inactive: this.records().filter(x => x.status === 'inactive').length,
    vehicles: this.records().reduce((sum, x) => sum + x.vehicleCount, 0)
  }));

  protected openForm(): void {
    this.editingId = '';
    this.selectedTransporter.set(null);
    this.form = this.emptyForm();
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId = '';
  }

  protected saveTransporter(): void {
    if (!this.form.transporterName.trim() || !this.form.contactPerson.trim() || !this.form.mobile.trim() || !this.form.address.trim()) {
      window.alert('Transporter Name, Contact Person, Mobile and Address are required.');
      return;
    }
    const payload = {
      transporterName: this.form.transporterName.trim(),
      contactPerson: this.form.contactPerson.trim(),
      mobile: this.form.mobile.trim(),
      alternateMobile: this.form.alternateMobile,
      email: this.form.email,
      gstNumber: this.form.gstNumber,
      panNumber: this.form.panNumber,
      address: this.form.address,
      city: this.form.city,
      state: this.form.state,
      country: 'India',
      pincode: this.form.pincode,
      serviceType: this.mapServiceType(this.form.transporterType),
      serviceTypeOther: this.form.transporterTypeOther,
      vehicleTypes: this.form.vehicleType ? [this.form.vehicleType] : [],
      defaultDriverName: this.form.driverName,
      defaultDriverMobile: this.form.driverMobile,
      defaultVehicleNumber: this.form.vehicleNumber,
      creditDays: 0,
      bankDetails: { bankName: this.form.bankName, accountHolderName: this.form.accountName, accountNumber: this.form.accountNumber, ifscCode: this.form.ifscCode },
      status: this.form.status === 'blacklisted' ? 'blocked' : this.form.status,
      statusOther: this.form.statusOther,
      remarks: this.form.remarks.trim() || 'Created from transporter form.'
    };
    const request = this.editingId
      ? this.api.patch(`/logistics/transporters/${this.editingId}`, payload)
      : this.api.post('/logistics/transporters', payload);
    this.isSaving.set(true);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => { this.showForm.set(false); this.editingId = ''; this.loadTransporters(); window.alert('Transporter saved successfully.'); },
      error: (error: any) => window.alert(error?.error?.message || 'Unable to save transporter.')
    });
  }
  protected viewTransporter(item: TransporterRecord): void {
    this.selectedTransporter.set(item.raw || item);
    this.showForm.set(false);
    this.editingId = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected editTransporter(item: TransporterRecord): void {
    const record = item.raw || item;
    this.editingId = item._id || record?._id || '';
    this.selectedTransporter.set(null);
    this.form = this.formFromRecord(record);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  protected statusLabel(status: string): string {
    return this.statusOptions.find(x => x.value === status)?.label || status;
  }

  private normalizeRows(rows: any[]): TransporterRecord[] {
    return rows.map((row, index) => ({
      _id: row._id,
      id: index + 1,
      transporterCode: row.transporterCode || `TRN-${String(index + 1).padStart(3, '0')}`,
      transporterName: row.transporterName || '-',
      contactPerson: row.contactPerson || '-',
      mobile: row.mobile || '-',
      city: row.city || '',
      vehicleCount: Array.isArray(row.vehicleTypes) ? row.vehicleTypes.length : 0,
      status: row.status || 'active',
      raw: row
    }));
  }

  private mapServiceType(value: string): string {
    if (value === 'local') return 'local';
    if (value === 'interstate' || value === 'dedicated' || value === '3pl') return 'domestic';
    return value || 'domestic';
  }

  private extractRows(response: any): any[] {
    if (Array.isArray(response)) return response;
    const data = response?.data;
    if (Array.isArray(data)) return data;
    return data?.data || data?.records || response?.records || [];
  }

  private formFromRecord(row: any) {
    return {
      transporterCode: row.transporterCode || '',
      transporterName: row.transporterName || '',
      transporterType: row.serviceType === 'local' ? 'local' : 'interstate',
      transporterTypeOther: row.serviceTypeOther || '',
      contactPerson: row.contactPerson || '',
      mobile: row.mobile || '',
      alternateMobile: row.alternateMobile || '',
      email: row.email || '',
      gstNumber: row.gstNumber || '',
      panNumber: row.panNumber || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      pincode: row.pincode || '',
      vehicleType: Array.isArray(row.vehicleTypes) ? row.vehicleTypes[0] || '' : '',
      vehicleTypeOther: '',
      vehicleNumber: row.defaultVehicleNumber || '',
      vehicleCapacity: 0,
      driverName: row.defaultDriverName || '',
      driverMobile: row.defaultDriverMobile || '',
      driverLicense: '',
      ratePerKm: 0,
      minimumCharge: 0,
      loadingCharge: 0,
      unloadingCharge: 0,
      waitingCharge: 0,
      bankName: row.bankDetails?.bankName || '',
      accountName: row.bankDetails?.accountHolderName || '',
      accountNumber: row.bankDetails?.accountNumber || '',
      ifscCode: row.bankDetails?.ifscCode || '',
      status: row.status === 'blocked' ? 'blacklisted' : row.status || 'active',
      statusOther: row.statusOther || '',
      remarks: row.remarks || ''
    };
  }
  private emptyForm() {
    return {
      transporterCode: 'TRN-004',

      transporterName: '',
      transporterType: '',
      transporterTypeOther: '',

      contactPerson: '',
      mobile: '',
      alternateMobile: '',
      email: '',

      gstNumber: '',
      panNumber: '',

      address: '',
      city: '',
      state: '',
      pincode: '',

      vehicleType: '',
      vehicleTypeOther: '',
      vehicleNumber: '',
      vehicleCapacity: 0,

      driverName: '',
      driverMobile: '',
      driverLicense: '',

      ratePerKm: 0,
      minimumCharge: 0,
      loadingCharge: 0,
      unloadingCharge: 0,
      waitingCharge: 0,

      bankName: '',
      accountName: '',
      accountNumber: '',
      ifscCode: '',

      status: 'active',
      statusOther: '',

      remarks: ''
    };
  }
}




