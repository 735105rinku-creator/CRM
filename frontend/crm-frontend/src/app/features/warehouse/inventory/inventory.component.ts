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
  status?: string;
}

interface WarehouseListResponse {
  data?: WarehouseRecord[];
}

interface WarehouseItem {
  _id?: string;
  warehouseId?: string;
  productName?: string;
  sku?: string;
  unit?: string;
  availableQuantity?: number;
  reservedQuantity?: number;
  damagedQuantity?: number;
  reorderLevel?: number;
  status?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    name?: string;
    displayName?: string;
  } | null;
  createdByEmployeeId?: {
    employeeCode?: string;
  } | null;
}

interface ItemPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ItemListResponse {
  data?: WarehouseItem[];
  pagination?: ItemPagination;
}

const ITEM_UNITS = [
  'unit',
  'kg',
  'g',
  'mt',
  'ton',
  'lb',
  'ltr',
  'ml',
  'box',
  'carton',
  'pallet',
  'bag',
  'roll',
  'other'
];

const ITEM_STATUSES = [
  'in_stock',
  'low_stock',
  'out_of_stock',
  'reserved',
  'damaged'
];

@Component({
  selector: 'app-warehouse-inventory',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './inventory.component.html',
  styleUrl:
    './inventory.component.scss'
})
export class WarehouseInventoryComponent
  implements OnInit {

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly itemUnits = ITEM_UNITS;
  protected readonly itemStatuses = ITEM_STATUSES;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isAdjusting = signal(false);

  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');
  protected readonly adjustError = signal('');

  protected readonly records =
    signal<WarehouseItem[]>([]);

  protected readonly pagination =
    signal<ItemPagination | null>(null);

  protected readonly selected =
    signal<WarehouseItem | null>(null);

  protected readonly warehouses =
    signal<WarehouseRecord[]>([]);

  protected readonly mode =
    signal<'list' | 'create' | 'view' | 'edit'>('list');

  protected readonly listSearch = signal('');
  protected readonly listStatus = signal('');
  protected readonly listWarehouseId = signal('');

  protected readonly adjustOperation =
    signal<'add' | 'remove' | 'adjust' | 'damage'>('add');

  protected readonly showAdjust =
    signal(false);

  protected readonly form =
    this.fb.nonNullable.group({
      warehouseId: ['', [
        Validators.required
      ]],
      productName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200)
      ]],
      sku: ['', [
        Validators.required,
        Validators.maxLength(60)
      ]],
      unit: ['unit', [
        Validators.required
      ]],
      availableQuantity: [0, [
        Validators.min(0)
      ]],
      reservedQuantity: [0, [
        Validators.min(0)
      ]],
      damagedQuantity: [0, [
        Validators.min(0)
      ]],
      reorderLevel: [0, [
        Validators.min(0)
      ]],
      remarks: ['']
    });

  protected readonly adjustForm =
    this.fb.nonNullable.group({
      quantity: [0, [
        Validators.required,
        Validators.min(0)
      ]],
      reason: ['']
    });

  protected readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Add Item';
      case 'view':
        return 'Item Details';
      case 'edit':
        return 'Edit Item';
      default:
        return 'Inventory';
    }
  });

  protected readonly pageDescription =
    computed(() => {
      switch (this.mode()) {
        case 'create':
          return 'Add a new item to a warehouse.';
        case 'view':
          return 'View item stock and adjust quantities.';
        case 'edit':
          return 'Update item details.';
        default:
          return 'Stock across all warehouses.';
      }
    });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url =
      this.route.snapshot.routeConfig?.path || '';

    this.loadWarehouses();

    if (id) {
      this.mode.set('view');
      this.loadItem(id);
      return;
    }

    if (url.endsWith('/new')) {
      this.mode.set('create');
      this.resetCreateForm();
      return;
    }

    this.mode.set('list');
    this.loadItems();
  }

  protected loadWarehouses(): void {
    this.api
      .get<WarehouseListResponse>(
        '/warehouse/warehouses',
        {
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc'
        }
      )
      .subscribe({
        next: (response) => {
          this.warehouses.set(
            Array.isArray(response?.data)
              ? response.data
              : []
          );
        },
        error: () => {
          this.warehouses.set([]);
        }
      });
  }

  protected loadItems(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.api
      .get<ItemListResponse>(
        '/warehouse/items',
        {
          page,
          limit: 20,
          search: this.listSearch(),
          status: this.listStatus(),
          warehouseId: this.listWarehouseId(),
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
            'Unable to load items.'
          );
        }
      });
  }

  protected loadItem(id: string): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.saveSuccess.set('');
    this.adjustError.set('');

    this.api
      .get<WarehouseItem>(
        `/warehouse/items/${id}`
      )
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || null);
          this.showAdjust.set(false);

          if (record) {
            this.form.patchValue({
              warehouseId: record.warehouseId || '',
              productName: record.productName || '',
              sku: record.sku || '',
              unit: record.unit || 'unit',
              availableQuantity: Number(record.availableQuantity || 0),
              reservedQuantity: Number(record.reservedQuantity || 0),
              damagedQuantity: Number(record.damagedQuantity || 0),
              reorderLevel: Number(record.reorderLevel || 0),
              remarks: record.remarks || ''
            });
          }
        },
        error: (error: any) => {
          this.selected.set(null);
          this.loadError.set(
            error?.error?.message ||
            'Unable to load item.'
          );
        }
      });
  }

  protected reloadCurrent(): void {
    const current = this.selected();

    if (
      this.mode() === 'view' ||
      this.mode() === 'edit'
    ) {
      if (current?._id) {
        this.loadItem(String(current._id));
      }
      return;
    }

    if (this.mode() === 'list') {
      this.loadItems(
        this.pagination()?.page || 1
      );
    }
  }

  protected applyFilters(): void {
    this.loadItems(1);
  }

  protected resetFilters(): void {
    this.listSearch.set('');
    this.listStatus.set('');
    this.listWarehouseId.set('');
    this.loadItems(1);
  }

  protected openCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/inventory/new'
    );
  }

  protected openView(record: WarehouseItem): void {
    if (!record?._id) {
      return;
    }

    void this.router.navigateByUrl(
      `/warehouse/inventory/${record._id}`
    );
  }

  protected cancelCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/inventory'
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
        warehouseId: current.warehouseId || '',
        productName: current.productName || '',
        sku: current.sku || '',
        unit: current.unit || 'unit',
        availableQuantity: Number(current.availableQuantity || 0),
        reservedQuantity: Number(current.reservedQuantity || 0),
        damagedQuantity: Number(current.damagedQuantity || 0),
        reorderLevel: Number(current.reorderLevel || 0),
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
      .post<WarehouseItem>(
        '/warehouse/items',
        value
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.saveSuccess.set(
            'Item created successfully.'
          );

          if (record?._id) {
            void this.router.navigateByUrl(
              `/warehouse/inventory/${record._id}`
            );
            return;
          }

          void this.router.navigateByUrl(
            '/warehouse/inventory'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to create item.'
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

    const payload = {
      productName: value.productName,
      sku: value.sku,
      unit: value.unit,
      reorderLevel: value.reorderLevel,
      remarks: value.remarks
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .patch<WarehouseItem>(
        `/warehouse/items/${current._id}`,
        payload
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || current);
          this.mode.set('view');
          this.saveSuccess.set(
            'Item updated successfully.'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to update item.'
          );
        }
      });
  }

  protected openAdjust(
    operation: 'add' | 'remove' | 'adjust' | 'damage'
  ): void {
    this.adjustOperation.set(operation);
    this.adjustForm.reset({
      quantity: 0,
      reason: ''
    });
    this.adjustError.set('');
    this.showAdjust.set(true);
  }

  protected cancelAdjust(): void {
    this.showAdjust.set(false);
    this.adjustForm.reset({
      quantity: 0,
      reason: ''
    });
    this.adjustError.set('');
  }

  protected submitAdjust(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (this.adjustForm.invalid) {
      this.adjustForm.markAllAsTouched();
      return;
    }

    const value = this.adjustForm.getRawValue();

    this.isAdjusting.set(true);
    this.adjustError.set('');

    this.api
      .patch<WarehouseItem>(
        `/warehouse/items/${current._id}/quantity`,
        {
          operation: this.adjustOperation(),
          quantity: Number(value.quantity || 0),
          reason: value.reason || ''
        }
      )
      .pipe(
        finalize(() => this.isAdjusting.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || current);
          this.showAdjust.set(false);
          this.adjustForm.reset({
            quantity: 0,
            reason: ''
          });
          this.saveSuccess.set(
            'Quantity updated successfully.'
          );
        },
        error: (error: any) => {
          this.adjustError.set(
            error?.error?.message ||
            'Unable to update quantity.'
          );
        }
      });
  }

  protected deleteItem(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete item ${current.productName || current.sku}?`
    );

    if (!confirmed) {
      return;
    }

    this.api
      .delete<unknown>(
        `/warehouse/items/${current._id}`
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            '/warehouse/inventory'
          );
        },
        error: (error: any) => {
          this.loadError.set(
            error?.error?.message ||
            'Unable to delete item.'
          );
        }
      });
  }

  protected resetCreateForm(): void {
    this.form.reset({
      warehouseId: '',
      productName: '',
      sku: '',
      unit: 'unit',
      availableQuantity: 0,
      reservedQuantity: 0,
      damagedQuantity: 0,
      reorderLevel: 0,
      remarks: ''
    });
  }

  protected statusLabel(value?: string): string {
    if (value === 'in_stock') {
      return 'In Stock';
    }
    if (value === 'low_stock') {
      return 'Low Stock';
    }
    if (value === 'out_of_stock') {
      return 'Out of Stock';
    }
    if (value === 'reserved') {
      return 'Reserved';
    }
    if (value === 'damaged') {
      return 'Damaged';
    }
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  protected unitLabel(value?: string): string {
    if (value === 'mt') {
      return 'MT';
    }
    if (value === 'ltr') {
      return 'Ltr';
    }
    if (value === 'ml') {
      return 'ml';
    }
    return String(value || 'unit');
  }

  protected warehouseLabel(
    warehouseId?: string
  ): string {
    const match = this.warehouses().find(
      (item) => item._id === warehouseId
    );

    if (!match) {
      return '-';
    }

    return `${match.name || '-'} (${match.code || '-'})`;
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

  protected badgeClass(value?: string): string {
    switch (value) {
      case 'in_stock':
        return 'in-stock';
      case 'low_stock':
        return 'low-stock';
      case 'out_of_stock':
        return 'out-of-stock';
      case 'reserved':
        return 'reserved';
      case 'damaged':
        return 'damaged';
      default:
        return 'in-stock';
    }
  }
}