import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option { label: string; value: string; }
interface PageResult<T> { data?: T[] | { data?: T[]; records?: T[] }; records?: T[]; }
interface ServiceRecord { _id?: string; id?: number; serviceCode: string; serviceName: string; category: string; unit: string; defaultRate: number; gstRate: number; status: string; raw?: any; }

@Component({
  selector: 'app-products-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products-services.component.html',
  styleUrl: './products-services.component.scss'
})
export class ProductsServicesComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly showForm = signal(false);
  protected readonly search = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly selectedService = signal<any | null>(null);
  protected editingId = '';

  protected readonly categories: Option[] = [
    { label: 'Air Freight', value: 'air-freight' }, { label: 'Sea Freight', value: 'sea-freight' },
    { label: 'CHA / Customs', value: 'cha' }, { label: 'Transportation', value: 'transportation' },
    { label: 'Warehouse', value: 'warehouse' }, { label: 'Documentation', value: 'documentation' },
    { label: 'Insurance', value: 'insurance' }, { label: 'Packaging', value: 'packaging' },
    { label: 'Handling', value: 'handling' }, { label: 'Other', value: 'other' }
  ];
  protected readonly units: Option[] = [
    { label: 'Per Kg', value: 'kg' }, { label: 'Per MT', value: 'mt' },
    { label: 'Per Shipment', value: 'shipment' }, { label: 'Per Container', value: 'container' },
    { label: 'Per Package', value: 'package' }, { label: 'Per Day', value: 'day' },
    { label: 'Per Km', value: 'km' }, { label: 'Fixed Service', value: 'service' },
    { label: 'Other', value: 'other' }
  ];
  protected readonly gstRates: Option[] = [
    { label: '0%', value: '0' }, { label: '5%', value: '5' }, { label: '12%', value: '12' },
    { label: '18%', value: '18' }, { label: '28%', value: '28' }, { label: 'Other', value: 'other' }
  ];
  protected readonly statuses: Option[] = [
    { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();
  protected readonly records = signal<ServiceRecord[]>([]);

  ngOnInit(): void { this.loadServices(); }

  protected readonly filteredRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.categoryFilter();
    return this.records().filter((item) => {
      const matchesSearch = !query || item.serviceCode.toLowerCase().includes(query) || item.serviceName.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
      const normalizedCategory = item.category.toLowerCase().replace(/\s*\/\s*/g, '-').replace(/\s+/g, '-');
      return matchesSearch && (category === 'all' || normalizedCategory.includes(category));
    });
  });

  protected readonly summary = computed(() => ({
    total: this.records().length,
    active: this.records().filter((item) => item.status === 'active').length,
    freight: this.records().filter((item) => item.category.includes('Freight')).length,
    support: this.records().filter((item) => !item.category.includes('Freight')).length
  }));

  protected loadServices(): void {
    this.isLoading.set(true);
    this.api.get<PageResult<any>>('/logistics/products-services', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => this.records.set(this.normalizeRows(this.extractRows(response))),
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load Products / Services.')
      });
  }

  protected openForm(): void { this.editingId = ''; this.selectedService.set(null); this.form = this.emptyForm(); this.showForm.set(true); }
  protected closeForm(): void { this.showForm.set(false); this.editingId = ''; }

  protected saveService(): void {
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
      ? this.api.patch<ServiceRecord>('/logistics/products-services/' + this.editingId, payload)
      : this.api.post<ServiceRecord>('/logistics/products-services', payload);

    request
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Product / Service saved successfully.');
          this.showForm.set(false);
          this.form = this.emptyForm();
          this.loadServices();
          window.alert('Product / Service saved successfully.');
        },
        error: (error: { status?: number; error?: { message?: string; errors?: Array<{ message?: string }> } }) => {
          const message = this.apiErrorMessage(error, 'Unable to save Product / Service.');
          this.errorMessage.set(message);
          window.alert(message);
        }
      });
  }

  private validateForm(payload: Record<string, unknown>): string {
    if (!String(payload['name'] || '').trim()) return 'Service Name is required.';
    if (!this.form.category) return 'Category is required.';
    if (this.form.category === 'other' && !this.form.categoryOther.trim()) return 'Category is required when Other is selected.';
    if (!this.form.unit) return 'Unit is required.';
    if (this.form.unit === 'other' && !this.form.unitOther.trim()) return 'Unit is required when Other is selected.';
    if (this.form.gstRate === 'other' && !this.form.gstRateOther.trim()) return 'GST Rate is required when Other is selected.';
    if (this.form.status === 'other' && !this.form.statusOther.trim()) return 'Status is required when Other is selected.';
    if (!String(payload['remarks'] || '').trim()) return 'Remarks are compulsory.';
    return '';
  }

  private apiErrorMessage(error: { status?: number; error?: { message?: string; errors?: Array<{ message?: string }> } }, fallback: string): string {
    if (error?.status === 0) {
      return 'Backend server is not running or API is unreachable. Please start backend and try again.';
    }

    return error?.error?.message || error?.error?.errors?.[0]?.message || fallback;
  }

  protected viewService(item: ServiceRecord): void {
    this.selectedService.set(item.raw || item);
    this.showForm.set(false);
    this.editingId = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected editService(item: ServiceRecord): void {
    const record = item.raw || item;
    this.editingId = record?._id || item._id || '';
    this.selectedService.set(null);
    this.form = this.formFromRecord(record);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);
  }

  protected statusLabel(status: string): string {
    return this.statuses.find((option) => option.value === status)?.label || status;
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
    const isProduct = this.form.applicableForAir || this.form.applicableForSea || this.form.applicableForRoad ? 'service' : 'service';
    return {
      itemType: isProduct,
      name: this.form.serviceName.trim(),
      category: this.form.category === 'other' ? this.form.categoryOther.trim() || 'Other' : this.categoryLabel(this.form.category),
      categoryOther: this.form.categoryOther,
      description: this.form.description,
      hsnSacCode: this.form.sacHsnCode,
      unit: this.mapUnit(this.form.unit),
      unitOther: this.form.unitOther,
      costPrice: Number(this.form.minimumCharge || 0),
      salePrice: Number(this.form.defaultRate || 0),
      taxPercent: this.form.gstRate === 'other' ? Number(this.form.gstRateOther || 0) : Number(this.form.gstRate || 0),
      currency: 'INR',
      serviceMode: this.mapServiceMode(this.form.category),
      status: this.form.status === 'other' ? 'other' : this.form.status,
      statusOther: this.form.statusOther,
      remarks: this.form.remarks.trim() || 'Created from products/services form.'
    };
  }

  private normalizeRows(rows: any[]): ServiceRecord[] {
    return rows.map((row, index) => ({
      _id: row._id,
      id: index + 1,
      serviceCode: row.itemCode || row.serviceCode || `SRV-${String(index + 1).padStart(3, '0')}`,
      serviceName: row.name || row.serviceName || '-',
      category: row.category || '-',
      unit: row.unit || '-',
      defaultRate: Number(row.salePrice || row.defaultRate || 0),
      gstRate: Number(row.taxPercent || row.gstRate || 0),
      status: row.status || 'active'
    }));
  }

  private categoryValue(row: any): string {
    const modeMap: Record<string, string> = { air_cargo: 'air-freight', sea_freight: 'sea-freight', customs_cha: 'cha', road_transport: 'transportation', warehouse: 'warehouse', documentation: 'documentation', insurance: 'insurance', handling: 'handling' };
    return modeMap[row.serviceMode] || this.categories.find((option) => option.label === row.category || option.value === row.category)?.value || 'other';
  }

  private unitValue(value: string): string {
    if (value === 'piece') return 'package';
    return this.units.find((option) => option.value === value)?.value || value || '';
  }

  private categoryLabel(value: string): string { return this.categories.find((option) => option.value === value)?.label || value || 'General'; }
  private mapUnit(value: string): string { return value === 'package' ? 'piece' : value || 'service'; }
  private mapServiceMode(value: string): string {
    const map: Record<string, string> = { 'air-freight': 'air_cargo', 'sea-freight': 'sea_freight', cha: 'customs_cha', transportation: 'road_transport', warehouse: 'warehouse', documentation: 'documentation', insurance: 'insurance', handling: 'handling' };
    return map[value] || 'not_applicable';
  }


  private formFromRecord(row: any) {
    const tax = String(row.taxPercent ?? row.gstRate ?? '');
    const knownTax = this.gstRates.some((option) => option.value === tax);
    return {
      serviceCode: row.itemCode || row.serviceCode || '',
      serviceName: row.name || row.serviceName || '',
      category: this.categoryValue(row),
      categoryOther: row.categoryOther || '',
      description: row.description || '',
      sacHsnCode: row.hsnSacCode || row.sacHsnCode || '',
      unit: this.unitValue(row.unit),
      unitOther: row.unitOther || '',
      defaultRate: Number(row.salePrice || row.defaultRate || 0),
      minimumCharge: Number(row.costPrice || row.minimumCharge || 0),
      gstRate: knownTax ? tax : 'other',
      gstRateOther: knownTax ? '' : tax,
      applicableForAir: row.serviceMode === 'air_cargo' || !row.serviceMode,
      applicableForSea: row.serviceMode === 'sea_freight',
      applicableForRoad: row.serviceMode === 'road_transport',
      status: row.status || 'active',
      statusOther: row.statusOther || '',
      remarks: row.remarks || ''
    };
  }
  private emptyForm() {
    return { serviceCode: '', serviceName: '', category: '', categoryOther: '', description: '', sacHsnCode: '', unit: '', unitOther: '', defaultRate: 0, minimumCharge: 0, gstRate: '18', gstRateOther: '', applicableForAir: true, applicableForSea: false, applicableForRoad: false, status: 'active', statusOther: '', remarks: '' };
  }
}





