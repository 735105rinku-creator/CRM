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
}

interface WarehouseListResponse {
  data?: WarehouseRecord[];
}

interface WarehouseItemRecord {
  _id?: string;
  warehouseId?: string;
  productName?: string;
  sku?: string;
  unit?: string;
  availableQuantity?: number;
}

interface WarehouseItemListResponse {
  data?: WarehouseItemRecord[];
}

interface DamageRecord {
  _id?: string;
  warehouseId?: string;
  itemId?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  damageReason?: string;
  damageDate?: string;
  remarks?: string;
  status?: string;
  reviewedAt?: string;
  approvedAt?: string;
  removedAt?: string;
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

interface DamagePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface DamageListResponse {
  data?: DamageRecord[];
  pagination?: DamagePagination;
}

const STATUSES = [
  'reported',
  'under_review',
  'approved',
  'removed'
];

@Component({
  selector: 'app-warehouse-damaged-goods',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './damaged-goods.component.html',
  styleUrl:
    './damaged-goods.component.scss'
})
export class WarehouseDamagedGoodsComponent
  implements OnInit {

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly statuses = STATUSES;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isActing = signal(false);

  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');
  protected readonly actionError = signal('');

  protected readonly records =
    signal<DamageRecord[]>([]);

  protected readonly pagination =
    signal<DamagePagination | null>(null);

  protected readonly selected =
    signal<DamageRecord | null>(null);

  protected readonly warehouses =
    signal<WarehouseRecord[]>([]);

  protected readonly items =
    signal<WarehouseItemRecord[]>([]);

  protected readonly mode =
    signal<'list' | 'create' | 'view'>('list');

  protected readonly listSearch = signal('');
  protected readonly listStatus = signal('');
  protected readonly listWarehouseId = signal('');
  protected readonly listFromDate = signal('');
  protected readonly listToDate = signal('');

  protected readonly form =
    this.fb.nonNullable.group({
      warehouseId: ['', [
        Validators.required
      ]],
      itemId: ['', [
        Validators.required
      ]],
      quantity: [0, [
        Validators.required,
        Validators.min(1)
      ]],
      damageReason: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(500)
      ]],
      damageDate: [''],
      remarks: ['']
    });

  protected readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Report Damaged Goods';
      case 'view':
        return 'Damage Report Details';
      default:
        return 'Damaged Goods';
    }
  });

  protected readonly pageDescription = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Record damaged goods and move them out of available stock.';
      case 'view':
        return 'Review the damage report and progress it through its lifecycle.';
      default:
        return 'Track damaged goods from report to removal.';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url =
      this.route.snapshot.routeConfig?.path || '';

    this.loadWarehouses();

    if (id) {
      this.mode.set('view');
      this.loadDamage(id);
      return;
    }

    if (url.endsWith('/new')) {
      this.mode.set('create');
      this.resetCreateForm();
      return;
    }

    this.mode.set('list');
    this.loadDamageList();
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

  protected loadItemsForWarehouse(
    warehouseId: string
  ): void {
    if (!warehouseId) {
      this.items.set([]);
      return;
    }

    this.api
      .get<WarehouseItemListResponse>(
        '/warehouse/items',
        {
          page: 1,
          limit: 100,
          warehouseId,
          sortBy: 'productName',
          sortOrder: 'asc'
        }
      )
      .subscribe({
        next: (response) => {
          this.items.set(
            Array.isArray(response?.data)
              ? response.data
              : []
          );
        },
        error: () => {
          this.items.set([]);
        }
      });
  }

  protected onWarehouseChange(): void {
    const warehouseId =
      this.form.controls.warehouseId.value;

    this.form.patchValue({
      itemId: ''
    });

    this.loadItemsForWarehouse(
      String(warehouseId || '')
    );
  }

  protected selectedItem():
    WarehouseItemRecord | null {
    const id = this.form.controls.itemId.value;

    if (!id) {
      return null;
    }

    return (
      this.items().find((i) => i._id === id) ||
      null
    );
  }

  protected loadDamageList(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.api
      .get<DamageListResponse>(
        '/warehouse/damages',
        {
          page,
          limit: 20,
          search: this.listSearch(),
          status: this.listStatus(),
          warehouseId: this.listWarehouseId(),
          fromDate: this.listFromDate(),
          toDate: this.listToDate(),
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
            'Unable to load damage records.'
          );
        }
      });
  }

  protected loadDamage(id: string): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.saveSuccess.set('');
    this.actionError.set('');

    this.api
      .get<DamageRecord>(
        `/warehouse/damages/${id}`
      )
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || null);

          if (record) {
            this.form.patchValue({
              warehouseId: record.warehouseId || '',
              itemId: record.itemId || '',
              quantity: Number(record.quantity || 0),
              damageReason: record.damageReason || '',
              damageDate: record.damageDate || '',
              remarks: record.remarks || ''
            });

            if (record.warehouseId) {
              this.loadItemsForWarehouse(
                record.warehouseId
              );
            }
          }
        },
        error: (error: any) => {
          this.selected.set(null);
          this.loadError.set(
            error?.error?.message ||
            'Unable to load damage record.'
          );
        }
      });
  }

  protected reloadCurrent(): void {
    const current = this.selected();

    if (this.mode() === 'view') {
      if (current?._id) {
        this.loadDamage(String(current._id));
      }
      return;
    }

    if (this.mode() === 'list') {
      this.loadDamageList(
        this.pagination()?.page || 1
      );
    }
  }

  protected applyFilters(): void {
    this.loadDamageList(1);
  }

  protected resetFilters(): void {
    this.listSearch.set('');
    this.listStatus.set('');
    this.listWarehouseId.set('');
    this.listFromDate.set('');
    this.listToDate.set('');
    this.loadDamageList(1);
  }

  protected openCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/damaged-goods/new'
    );
  }

  protected openView(record: DamageRecord): void {
    if (!record?._id) {
      return;
    }

    void this.router.navigateByUrl(
      `/warehouse/damaged-goods/${record._id}`
    );
  }

  protected cancelCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/damaged-goods'
    );
  }

  protected submitCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const item = this.selectedItem();

    if (
      item &&
      Number(value.quantity || 0) >
        Number(item.availableQuantity || 0)
    ) {
      this.saveError.set(
        'Quantity exceeds available stock in warehouse.'
      );
      return;
    }

    const payload = {
      warehouseId: value.warehouseId,
      itemId: value.itemId,
      quantity: value.quantity,
      damageReason: value.damageReason,
      damageDate: value.damageDate || null,
      remarks: value.remarks
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .post<DamageRecord>(
        '/warehouse/damages',
        payload
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.saveSuccess.set(
            'Damage report created successfully.'
          );

          if (record?._id) {
            void this.router.navigateByUrl(
              `/warehouse/damaged-goods/${record._id}`
            );
            return;
          }

          void this.router.navigateByUrl(
            '/warehouse/damaged-goods'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to create damage report.'
          );
        }
      });
  }

  protected markUnderReview(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (
      !window.confirm(
        'Move this damage report to Under Review?'
      )
    ) {
      return;
    }

    this.runAction(
      `/warehouse/damages/${current._id}/review`,
      'Damage report marked under review.'
    );
  }

  protected approve(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (
      !window.confirm(
        'Approve this damage report?'
      )
    ) {
      return;
    }

    this.runAction(
      `/warehouse/damages/${current._id}/approve`,
      'Damage report approved.'
    );
  }

  protected markRemoved(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const message =
      `Remove ${current.quantity} ` +
      `${current.unit || 'unit'} of ` +
      `${current.productName || ''} from damaged stock? ` +
      `This writes the goods off permanently.`;

    if (!window.confirm(message)) {
      return;
    }

    this.runAction(
      `/warehouse/damages/${current._id}/remove`,
      'Damage record marked removed from stock.'
    );
  }

  protected deleteDamage(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const message =
      `Delete this damage report? ` +
      `${current.quantity} ` +
      `${current.unit || 'unit'} of ` +
      `${current.productName || ''} will be returned ` +
      `to available stock.`;

    if (!window.confirm(message)) {
      return;
    }

    this.isActing.set(true);
    this.actionError.set('');

    this.api
      .delete<unknown>(
        `/warehouse/damages/${current._id}`
      )
      .pipe(
        finalize(() => this.isActing.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            '/warehouse/damaged-goods'
          );
        },
        error: (error: any) => {
          this.actionError.set(
            error?.error?.message ||
            'Unable to delete damage report.'
          );
        }
      });
  }

  private runAction(
    endpoint: string,
    successMessage: string
  ): void {
    this.isActing.set(true);
    this.actionError.set('');
    this.saveSuccess.set('');

    this.api
      .post<DamageRecord>(endpoint, {})
      .pipe(
        finalize(() => this.isActing.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || null);
          this.saveSuccess.set(successMessage);
        },
        error: (error: any) => {
          this.actionError.set(
            error?.error?.message ||
            'Unable to perform the action.'
          );
        }
      });
  }

  protected resetCreateForm(): void {
    this.form.reset({
      warehouseId: '',
      itemId: '',
      quantity: 0,
      damageReason: '',
      damageDate: '',
      remarks: ''
    });

    this.items.set([]);
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

  protected statusLabel(value?: string): string {
    switch (value) {
      case 'reported':
        return 'Reported';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'removed':
        return 'Removed from Stock';
      default:
        return String(value || '')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  protected badgeClass(value?: string): string {
    switch (value) {
      case 'reported':
        return 'reported';
      case 'under_review':
        return 'under-review';
      case 'approved':
        return 'approved';
      case 'removed':
        return 'removed';
      default:
        return 'reported';
    }
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