import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface WarehouseRecord {
  _id?: string;

  code?: string;
  name?: string;
  type?: string;
  typeOther?: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  contactPerson?: string;
  phone?: string;
  email?: string;

  capacity?: number;
  capacityUnit?: string;
  capacityUnitOther?: string;

  status?: string;
  remarks?: string;

  createdAt?: string;
  updatedAt?: string;

  createdBy?: {
    name?: string;
    displayName?: string;
    email?: string;
  } | null;

  createdByEmployeeId?: {
    employeeCode?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    designation?: string;
  } | null;
}

interface WarehousePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface WarehouseListResponse {
  data?: WarehouseRecord[];
  pagination?: WarehousePagination;
}

interface WarehouseSummary {
  total?: number;
  active?: number;
  inactive?: number;
  maintenance?: number;
  totalCapacity?: number;
}

const WAREHOUSE_TYPES = [
  'owned',
  'leased',
  'third_party',
  'bonded',
  'cold_storage',
  'other'
];

const WAREHOUSE_STATUSES = [
  'active',
  'inactive',
  'maintenance'
];

const CAPACITY_UNITS = [
  'sq_ft',
  'sq_m',
  'mt',
  'ton',
  'pallet',
  'unit',
  'other'
];

@Component({
  selector: 'app-warehouse-master',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './warehouse-master.component.html',
  styleUrl:
    './warehouse-master.component.scss'
})
export class WarehouseMasterComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly warehouseTypes = WAREHOUSE_TYPES;
  protected readonly warehouseStatuses = WAREHOUSE_STATUSES;
  protected readonly capacityUnits = CAPACITY_UNITS;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');

  protected readonly records =
    signal<WarehouseRecord[]>([]);

  protected readonly pagination =
    signal<WarehousePagination | null>(null);

  protected readonly summary =
    signal<WarehouseSummary>({});

  protected readonly selected =
    signal<WarehouseRecord | null>(null);

  protected readonly mode =
    signal<'list' | 'create' | 'view' | 'edit'>('list');

  protected readonly listSearch = signal('');
  protected readonly listStatus = signal('');
  protected readonly listType = signal('');

  protected readonly form =
    this.fb.nonNullable.group({
      code: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(30)
      ]],
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200)
      ]],
      type: ['owned', [
        Validators.required
      ]],
      typeOther: [''],
      addressLine1: [''],
      addressLine2: [''],
      city: [''],
      state: [''],
      country: ['India'],
      pincode: [''],
      contactPerson: [''],
      phone: [''],
      email: ['', [
        Validators.email
      ]],
      capacity: [0, [
        Validators.min(0)
      ]],
      capacityUnit: ['unit', [
        Validators.required
      ]],
      capacityUnitOther: [''],
      status: ['active', [
        Validators.required
      ]],
      remarks: ['']
    });

  protected readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Add Warehouse';
      case 'view':
        return 'Warehouse Details';
      case 'edit':
        return 'Edit Warehouse';
      default:
        return 'Warehouse Master';
    }
  });

  protected readonly pageDescription = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Create a new warehouse record.';
      case 'view':
        return 'View warehouse details and capacity.';
      case 'edit':
        return 'Update warehouse details.';
      default:
        return 'Manage warehouses for this company.';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.route.snapshot.routeConfig?.path || '';

    if (id) {
      this.mode.set('view');
      this.loadWarehouse(id);
      return;
    }

    if (url.endsWith('/new')) {
      this.mode.set('create');
      this.form.reset({
        code: '',
        name: '',
        type: 'owned',
        typeOther: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        contactPerson: '',
        phone: '',
        email: '',
        capacity: 0,
        capacityUnit: 'unit',
        capacityUnitOther: '',
        status: 'active',
        remarks: ''
      });
      return;
    }

    this.mode.set('list');
    this.loadWarehouses();
    this.loadSummary();
  }

  protected loadWarehouses(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.api
      .get<WarehouseListResponse>(
        '/warehouse/warehouses',
        {
          page,
          limit: 20,
          search: this.listSearch(),
          status: this.listStatus(),
          type: this.listType(),
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      )
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.records.set(
            Array.isArray(response?.data)
              ? response.data
              : []
          );

          this.pagination.set(
            response?.pagination || null
          );
        },
        error: (error: any) => {
          this.records.set([]);
          this.pagination.set(null);
          this.loadError.set(
            error?.error?.message ||
            'Unable to load warehouses.'
          );
        }
      });
  }

  protected loadSummary(): void {
    this.api
      .get<WarehouseSummary>(
        '/warehouse/summary'
      )
      .subscribe({
        next: (response) => {
          this.summary.set(response || {});
        },
        error: () => {
          this.summary.set({});
        }
      });
  }

  protected loadWarehouse(id: string): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .get<WarehouseRecord>(
        `/warehouse/warehouses/${id}`
      )
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || null);

          if (record) {
            this.form.patchValue({
              code: record.code || '',
              name: record.name || '',
              type: record.type || 'owned',
              typeOther: record.typeOther || '',
              addressLine1: record.addressLine1 || '',
              addressLine2: record.addressLine2 || '',
              city: record.city || '',
              state: record.state || '',
              country: record.country || 'India',
              pincode: record.pincode || '',
              contactPerson: record.contactPerson || '',
              phone: record.phone || '',
              email: record.email || '',
              capacity: Number(record.capacity || 0),
              capacityUnit: record.capacityUnit || 'unit',
              capacityUnitOther: record.capacityUnitOther || '',
              status: record.status || 'active',
              remarks: record.remarks || ''
            });
          }
        },
        error: (error: any) => {
          this.selected.set(null);
          this.loadError.set(
            error?.error?.message ||
            'Unable to load warehouse.'
          );
        }
      });
  }

  protected reloadCurrent(): void {
    const current = this.selected();

    if (this.mode() === 'view' || this.mode() === 'edit') {
      if (current?._id) {
        this.loadWarehouse(String(current._id));
      }
      return;
    }

    if (this.mode() === 'list') {
      this.loadWarehouses();
      this.loadSummary();
    }
  }

  protected applyFilters(): void {
    this.loadWarehouses(1);
  }

  protected resetFilters(): void {
    this.listSearch.set('');
    this.listStatus.set('');
    this.listType.set('');
    this.loadWarehouses(1);
  }

  protected openCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/warehouse-master/new'
    );
  }

    protected cancelCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/warehouse-master'
    );
  }

  protected goToList(): void {
    void this.router.navigateByUrl(
      '/warehouse/warehouse-master'
    );
  }

  protected openView(record: WarehouseRecord): void {
    if (!record?._id) {
      return;
    }

    void this.router.navigateByUrl(
      `/warehouse/warehouse-master/${record._id}`
    );
  }

  protected switchToEdit(): void {
    this.mode.set('edit');
    this.saveError.set('');
    this.saveSuccess.set('');
  }

  protected cancelEdit(): void {
    const current = this.selected();

    if (current) {
      this.form.patchValue({
        code: current.code || '',
        name: current.name || '',
        type: current.type || 'owned',
        typeOther: current.typeOther || '',
        addressLine1: current.addressLine1 || '',
        addressLine2: current.addressLine2 || '',
        city: current.city || '',
        state: current.state || '',
        country: current.country || 'India',
        pincode: current.pincode || '',
        contactPerson: current.contactPerson || '',
        phone: current.phone || '',
        email: current.email || '',
        capacity: Number(current.capacity || 0),
        capacityUnit: current.capacityUnit || 'unit',
        capacityUnitOther: current.capacityUnitOther || '',
        status: current.status || 'active',
        remarks: current.remarks || ''
      });
    }

    this.mode.set('view');
    this.saveError.set('');
    this.saveSuccess.set('');
  }

  protected submitCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .post<WarehouseRecord>(
        '/warehouse/warehouses',
        value
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.saveSuccess.set(
            'Warehouse created successfully.'
          );

          if (record?._id) {
            void this.router.navigateByUrl(
              `/warehouse/warehouse-master/${record._id}`
            );
            return;
          }

          void this.router.navigateByUrl(
            '/warehouse/warehouse-master'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to create warehouse.'
          );
        }
      });
  }

  protected submitUpdate(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .patch<WarehouseRecord>(
        `/warehouse/warehouses/${current._id}`,
        value
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || current);
          this.mode.set('view');
          this.saveSuccess.set(
            'Warehouse updated successfully.'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to update warehouse.'
          );
        }
      });
  }

  protected toggleStatus(record: WarehouseRecord): void {
    if (!record?._id) {
      return;
    }

    const nextStatus =
      record.status === 'active'
        ? 'inactive'
        : 'active';

    const confirmed = window.confirm(
      nextStatus === 'inactive'
        ? `Deactivate warehouse ${record.name || record.code}?`
        : `Activate warehouse ${record.name || record.code}?`
    );

    if (!confirmed) {
      return;
    }

    this.api
      .patch<WarehouseRecord>(
        `/warehouse/warehouses/${record._id}`,
        { status: nextStatus }
      )
      .subscribe({
        next: () => {
          this.loadWarehouses(
            this.pagination()?.page || 1
          );
          this.loadSummary();
        },
        error: (error: any) => {
          this.loadError.set(
            error?.error?.message ||
            'Unable to change warehouse status.'
          );
        }
      });
  }

  protected statusLabel(value?: string): string {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  protected typeLabel(value?: string): string {
    if (value === 'third_party') {
      return 'Third Party';
    }

    if (value === 'cold_storage') {
      return 'Cold Storage';
    }

    return this.statusLabel(value);
  }

  protected capacityUnitLabel(value?: string): string {
    if (value === 'sq_ft') {
      return 'sq ft';
    }

    if (value === 'sq_m') {
      return 'sq m';
    }

    if (value === 'mt') {
      return 'MT';
    }

    if (value === 'ton') {
      return 'Ton';
    }

    if (value === 'pallet') {
      return 'Pallet';
    }

    if (value === 'unit') {
      return 'Unit';
    }

    return 'Other';
  }

  protected locationLabel(record: WarehouseRecord): string {
    return (
      [
        record.city,
        record.state,
        record.country
      ]
        .filter(Boolean)
        .join(', ') || '-'
    );
  }

  protected formatDate(value?: string): string {
    return value
      ? new Intl.DateTimeFormat('en-IN').format(
          new Date(value)
        )
      : '-';
  }

  protected formatNumber(value?: number): string {
    return new Intl.NumberFormat('en-IN').format(
      Number(value || 0)
    );
  }
}