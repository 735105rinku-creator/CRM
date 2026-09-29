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
  productName?: string;
  sku?: string;
  unit?: string;
  availableQuantity?: number;
}

interface WarehouseItemListResponse {
  data?: WarehouseItemRecord[];
}

interface OutgoingRecord {
  _id?: string;
  warehouseId?: string;
  shipmentNumber?: string;
  destinationType?: string;
  destinationTypeOther?: string;
  destinationWarehouseId?: string | null;
  customerName?: string;
  productName?: string;
  sku?: string;
  itemId?: string | null;
  quantity?: number;
  unit?: string;
  dispatchDate?: string;
  destination?: string;
  remarks?: string;
  status?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
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

interface OutgoingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface OutgoingListResponse {
  data?: OutgoingRecord[];
  pagination?: OutgoingPagination;
}

const DESTINATION_TYPES = [
  'customer',
  'export_shipment',
  'distributor',
  'other_warehouse',
  'other'
];

const STATUSES = [
  'preparing',
  'dispatched',
  'delivered',
  'cancelled'
];

const UNITS = [
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

@Component({
  selector: 'app-warehouse-outgoing-goods',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './outgoing-goods.component.html',
  styleUrl:
    './outgoing-goods.component.scss'
})
export class WarehouseOutgoingGoodsComponent
  implements OnInit {

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly destinationTypes = DESTINATION_TYPES;
  protected readonly statuses = STATUSES;
  protected readonly units = UNITS;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isActing = signal(false);

  protected readonly loadError = signal('');
  protected readonly saveError = signal('');
  protected readonly saveSuccess = signal('');
  protected readonly actionError = signal('');

  protected readonly records =
    signal<OutgoingRecord[]>([]);

  protected readonly pagination =
    signal<OutgoingPagination | null>(null);

  protected readonly selected =
    signal<OutgoingRecord | null>(null);

  protected readonly warehouses =
    signal<WarehouseRecord[]>([]);

  protected readonly items =
    signal<WarehouseItemRecord[]>([]);

  protected readonly mode =
    signal<'list' | 'create' | 'view' | 'edit'>('list');

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
      shipmentNumber: ['', [
        Validators.required,
        Validators.maxLength(60)
      ]],
      destinationType: ['customer', [
        Validators.required
      ]],
      destinationTypeOther: [''],
      destinationWarehouseId: [''],
      customerName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200)
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
      itemId: [''],
      quantity: [0, [
        Validators.required,
        Validators.min(0)
      ]],
      unit: ['unit', [
        Validators.required
      ]],
      dispatchDate: [''],
      destination: [''],
      remarks: ['']
    });

  protected readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Add Outgoing Goods';
      case 'view':
        return 'Outgoing Goods Details';
      case 'edit':
        return 'Edit Outgoing Goods';
      default:
        return 'Outgoing Goods';
    }
  });

  protected readonly pageDescription = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Record goods leaving a warehouse.';
      case 'view':
        return 'View outgoing record and dispatch goods.';
      case 'edit':
        return 'Update outgoing record details.';
      default:
        return 'Track goods leaving warehouses.';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url =
      this.route.snapshot.routeConfig?.path || '';

    this.loadWarehouses();

    if (id) {
      this.mode.set('view');
      this.loadOutgoing(id);
      return;
    }

    if (url.endsWith('/new')) {
      this.mode.set('create');
      this.resetCreateForm();
      return;
    }

    this.mode.set('list');
    this.loadOutgoingList();
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

    this.loadItemsForWarehouse(
      String(warehouseId || '')
    );
  }

  protected destinationWarehouseOptions():
    WarehouseRecord[] {
    const sourceId =
      this.form.controls.warehouseId.value;

    return this.warehouses().filter(
      (w) => w._id && w._id !== sourceId
    );
  }

  protected loadOutgoingList(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.api
      .get<OutgoingListResponse>(
        '/warehouse/outgoing',
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
            'Unable to load outgoing records.'
          );
        }
      });
  }

  protected loadOutgoing(id: string): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.saveSuccess.set('');
    this.actionError.set('');

    this.api
      .get<OutgoingRecord>(
        `/warehouse/outgoing/${id}`
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
              shipmentNumber: record.shipmentNumber || '',
              destinationType: record.destinationType || 'customer',
              destinationTypeOther: record.destinationTypeOther || '',
              destinationWarehouseId: record.destinationWarehouseId || '',
              customerName: record.customerName || '',
              productName: record.productName || '',
              sku: record.sku || '',
              itemId: record.itemId || '',
              quantity: Number(record.quantity || 0),
              unit: record.unit || 'unit',
              dispatchDate: record.dispatchDate || '',
              destination: record.destination || '',
              remarks: record.remarks || ''
            });

            this.loadItemsForWarehouse(
              record.warehouseId || ''
            );
          }
        },
        error: (error: any) => {
          this.selected.set(null);
          this.loadError.set(
            error?.error?.message ||
            'Unable to load outgoing record.'
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
        this.loadOutgoing(String(current._id));
      }
      return;
    }

    if (this.mode() === 'list') {
      this.loadOutgoingList(
        this.pagination()?.page || 1
      );
    }
  }

  protected applyFilters(): void {
    this.loadOutgoingList(1);
  }

  protected resetFilters(): void {
    this.listSearch.set('');
    this.listStatus.set('');
    this.listWarehouseId.set('');
    this.listFromDate.set('');
    this.listToDate.set('');
    this.loadOutgoingList(1);
  }

  protected openCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/outgoing-goods/new'
    );
  }

  protected openView(record: OutgoingRecord): void {
    if (!record?._id) {
      return;
    }

    void this.router.navigateByUrl(
      `/warehouse/outgoing-goods/${record._id}`
    );
  }

  protected cancelCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/outgoing-goods'
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
        shipmentNumber: current.shipmentNumber || '',
        destinationType: current.destinationType || 'customer',
        destinationTypeOther: current.destinationTypeOther || '',
        destinationWarehouseId: current.destinationWarehouseId || '',
        customerName: current.customerName || '',
        productName: current.productName || '',
        sku: current.sku || '',
        itemId: current.itemId || '',
        quantity: Number(current.quantity || 0),
        unit: current.unit || 'unit',
        dispatchDate: current.dispatchDate || '',
        destination: current.destination || '',
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

    const payload = {
      warehouseId: value.warehouseId,
      shipmentNumber: value.shipmentNumber,
      destinationType: value.destinationType,
      destinationTypeOther: value.destinationTypeOther,
      destinationWarehouseId:
        value.destinationType === 'other_warehouse'
          ? value.destinationWarehouseId || null
          : null,
      customerName: value.customerName,
      productName: value.productName,
      sku: value.sku,
      itemId: value.itemId || null,
      quantity: value.quantity,
      unit: value.unit,
      dispatchDate: value.dispatchDate || null,
      destination: value.destination,
      remarks: value.remarks
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .post<OutgoingRecord>(
        '/warehouse/outgoing',
        payload
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.saveSuccess.set(
            'Outgoing record created successfully.'
          );

          if (record?._id) {
            void this.router.navigateByUrl(
              `/warehouse/outgoing-goods/${record._id}`
            );
            return;
          }

          void this.router.navigateByUrl(
            '/warehouse/outgoing-goods'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to create outgoing record.'
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

    const payload: Record<string, unknown> = {
      destinationType: value.destinationType,
      destinationTypeOther: value.destinationTypeOther,
      destinationWarehouseId:
        value.destinationType === 'other_warehouse'
          ? value.destinationWarehouseId || null
          : null,
      customerName: value.customerName,
      productName: value.productName,
      sku: value.sku,
      itemId: value.itemId || null,
      quantity: value.quantity,
      unit: value.unit,
      dispatchDate: value.dispatchDate || null,
      destination: value.destination,
      remarks: value.remarks
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .patch<OutgoingRecord>(
        `/warehouse/outgoing/${current._id}`,
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
            'Outgoing record updated successfully.'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to update outgoing record.'
          );
        }
      });
  }

  protected dispatch(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      current.itemId
        ? `Dispatch ${current.quantity} ${current.unit} of ${current.productName}? Stock will be reduced.`
        : `Dispatch ${current.shipmentNumber} without stock reduction?`
    );

    if (!confirmed) {
      return;
    }

    this.runAction(
      `/warehouse/outgoing/${current._id}/dispatch`,
      'Outgoing record dispatched.'
    );
  }

  protected markDelivered(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Mark ${current.shipmentNumber} as delivered?`
    );

    if (!confirmed) {
      return;
    }

    this.runAction(
      `/warehouse/outgoing/${current._id}/deliver`,
      'Outgoing record marked delivered.'
    );
  }

  protected cancelOutgoing(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel outgoing ${current.shipmentNumber}?`
    );

    if (!confirmed) {
      return;
    }

    this.runAction(
      `/warehouse/outgoing/${current._id}/cancel`,
      'Outgoing record cancelled.'
    );
  }

  protected deleteOutgoing(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete outgoing ${current.shipmentNumber}?`
    );

    if (!confirmed) {
      return;
    }

    this.isActing.set(true);
    this.actionError.set('');

    this.api
      .delete<unknown>(
        `/warehouse/outgoing/${current._id}`
      )
      .pipe(
        finalize(() => this.isActing.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            '/warehouse/outgoing-goods'
          );
        },
        error: (error: any) => {
          this.actionError.set(
            error?.error?.message ||
            'Unable to delete outgoing record.'
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
      .post<OutgoingRecord>(endpoint, {})
      .pipe(
        finalize(() => this.isActing.set(false))
      )
      .subscribe({
        next: (record) => {
          this.selected.set(record || null);
          this.saveSuccess.set(successMessage);

          if (record) {
            this.form.patchValue({
              warehouseId: record.warehouseId || '',
              shipmentNumber: record.shipmentNumber || '',
              destinationType: record.destinationType || 'customer',
              destinationTypeOther: record.destinationTypeOther || '',
              destinationWarehouseId: record.destinationWarehouseId || '',
              customerName: record.customerName || '',
              productName: record.productName || '',
              sku: record.sku || '',
              itemId: record.itemId || '',
              quantity: Number(record.quantity || 0),
              unit: record.unit || 'unit',
              dispatchDate: record.dispatchDate || '',
              destination: record.destination || '',
              remarks: record.remarks || ''
            });
          }
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
      shipmentNumber: '',
      destinationType: 'customer',
      destinationTypeOther: '',
      destinationWarehouseId: '',
      customerName: '',
      productName: '',
      sku: '',
      itemId: '',
      quantity: 0,
      unit: 'unit',
      dispatchDate: '',
      destination: '',
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

  protected itemLabel(
    itemId?: string | null
  ): string {
    if (!itemId) {
      return 'Not linked to inventory';
    }

    const match = this.items().find(
      (item) => item._id === itemId
    );

    if (!match) {
      return '-';
    }

    return `${match.productName || '-'} (${match.sku || '-'})`;
  }

  protected destinationTypeLabel(value?: string): string {
    switch (value) {
      case 'customer':
        return 'Customer';
      case 'export_shipment':
        return 'Export Shipment';
      case 'distributor':
        return 'Distributor';
      case 'other_warehouse':
        return 'Other Warehouse';
      case 'other':
        return 'Other';
      default:
        return this.statusLabel(value);
    }
  }

  protected statusLabel(value?: string): string {
    switch (value) {
      case 'preparing':
        return 'Preparing';
      case 'dispatched':
        return 'Dispatched';
      case 'delivered':
        return 'Delivered';
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
      case 'preparing':
        return 'preparing';
      case 'dispatched':
        return 'dispatched';
      case 'delivered':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'preparing';
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