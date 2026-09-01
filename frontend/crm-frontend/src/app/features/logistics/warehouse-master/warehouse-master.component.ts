import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option { label: string; value: string; }
interface PageResult<T> { data?: T[] | { data?: T[]; records?: T[]; items?: T[]; warehouses?: T[] }; records?: T[]; items?: T[]; warehouses?: T[]; }
interface WarehouseMaster {
  _id?: string;
  warehouseCode?: string;
  warehouseName?: string;
  address?: any;
  contact?: any;
  storage?: any;
  rates?: any;
  gstNumber?: string;
  licenseNumber?: string;
  status?: string;
  statusOther?: string;
  receipts?: any[];
  remarks?: string;
}

@Component({
  selector: 'app-warehouse-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse-master.component.html',
  styleUrl: './warehouse-master.component.scss'
})
export class WarehouseMasterComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly typeFilter = signal('all');
  protected readonly records = signal<WarehouseMaster[]>([]);
  protected readonly selected = signal<WarehouseMaster | null>(null);
  protected mode: 'list' | 'new' | 'detail' = 'list';
  protected selectedId = '';
  protected form = this.emptyForm();

  protected readonly statuses: Option[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Full', value: 'full' },
    { label: 'Maintenance', value: 'maintenance' }
  ];

  protected readonly warehouseTypes: Option[] = [
    { label: 'General', value: 'general' },
    { label: 'Cold Storage', value: 'cold_storage' },
    { label: 'Bonded', value: 'bonded' },
    { label: 'Hazardous', value: 'dry' },
    { label: 'Temperature Controlled', value: 'reefer' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly capacityUnits: Option[] = [
    { label: 'Sq Ft', value: 'sq_ft' },
    { label: 'Sq M', value: 'sq_m' },
    { label: 'MT', value: 'mt' },
    { label: 'Ton', value: 'ton' },
    { label: 'Pallet', value: 'pallet' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly capabilityOptions: Option[] = [
    { label: 'General Storage', value: 'general' },
    { label: 'Cold Storage', value: 'cold_storage' },
    { label: 'Bonded', value: 'bonded' },
    { label: 'Hazardous', value: 'dry' },
    { label: 'Temperature Controlled', value: 'reefer' }
  ];

  protected readonly filteredRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const type = this.typeFilter();
    return this.records().filter((row) => {
      const values = [row.warehouseCode, row.warehouseName, row.address?.city, row.contact?.contactPerson, row.contact?.mobile];
      const matchesSearch = !query || values.some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = status === 'all' || row.status === status;
      const matchesType = type === 'all' || row.storage?.storageType === type;
      return matchesSearch && matchesStatus && matchesType;
    });
  });

  protected readonly summary = computed(() => {
    const rows = this.records();
    const totalCapacity = rows.reduce((sum, row) => sum + Number(row.storage?.totalCapacity || 0), 0);
    const occupied = rows.reduce((sum, row) => sum + Number(row.storage?.occupiedCapacity || 0), 0);
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === 'active').length,
      inactive: rows.filter((row) => row.status === 'inactive').length,
      capacityUsed: totalCapacity ? Math.round((occupied / totalCapacity) * 100) : 0
    };
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || '';
      this.selectedId = id;
      this.mode = this.route.snapshot.routeConfig?.path === 'warehouse/master/new' ? 'new' : id ? 'detail' : 'list';
      if (this.mode === 'new') this.form = this.emptyForm();
      this.loadWarehouses(id);
    });
  }

  protected addWarehouse(): void { this.router.navigateByUrl('/logistics/warehouse/master/new'); }
  protected cancel(): void { this.router.navigateByUrl('/logistics/warehouse/master'); }
  protected viewWarehouse(row: WarehouseMaster): void { if (row._id) this.router.navigateByUrl('/logistics/warehouse/master/' + row._id); }

  protected editWarehouse(row: WarehouseMaster): void {
    this.selectedId = row._id || '';
    this.selected.set(row);
    this.form = this.formFromRecord(row);
    this.mode = 'new';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected saveWarehouse(): void {
    if (!this.form.warehouseName.trim()) { window.alert('Warehouse name is required.'); return; }
    if (!this.form.contact.contactPerson.trim()) { window.alert('Contact person is required.'); return; }
    if (!this.form.contact.mobile.trim()) { window.alert('Mobile is required.'); return; }
    if (!this.form.address.addressLine1.trim() || !this.form.address.city.trim() || !this.form.address.state.trim()) { window.alert('Address, city and state are required.'); return; }
    if (!this.form.remarks.trim()) { window.alert('Remarks are required.'); return; }

    const payload = this.payloadFromForm();
    this.isSaving.set(true);
    const request = this.selectedId
      ? this.api.patch<WarehouseMaster>('/logistics/warehouse/' + this.selectedId, payload)
      : this.api.post<WarehouseMaster>('/logistics/warehouse', payload);

    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        window.alert('Warehouse saved successfully.');
        this.router.navigateByUrl('/logistics/warehouse/master');
        this.loadWarehouses();
      },
      error: (error: any) => window.alert(error?.error?.message || 'Unable to save warehouse.')
    });
  }

  protected updateStatus(row: WarehouseMaster): void {
    if (!row._id) return;
    const nextStatus = row.status === 'active' ? 'inactive' : 'active';
    this.api.patch<WarehouseMaster>('/logistics/warehouse/' + row._id, { status: nextStatus })
      .subscribe({ next: () => this.loadWarehouses(), error: (error: any) => window.alert(error?.error?.message || 'Unable to update warehouse status.') });
  }

  protected hasCapability(value: string): boolean { return this.form.capabilities.includes(value); }
  protected toggleCapability(value: string): void {
    this.form.capabilities = this.hasCapability(value)
      ? this.form.capabilities.filter((item: string) => item !== value)
      : [...this.form.capabilities, value];
    if (!this.form.capabilities.length) this.form.capabilities = [this.form.storage.storageType];
  }

  protected typeLabel(value?: string): string { return this.warehouseTypes.find((item) => item.value === value)?.label || value || '-'; }
  protected unitLabel(value?: string, other?: string): string { return value === 'other' ? other || 'Other' : this.capacityUnits.find((item) => item.value === value)?.label || value || '-'; }
  protected statusLabel(value?: string): string { return this.statuses.find((item) => item.value === value)?.label || value || '-'; }
  protected availableCapacity(row: WarehouseMaster): number { return Math.max(0, Number(row.storage?.totalCapacity || 0) - Number(row.storage?.occupiedCapacity || 0)); }
  protected addressText(row: WarehouseMaster): string { return [row.address?.addressLine1, row.address?.addressLine2, row.address?.city, row.address?.state, row.address?.country, row.address?.pincode].filter(Boolean).join(', ') || '-'; }

  private loadWarehouses(selectId = ''): void {
    this.isLoading.set(true);
    this.api.get<PageResult<WarehouseMaster>>('/logistics/warehouse', { page: 1, limit: 100, sortBy: 'warehouseName', sortOrder: 'asc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const rows = this.extractRows(response);
          this.records.set(rows);
          if (selectId) {
            const found = rows.find((row) => row._id === selectId) || null;
            this.selected.set(found);
            if (found) this.form = this.formFromRecord(found);
          }
        },
        error: (error: any) => window.alert(error?.error?.message || 'Unable to load warehouses.')
      });
  }

  private payloadFromForm(): any {
    const selectedCapability = this.form.capabilities[0] || this.form.storage.storageType || 'general';
    return {
      warehouseName: this.form.warehouseName.trim(),
      address: this.form.address,
      contact: this.form.contact,
      storage: {
        totalCapacity: Number(this.form.storage.totalCapacity || 0),
        occupiedCapacity: Number(this.form.storage.occupiedCapacity || 0),
        capacityUnit: this.form.storage.capacityUnit,
        capacityUnitOther: this.form.storage.capacityUnit === 'other' ? this.form.storage.capacityUnitOther || 'Other' : '',
        storageType: selectedCapability,
        storageTypeOther: selectedCapability === 'other' ? this.form.storage.storageTypeOther || 'Other' : '',
        minTemperature: this.form.storage.minTemperature || null,
        maxTemperature: this.form.storage.maxTemperature || null
      },
      rates: this.form.rates,
      gstNumber: this.form.gstNumber,
      licenseNumber: this.form.licenseNumber,
      status: this.form.status,
      remarks: this.form.remarks.trim()
    };
  }

  private formFromRecord(row: WarehouseMaster): any {
    return {
      warehouseCode: row.warehouseCode || 'Auto generated',
      warehouseName: row.warehouseName || '',
      companyName: '',
      status: row.status || 'active',
      contact: { contactPerson: row.contact?.contactPerson || '', mobile: row.contact?.mobile || '', alternateMobile: row.contact?.alternateMobile || '', email: row.contact?.email || '' },
      address: { addressLine1: row.address?.addressLine1 || '', addressLine2: row.address?.addressLine2 || '', city: row.address?.city || '', state: row.address?.state || '', country: row.address?.country || 'India', pincode: row.address?.pincode || '' },
      storage: { totalCapacity: Number(row.storage?.totalCapacity || 0), occupiedCapacity: Number(row.storage?.occupiedCapacity || 0), capacityUnit: row.storage?.capacityUnit || 'sq_ft', capacityUnitOther: row.storage?.capacityUnitOther || '', storageType: row.storage?.storageType || 'general', storageTypeOther: row.storage?.storageTypeOther || '', minTemperature: row.storage?.minTemperature || null, maxTemperature: row.storage?.maxTemperature || null },
      rates: { storageRate: Number(row.rates?.storageRate || 0), storageRateUnit: row.rates?.storageRateUnit || 'per_day', inwardHandlingCharge: Number(row.rates?.inwardHandlingCharge || 0), outwardHandlingCharge: Number(row.rates?.outwardHandlingCharge || 0), loadingCharge: Number(row.rates?.loadingCharge || 0), unloadingCharge: Number(row.rates?.unloadingCharge || 0), currency: row.rates?.currency || 'INR' },
      capabilities: [row.storage?.storageType || 'general'],
      operatingHours: '', numberOfDocks: 0, forkliftAvailable: false, operations24x7: false, temperatureMonitoring: false,
      gstNumber: row.gstNumber || '', licenseNumber: row.licenseNumber || '', remarks: row.remarks || ''
    };
  }

  private emptyForm(): any {
    return {
      warehouseCode: 'Auto generated', warehouseName: '', companyName: '', status: 'active',
      contact: { contactPerson: '', mobile: '', alternateMobile: '', email: '' },
      address: { addressLine1: '', addressLine2: '', city: '', state: '', country: 'India', pincode: '' },
      storage: { totalCapacity: 0, occupiedCapacity: 0, capacityUnit: 'sq_ft', capacityUnitOther: '', storageType: 'general', storageTypeOther: '', minTemperature: null, maxTemperature: null },
      rates: { storageRate: 0, storageRateUnit: 'per_day', inwardHandlingCharge: 0, outwardHandlingCharge: 0, loadingCharge: 0, unloadingCharge: 0, currency: 'INR' },
      capabilities: ['general'], operatingHours: '', numberOfDocks: 0, forkliftAvailable: false, operations24x7: false, temperatureMonitoring: false,
      gstNumber: '', licenseNumber: '', remarks: ''
    };
  }

  private extractRows<T>(response: PageResult<T> | T[] | null | undefined): T[] {
    if (Array.isArray(response)) return response;
    const data = response?.data;
    if (Array.isArray(data)) return data;
    return data?.data || data?.records || data?.items || data?.warehouses || response?.records || response?.items || response?.warehouses || [];
  }
}

