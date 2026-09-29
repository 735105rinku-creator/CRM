import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
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

interface ActivityRecord {
  _id?: string;
  warehouseId?: string | null;
  itemId?: string | null;
  type?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  employeeId?: string | null;
  userId?: string | null;
  referenceType?: string;
  referenceId?: string | null;
  referenceNumber?: string;
  notes?: string;
  occurredAt?: string;
  createdAt?: string;
}

interface ActivityPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ActivityListResponse {
  data?: ActivityRecord[];
  pagination?: ActivityPagination;
}

const TYPES = [
  'goods_received',
  'goods_dispatched',
  'stock_added',
  'stock_removed',
  'stock_transferred',
  'damaged_goods_reported',
  'warehouse_created'
];

@Component({
  selector: 'app-warehouse-activity',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl:
    './activity.component.html',
  styleUrl:
    './activity.component.scss'
})
export class WarehouseActivityComponent
  implements OnInit {

  private readonly api = inject(ApiService);

  protected readonly types = TYPES;

  protected readonly isLoading = signal(false);
  protected readonly loadError = signal('');

  protected readonly records =
    signal<ActivityRecord[]>([]);

  protected readonly pagination =
    signal<ActivityPagination | null>(null);

  protected readonly warehouses =
    signal<WarehouseRecord[]>([]);

  protected readonly listSearch = signal('');
  protected readonly listType = signal('');
  protected readonly listWarehouseId = signal('');
  protected readonly listFromDate = signal('');
  protected readonly listToDate = signal('');

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadActivity();
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

  protected loadActivity(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.api
      .get<ActivityListResponse>(
        '/warehouse/activity',
        {
          page,
          limit: 20,
          search: this.listSearch(),
          type: this.listType(),
          warehouseId: this.listWarehouseId(),
          fromDate: this.listFromDate(),
          toDate: this.listToDate(),
          sortBy: 'occurredAt',
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
            'Unable to load activity.'
          );
        }
      });
  }

  protected reloadCurrent(): void {
    this.loadActivity(
      this.pagination()?.page || 1
    );
  }

  protected applyFilters(): void {
    this.loadActivity(1);
  }

  protected resetFilters(): void {
    this.listSearch.set('');
    this.listType.set('');
    this.listWarehouseId.set('');
    this.listFromDate.set('');
    this.listToDate.set('');
    this.loadActivity(1);
  }

  protected typeLabel(value?: string): string {
    switch (value) {
      case 'goods_received':
        return 'Goods Received';
      case 'goods_dispatched':
        return 'Goods Dispatched';
      case 'stock_added':
        return 'Stock Added';
      case 'stock_removed':
        return 'Stock Removed';
      case 'stock_transferred':
        return 'Stock Transferred';
      case 'damaged_goods_reported':
        return 'Damaged Goods Reported';
      case 'warehouse_created':
        return 'Warehouse Created';
      default:
        return String(value || '')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }

  protected badgeClass(value?: string): string {
    switch (value) {
      case 'goods_received':
        return 'received';
      case 'goods_dispatched':
        return 'dispatched';
      case 'stock_added':
        return 'added';
      case 'stock_removed':
        return 'removed';
      case 'stock_transferred':
        return 'transferred';
      case 'damaged_goods_reported':
        return 'damaged';
      case 'warehouse_created':
        return 'created';
      default:
        return 'created';
    }
  }

  protected warehouseLabel(
    warehouseId?: string | null
  ): string {
    if (!warehouseId) {
      return '-';
    }

    const match = this.warehouses().find(
      (item) => item._id === warehouseId
    );

    if (!match) {
      return '-';
    }

    return `${match.name || '-'} (${match.code || '-'})`;
  }

  protected productLabel(
    record: ActivityRecord
  ): string {
    const name = String(
      record.productName || ''
    ).trim();

    const sku = String(
      record.sku || ''
    ).trim();

    if (!name && !sku) {
      return '-';
    }

    if (name && sku) {
      return `${name} (${sku})`;
    }

    return name || sku;
  }

  protected quantityLabel(
    record: ActivityRecord
  ): string {
    const quantity = Number(
      record.quantity || 0
    );

    if (!quantity) {
      return '-';
    }

    return (
      `${this.formatNumber(quantity)} ` +
      `${this.unitLabel(record.unit)}`
    );
  }

  protected employeeLabel(
    record: ActivityRecord
  ): string {
    const id = String(
      record.employeeId || ''
    ).trim();

    if (!id) {
      return '-';
    }

    return `#${id.slice(-6)}`;
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
      ? new Intl.DateTimeFormat('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(value))
      : '-';
  }

  protected formatNumber(value?: number): string {
    return new Intl.NumberFormat('en-IN').format(
      Number(value || 0)
    );
  }
}