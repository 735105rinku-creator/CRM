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

interface TransferRecord {
  _id?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  productName?: string;
  sku?: string;
  fromItemId?: string;
  toItemId?: string | null;
  quantity?: number;
  unit?: string;
  transferDate?: string;
  remarks?: string;
  status?: string;
  completedAt?: string;
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

interface TransferPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface TransferListResponse {
  data?: TransferRecord[];
  pagination?: TransferPagination;
}

const STATUSES = [
  'pending',
  'completed',
  'cancelled'
];

@Component({
  selector: 'app-warehouse-stock-transfer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './stock-transfer.component.html',
  styleUrl:
    './stock-transfer.component.scss'
})
export class WarehouseStockTransferComponent
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
    signal<TransferRecord[]>([]);

  protected readonly pagination =
    signal<TransferPagination | null>(null);

  protected readonly selected =
    signal<TransferRecord | null>(null);

  protected readonly warehouses =
    signal<WarehouseRecord[]>([]);

  protected readonly fromItems =
    signal<WarehouseItemRecord[]>([]);

  protected readonly toItems =
    signal<WarehouseItemRecord[]>([]);

  protected readonly mode =
    signal<'list' | 'create' | 'view'>('list');

  protected readonly listSearch = signal('');
  protected readonly listStatus = signal('');
  protected readonly listFromWarehouseId = signal('');
  protected readonly listToWarehouseId = signal('');
  protected readonly listFromDate = signal('');
  protected readonly listToDate = signal('');

  protected readonly form =
    this.fb.nonNullable.group({
      fromWarehouseId: ['', [
        Validators.required
      ]],
      toWarehouseId: ['', [
        Validators.required
      ]],
      fromItemId: ['', [
        Validators.required
      ]],
      toItemId: [''],
      quantity: [0, [
        Validators.required,
        Validators.min(1)
      ]],
      transferDate: [''],
      remarks: ['']
    });

  protected readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'New Stock Transfer';
      case 'view':
        return 'Transfer Details';
      default:
        return 'Stock Transfer';
    }
  });

  protected readonly pageDescription = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Move stock between warehouses. Stock moves when the transfer is completed.';
      case 'view':
        return 'Review the transfer and complete or cancel it.';
      default:
        return 'Move stock between warehouses.';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url =
      this.route.snapshot.routeConfig?.path || '';

    this.loadWarehouses();

    if (id) {
      this.mode.set('view');
      this.loadTransfer(id);
      return;
    }

    if (url.endsWith('/new')) {
      this.mode.set('create');
      this.resetCreateForm();
      return;
    }

    this.mode.set('list');
    this.loadTransferList();
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

  protected loadFromItems(
    warehouseId: string
  ): void {
    if (!warehouseId) {
      this.fromItems.set([]);
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
          this.fromItems.set(
            Array.isArray(response?.data)
              ? response.data
              : []
          );
        },
        error: () => {
          this.fromItems.set([]);
        }
      });
  }

  protected loadToItems(
    warehouseId: string
  ): void {
    if (!warehouseId) {
      this.toItems.set([]);
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
          this.toItems.set(
            Array.isArray(response?.data)
              ? response.data
              : []
          );
        },
        error: () => {
          this.toItems.set([]);
        }
      });
  }

  protected onFromWarehouseChange(): void {
    const fromId =
      this.form.controls.fromWarehouseId.value;

    this.fromItems.set([]);
    this.form.patchValue({
      fromItemId: ''
    });

    if (fromId) {
      this.loadFromItems(String(fromId));
    }

    const toId =
      this.form.controls.toWarehouseId.value;

    if (toId === fromId) {
      this.form.patchValue({
        toWarehouseId: ''
      });
      this.toItems.set([]);
      this.form.patchValue({
        toItemId: ''
      });
    }
  }

  protected onToWarehouseChange(): void {
    const toId =
      this.form.controls.toWarehouseId.value;

    this.toItems.set([]);
    this.form.patchValue({
      toItemId: ''
    });

    if (toId) {
      this.loadToItems(String(toId));
    }
  }

  protected destinationWarehouseOptions():
    WarehouseRecord[] {
    const fromId =
      this.form.controls.fromWarehouseId.value;

    return this.warehouses().filter(
      (w) => w._id && w._id !== fromId
    );
  }

  protected selectedFromItem():
    WarehouseItemRecord | null {
    const id = this.form.controls.fromItemId.value;

    if (!id) {
      return null;
    }

    return (
      this.fromItems().find((i) => i._id === id) ||
      null
    );
  }

  protected loadTransferList(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.api
      .get<TransferListResponse>(
        '/warehouse/transfers',
        {
          page,
          limit: 20,
          search: this.listSearch(),
          status: this.listStatus(),
          fromWarehouseId: this.listFromWarehouseId(),
          toWarehouseId: this.listToWarehouseId(),
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
            'Unable to load transfers.'
          );
        }
      });
  }

  protected loadTransfer(id: string): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.saveSuccess.set('');
    this.actionError.set('');

    this.api
      .get<TransferRecord>(
        `/warehouse/transfers/${id}`
      )
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || null);

          if (record) {
            this.form.patchValue({
              fromWarehouseId: record.fromWarehouseId || '',
              toWarehouseId: record.toWarehouseId || '',
              fromItemId: record.fromItemId || '',
              toItemId: record.toItemId || '',
              quantity: Number(record.quantity || 0),
              transferDate: record.transferDate || '',
              remarks: record.remarks || ''
            });

            if (record.fromWarehouseId) {
              this.loadFromItems(record.fromWarehouseId);
            }

            if (record.toWarehouseId) {
              this.loadToItems(record.toWarehouseId);
            }
          }
        },
        error: (error: any) => {
          this.selected.set(null);
          this.loadError.set(
            error?.error?.message ||
            'Unable to load transfer.'
          );
        }
      });
  }

  protected reloadCurrent(): void {
    const current = this.selected();

    if (this.mode() === 'view') {
      if (current?._id) {
        this.loadTransfer(String(current._id));
      }
      return;
    }

    if (this.mode() === 'list') {
      this.loadTransferList(
        this.pagination()?.page || 1
      );
    }
  }

  protected applyFilters(): void {
    this.loadTransferList(1);
  }

  protected resetFilters(): void {
    this.listSearch.set('');
    this.listStatus.set('');
    this.listFromWarehouseId.set('');
    this.listToWarehouseId.set('');
    this.listFromDate.set('');
    this.listToDate.set('');
    this.loadTransferList(1);
  }

  protected openCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/stock-transfer/new'
    );
  }

  protected openView(record: TransferRecord): void {
    if (!record?._id) {
      return;
    }

    void this.router.navigateByUrl(
      `/warehouse/stock-transfer/${record._id}`
    );
  }

  protected cancelCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/stock-transfer'
    );
  }

  protected submitCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const fromItem = this.selectedFromItem();

    if (
      fromItem &&
      Number(value.quantity || 0) >
        Number(fromItem.availableQuantity || 0)
    ) {
      this.saveError.set(
        'Quantity exceeds available stock in source warehouse.'
      );
      return;
    }

    const payload = {
      fromWarehouseId: value.fromWarehouseId,
      toWarehouseId: value.toWarehouseId,
      fromItemId: value.fromItemId,
      toItemId: value.toItemId || null,
      quantity: value.quantity,
      transferDate: value.transferDate || null,
      remarks: value.remarks
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .post<TransferRecord>(
        '/warehouse/transfers',
        payload
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.saveSuccess.set(
            'Transfer created successfully.'
          );

          if (record?._id) {
            void this.router.navigateByUrl(
              `/warehouse/stock-transfer/${record._id}`
            );
            return;
          }

          void this.router.navigateByUrl(
            '/warehouse/stock-transfer'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to create transfer.'
          );
        }
      });
  }

  protected completeTransfer(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const message =
      `Complete transfer of ${current.quantity} ` +
      `${current.unit || 'unit'} of ` +
      `${current.productName || ''} from ` +
      `${this.warehouseLabel(current.fromWarehouseId)} to ` +
      `${this.warehouseLabel(current.toWarehouseId)}? ` +
      `Stock will move now.`;

    if (!window.confirm(message)) {
      return;
    }

    this.runAction(
      `/warehouse/transfers/${current._id}/complete`,
      'Transfer completed.'
    );
  }

  protected cancelTransfer(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const message =
      `Cancel transfer of ${current.quantity} ` +
      `${current.unit || 'unit'} of ` +
      `${current.productName || ''}? ` +
      `No stock has moved yet.`;

    if (!window.confirm(message)) {
      return;
    }

    this.runAction(
      `/warehouse/transfers/${current._id}/cancel`,
      'Transfer cancelled.'
    );
  }

  protected deleteTransfer(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    if (
      !window.confirm(
        'Delete this transfer record?'
      )
    ) {
      return;
    }

    this.isActing.set(true);
    this.actionError.set('');

    this.api
      .delete<unknown>(
        `/warehouse/transfers/${current._id}`
      )
      .pipe(
        finalize(() => this.isActing.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            '/warehouse/stock-transfer'
          );
        },
        error: (error: any) => {
          this.actionError.set(
            error?.error?.message ||
            'Unable to delete transfer.'
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
      .post<TransferRecord>(endpoint, {})
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
      fromWarehouseId: '',
      toWarehouseId: '',
      fromItemId: '',
      toItemId: '',
      quantity: 0,
      transferDate: '',
      remarks: ''
    });

    this.fromItems.set([]);
    this.toItems.set([]);
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

  protected itemLabel(
    itemId?: string | null,
    source: 'from' | 'to' = 'from'
  ): string {
    const list = source === 'from'
      ? this.fromItems()
      : this.toItems();

    if (!itemId) {
      return 'Auto-resolve by SKU';
    }

    const match = list.find(
      (item) => item._id === itemId
    );

    if (!match) {
      return '-';
    }

    return `${match.productName || '-'} (${match.sku || '-'})`;
  }

  protected statusLabel(value?: string): string {
    switch (value) {
      case 'pending':
        return 'Pending';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return String(value || '')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  protected badgeClass(value?: string): string {
    switch (value) {
      case 'pending':
        return 'pending';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
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