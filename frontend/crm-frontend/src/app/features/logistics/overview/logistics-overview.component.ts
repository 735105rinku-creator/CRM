import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/services/api.service';

interface LogisticsPermission {
  module: 'logistics';
  subModule: string;
  view: boolean;
  viewScope: 'own' | 'team' | 'all';
  create: boolean;
  edit: boolean;
  delete: boolean;
  updateStatus: boolean;
}

interface EmployeeBreakdownRow {
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  total?: number;
  pending?: number;
  inProgress?: number;
  completed?: number;
  cancelled?: number;
}

interface ShipmentRow {
  _id?: string;
  shipmentNumber?: string;
  customerName?: string;
  shipmentMode?: string;
  status?: string;
  currentLocation?: string;
  assignedTo?: { firstName?: string; lastName?: string; employeeCode?: string } | string | null;
  createdAt?: string;
}

interface StatusHistoryRow {
  status?: string;
  location?: string;
  remarks?: string;
  changedAt?: string;
  changedBy?: { name?: string; email?: string; role?: string } | string | null;
}

interface LogisticsOverviewResponse {
  pending?: number;
  inTransit?: number;
  customs?: number;
  delivered?: number;
  hold?: number;
  cancelled?: number;
  recentShipments?: ShipmentRow[];
  employeeBreakdown?: EmployeeBreakdownRow[];
  viewScope?: 'own' | 'team' | 'all';
  permissions?: LogisticsPermission[];
  canShowEmployeeBreakdown?: boolean;
}

@Component({
  selector: 'app-logistics-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics-overview.component.html',
  styleUrl: './logistics-overview.component.scss'
})
export class LogisticsOverviewComponent {
  private readonly api = inject(ApiService);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly overview = signal<LogisticsOverviewResponse>({});
  protected readonly selectedShipment = signal<ShipmentRow | null>(null);
  protected readonly history = signal<StatusHistoryRow[]>([]);
  protected readonly statusUpdating = signal(false);
  protected readonly statusForm = signal({ status: 'in_transit', remarks: '', currentLocation: '' });

  protected readonly cards = computed(() => {
    const data = this.overview();
    return [
      { label: 'Pending', value: Number(data.pending || 0) + Number(data.hold || 0), tone: 'gold', icon: '\u25F7' },
      { label: 'In Progress', value: Number(data.inTransit || 0) + Number(data.customs || 0), tone: 'blue', icon: '\u2197' },
      { label: 'Completed', value: Number(data.delivered || 0), tone: 'green', icon: '\u2713' },
      { label: 'Cancelled', value: Number(data.cancelled || 0), tone: 'red', icon: '\u2715' }
    ];
  });

  protected readonly canShowEmployeeBreakdown = computed(() => Boolean(this.overview().canShowEmployeeBreakdown));
  protected readonly canUpdateStatus = computed(() =>
    Boolean(this.overview().permissions?.some((permission) => permission.module === 'logistics' && permission.updateStatus))
  );

  constructor() {
    this.loadOverview();
  }

  protected loadOverview(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.get<LogisticsOverviewResponse>('/logistics/overview').subscribe({
      next: (response) => {
        this.overview.set(response || {});
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error?.error?.message || 'Unable to load logistics overview.');
        this.loading.set(false);
      }
    });
  }

  protected openHistory(shipment: ShipmentRow): void {
    if (!shipment._id) return;
    this.selectedShipment.set(shipment);
    this.history.set([]);
    this.api.get<{ statusHistory?: StatusHistoryRow[] }>(`/logistics/shipments/${shipment._id}/history`).subscribe({
      next: (response) => this.history.set(response?.statusHistory || []),
      error: () => this.history.set([])
    });
  }

  protected setStatus(status: string): void {
    this.statusForm.update((current) => ({ ...current, status }));
  }

  protected setCurrentLocation(currentLocation: string): void {
    this.statusForm.update((current) => ({ ...current, currentLocation }));
  }

  protected setRemarks(remarks: string): void {
    this.statusForm.update((current) => ({ ...current, remarks }));
  }

  protected updateStatus(): void {
    const shipment = this.selectedShipment();
    const form = this.statusForm();
    if (!shipment?._id || !form.remarks.trim() || !this.canUpdateStatus()) return;

    this.statusUpdating.set(true);
    this.api.patch(`/logistics/shipments/${shipment._id}/status`, form).subscribe({
      next: () => {
        this.statusUpdating.set(false);
        this.statusForm.set({ status: 'in_transit', remarks: '', currentLocation: '' });
        this.loadOverview();
        this.openHistory(shipment);
      },
      error: () => this.statusUpdating.set(false)
    });
  }

  protected employeeName(row: EmployeeBreakdownRow): string {
    return row.employeeName?.trim() || row.employeeCode || 'Unassigned';
  }

  protected changedBy(row: StatusHistoryRow): string {
    const user = row.changedBy;
    if (user && typeof user === 'object') return user.name || user.email || 'System';
    return 'System';
  }
}
