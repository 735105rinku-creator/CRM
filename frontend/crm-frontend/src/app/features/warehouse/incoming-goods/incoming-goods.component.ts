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
}

interface WarehouseItemListResponse {
  data?: WarehouseItemRecord[];
}

interface IncomingRecord {
  _id?: string;
  warehouseId?: string;
  shipmentNumber?: string;
  referenceType?: string;
  referenceTypeOther?: string;
  referenceNumber?: string;
  supplierName?: string;
  productName?: string;
  sku?: string;
  itemId?: string | null;
  quantity?: number;
  unit?: string;
  arrivalDate?: string;
  condition?: string;
  conditionOther?: string;
  remarks?: string;
  status?: string;
  receivedAt?: string;
  confirmedAt?: string;
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

interface IncomingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface IncomingListResponse {
  data?: IncomingRecord[];
  pagination?: IncomingPagination;
}

const REFERENCE_TYPES = [
  'supplier',
  'manufacturer',
  'import_shipment',
  'purchase_order',
  'other'
];

const CONDITIONS = [
  'good',
  'damaged',
  'partial',
  'other'
];

const STATUSES = [
  'expected',
  'received',
  'confirmed',
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
  selector: 'app-warehouse-incoming-goods',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './incoming-goods.component.html',
  styleUrl:
    './incoming-goods.component.scss'
})
export class WarehouseIncomingGoodsComponent
  implements OnInit {

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly referenceTypes = REFERENCE_TYPES;
  protected readonly conditions = CONDITIONS;
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
    signal<IncomingRecord[]>([]);

  protected readonly pagination =
    signal<IncomingPagination | null>(null);

  protected readonly selected =
    signal<IncomingRecord | null>(null);

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
      referenceType: ['supplier', [
        Validators.required
      ]],
      referenceTypeOther: [''],
      referenceNumber: [''],
      supplierName: ['', [
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
      arrivalDate: [''],
      condition: ['good', [
        Validators.required
      ]],
      conditionOther: [''],
      remarks: ['']
    });

  protected readonly pageTitle = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Add Incoming Goods';
      case 'view':
        return 'Incoming Goods Details';
      case 'edit':
        return 'Edit Incoming Goods';
      default:
        return 'Incoming Goods';
    }
  });

  protected readonly pageDescription = computed(() => {
    switch (this.mode()) {
      case 'create':
        return 'Record goods arriving at a warehouse.';
      case 'view':
        return 'View incoming record and confirm goods.';
      case 'edit':
        return 'Update incoming record details.';
      default:
        return 'Track goods arriving at warehouses.';
    }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url =
      this.route.snapshot.routeConfig?.path || '';

    this.loadWarehouses();

    if (id) {
      this.mode.set('view');
      this.loadIncoming(id);
      return;
    }

    if (url.endsWith('/new')) {
      this.mode.set('create');
      this.resetCreateForm();
      return;
    }

    this.mode.set('list');
    this.loadIncomingList();
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

  protected loadIncomingList(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.api
      .get<IncomingListResponse>(
        '/warehouse/incoming',
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
            'Unable to load incoming records.'
          );
        }
      });
  }

  protected loadIncoming(id: string): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.saveSuccess.set('');
    this.actionError.set('');

    this.api
      .get<IncomingRecord>(
        `/warehouse/incoming/${id}`
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
              referenceType: record.referenceType || 'supplier',
              referenceTypeOther: record.referenceTypeOther || '',
              referenceNumber: record.referenceNumber || '',
              supplierName: record.supplierName || '',
              productName: record.productName || '',
              sku: record.sku || '',
              itemId: record.itemId || '',
              quantity: Number(record.quantity || 0),
              unit: record.unit || 'unit',
              arrivalDate: record.arrivalDate || '',
              condition: record.condition || 'good',
              conditionOther: record.conditionOther || '',
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
            'Unable to load incoming record.'
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
        this.loadIncoming(String(current._id));
      }
      return;
    }

    if (this.mode() === 'list') {
      this.loadIncomingList(
        this.pagination()?.page || 1
      );
    }
  }

  protected applyFilters(): void {
    this.loadIncomingList(1);
  }

  protected resetFilters(): void {
    this.listSearch.set('');
    this.listStatus.set('');
    this.listWarehouseId.set('');
    this.listFromDate.set('');
    this.listToDate.set('');
    this.loadIncomingList(1);
  }

  protected openCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/incoming-goods/new'
    );
  }

  protected openView(record: IncomingRecord): void {
    if (!record?._id) {
      return;
    }

    void this.router.navigateByUrl(
      `/warehouse/incoming-goods/${record._id}`
    );
  }

  protected cancelCreate(): void {
    void this.router.navigateByUrl(
      '/warehouse/incoming-goods'
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
        referenceType: current.referenceType || 'supplier',
        referenceTypeOther: current.referenceTypeOther || '',
        referenceNumber: current.referenceNumber || '',
        supplierName: current.supplierName || '',
        productName: current.productName || '',
        sku: current.sku || '',
        itemId: current.itemId || '',
        quantity: Number(current.quantity || 0),
        unit: current.unit || 'unit',
        arrivalDate: current.arrivalDate || '',
        condition: current.condition || 'good',
        conditionOther: current.conditionOther || '',
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
      .post<IncomingRecord>(
        '/warehouse/incoming',
        value
      )
      .pipe(
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: (record) => {
          this.saveSuccess.set(
            'Incoming record created successfully.'
          );

          if (record?._id) {
            void this.router.navigateByUrl(
              `/warehouse/incoming-goods/${record._id}`
            );
            return;
          }

          void this.router.navigateByUrl(
            '/warehouse/incoming-goods'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to create incoming record.'
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
      referenceType: value.referenceType,
      referenceTypeOther: value.referenceTypeOther,
      referenceNumber: value.referenceNumber,
      supplierName: value.supplierName,
      productName: value.productName,
      sku: value.sku,
      itemId: value.itemId || null,
      quantity: value.quantity,
      unit: value.unit,
      arrivalDate: value.arrivalDate || null,
      condition: value.condition,
      conditionOther: value.conditionOther,
      remarks: value.remarks
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.api
      .patch<IncomingRecord>(
        `/warehouse/incoming/${current._id}`,
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
            'Incoming record updated successfully.'
          );
        },
        error: (error: any) => {
          this.saveError.set(
            error?.error?.message ||
            'Unable to update incoming record.'
          );
        }
      });
  }

  protected markReceived(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Mark incoming ${current.shipmentNumber} as received?`
    );

    if (!confirmed) {
      return;
    }

    this.runAction(
      `/warehouse/incoming/${current._id}/receive`,
      'Goods marked as received.'
    );
  }

  protected confirmQuantity(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      current.itemId
        ? `Confirm ${current.quantity} ${current.unit} of ${current.productName} into stock?`
        : `Confirm incoming ${current.shipmentNumber} without adding to inventory?`
    );

    if (!confirmed) {
      return;
    }

    this.runAction(
      `/warehouse/incoming/${current._id}/confirm`,
      'Goods confirmed.'
    );
  }

  protected cancelIncoming(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel incoming ${current.shipmentNumber}?`
    );

    if (!confirmed) {
      return;
    }

    this.runAction(
      `/warehouse/incoming/${current._id}/cancel`,
      'Incoming record cancelled.'
    );
  }

  protected deleteIncoming(): void {
    const current = this.selected();

    if (!current?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete incoming ${current.shipmentNumber}?`
    );

    if (!confirmed) {
      return;
    }

    this.isActing.set(true);
    this.actionError.set('');

    this.api
      .delete<unknown>(
        `/warehouse/incoming/${current._id}`
      )
      .pipe(
        finalize(() => this.isActing.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            '/warehouse/incoming-goods'
          );
        },
        error: (error: any) => {
          this.actionError.set(
            error?.error?.message ||
            'Unable to delete incoming record.'
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
      .post<IncomingRecord>(endpoint, {})
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
              referenceType: record.referenceType || 'supplier',
              referenceTypeOther: record.referenceTypeOther || '',
              referenceNumber: record.referenceNumber || '',
              supplierName: record.supplierName || '',
              productName: record.productName || '',
              sku: record.sku || '',
              itemId: record.itemId || '',
              quantity: Number(record.quantity || 0),
              unit: record.unit || 'unit',
              arrivalDate: record.arrivalDate || '',
              condition: record.condition || 'good',
              conditionOther: record.conditionOther || '',
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
      referenceType: 'supplier',
      referenceTypeOther: '',
      referenceNumber: '',
      supplierName: '',
      productName: '',
      sku: '',
      itemId: '',
      quantity: 0,
      unit: 'unit',
      arrivalDate: '',
      condition: 'good',
      conditionOther: '',
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

  protected referenceTypeLabel(value?: string): string {
    switch (value) {
      case 'supplier':
        return 'Supplier';
      case 'manufacturer':
        return 'Manufacturer';
      case 'import_shipment':
        return 'Import Shipment';
      case 'purchase_order':
        return 'Purchase Order';
      case 'other':
        return 'Other';
      default:
        return this.statusLabel(value);
    }
  }

  protected conditionLabel(value?: string): string {
    switch (value) {
      case 'good':
        return 'Good';
      case 'damaged':
        return 'Damaged';
      case 'partial':
        return 'Partial';
      case 'other':
        return 'Other';
      default:
        return this.statusLabel(value);
    }
  }

  protected statusLabel(value?: string): string {
    switch (value) {
      case 'expected':
        return 'Expected';
      case 'received':
        return 'Received';
      case 'confirmed':
        return 'Confirmed';
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
      case 'expected':
        return 'expected';
      case 'received':
        return 'received';
      case 'confirmed':
        return 'confirmed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'expected';
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