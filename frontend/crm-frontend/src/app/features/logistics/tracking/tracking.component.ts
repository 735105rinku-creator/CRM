import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option {
  label: string;
  value: string;
}

type BackendStatus =
  | 'draft'
  | 'booking_created'
  | 'container_pending'
  | 'stuffing'
  | 'pickup_pending'
  | 'picked_up'
  | 'at_warehouse'
  | 'documents_pending'
  | 'customs'
  | 'loaded'
  | 'in_transit'
  | 'arrived'
  | 'out_for_delivery'
  | 'delivered'
  | 'hold'
  | 'cancelled'
  | 'other';

interface StatusHistoryItem {
  status?: BackendStatus;
  location?: string;
  remarks?: string;
  changedAt?: string;
}

interface LogisticsShipment {
  _id?: string;
  shipmentNumber?: string;
  shipmentMode?: 'air_cargo' | 'sea_freight' | 'road' | 'other';
  shipmentModeOther?: string;
  customerName?: string;
  origin?: { name?: string; city?: string };
  destination?: { name?: string; city?: string };
  currentLocation?: string;
  trackingReference?: string;
  estimatedArrival?: string | null;
  status?: BackendStatus;
  statusOther?: string;
  statusHistory?: StatusHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface ShipmentListResponse {
  data?: LogisticsShipment[] | { data?: LogisticsShipment[]; records?: LogisticsShipment[]; pagination?: unknown };
  records?: LogisticsShipment[];
}

interface ShipmentOption {
  label: string;
  value: string;
  raw: LogisticsShipment;
}

interface TrackingTimelineItem {
  status: string;
  label: string;
  location: string;
  remarks: string;
  changedAt: string;
}

interface TrackingEvent {
  id: number;
  mongoId: string;
  shipmentNo: string;
  mode: string;
  customer: string;
  origin: string;
  destination: string;
  currentLocation: string;
  currentStatus: string;
  lastUpdated: string;
  eta: string;
  history: TrackingTimelineItem[];
  raw: LogisticsShipment;
}

@Component({
  selector: 'app-logistics-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.scss'
})
export class TrackingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly showForm = signal(false);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly selectedShipment = signal<TrackingEvent | null>(null);
  protected readonly selectedShipmentId = signal<string | null>(null);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');

  protected readonly shipmentModes: Option[] = [
    { label: 'Air Cargo', value: 'air-cargo' },
    { label: 'Sea Freight', value: 'sea-freight' },
    { label: 'Road Transport', value: 'road' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly statusOptions: Option[] = [
    { label: 'Booking Created', value: 'booking-created' },
    { label: 'Pickup Pending', value: 'pickup-pending' },
    { label: 'Picked Up', value: 'picked-up' },
    { label: 'At Warehouse', value: 'warehouse' },
    { label: 'Customs Clearance', value: 'customs' },
    { label: 'Loaded', value: 'loaded' },
    { label: 'In Transit', value: 'in-transit' },
    { label: 'Arrived', value: 'arrived' },
    { label: 'Out for Delivery', value: 'out-for-delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'On Hold', value: 'hold' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();
  protected readonly records = signal<TrackingEvent[]>([]);

  protected readonly filteredRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.records().filter((item) => {
      const matchesSearch =
        !query ||
        item.shipmentNo.toLowerCase().includes(query) ||
        item.customer.toLowerCase().includes(query) ||
        item.currentLocation.toLowerCase().includes(query) ||
        item.origin.toLowerCase().includes(query) ||
        item.destination.toLowerCase().includes(query);

      const matchesStatus =
        status === 'all' ||
        item.currentStatus === status;

      return matchesSearch && matchesStatus;
    });
  });

  protected readonly summary = computed(() => ({
    total: this.records().length,
    transit: this.records().filter(
      (item) => item.currentStatus === 'in-transit'
    ).length,
    customs: this.records().filter(
      (item) => item.currentStatus === 'customs'
    ).length,
    delivered: this.records().filter(
      (item) => item.currentStatus === 'delivered'
    ).length
  }));

  ngOnInit(): void {
    this.loadTracking();

    const shipmentId =
      this.route.snapshot.queryParamMap.get('shipmentId');

    const shipmentNumber =
      this.route.snapshot.queryParamMap.get('shipmentNumber');

    if (shipmentId || shipmentNumber) {
      setTimeout(
        () =>
          this.openUpdate(
            shipmentId || undefined,
            shipmentNumber || undefined
          ),
        0
      );
    }
  }

  protected loadTracking(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api
      .get<ShipmentListResponse>(
        '/logistics/shipments',
        {
          page: 1,
          limit: 100,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        }
      )
      .pipe(
        finalize(() =>
          this.isLoading.set(false)
        )
      )
      .subscribe({
        next: (result) => {
          const rows = this.extractShipmentRows(result);

          this.records.set(
            rows.map(
              (shipment, index) =>
                this.mapShipment(
                  shipment,
                  index
                )
            )
          );
        },

        error: (error: {
          error?: {
            message?: string;
            errors?: Array<{ message?: string }>;
          };
        }) => {
          this.records.set([]);

          this.errorMessage.set(
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Unable to load shipment tracking data.'
          );
        }
      });
  }

  protected openUpdate(
    shipmentId?: string,
    shipmentNumber?: string
  ): void {
    this.form = this.emptyForm();
    this.selectedShipmentId.set(
      shipmentId || null
    );
    this.message.set('');
    this.errorMessage.set('');

    if (shipmentNumber) {
      this.form.shipmentNo =
        shipmentNumber;
    }

    const existing =
      this.records().find(
        (item) =>
          (
            shipmentId &&
            item.mongoId === shipmentId
          ) ||
          (
            shipmentNumber &&
            item.shipmentNo === shipmentNumber
          )
      );

    if (existing) {
      this.prefillForm(existing);
    }

    this.showForm.set(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  protected updateExisting(
    item: TrackingEvent
  ): void {
    this.openUpdate(
      item.mongoId,
      item.shipmentNo
    );
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.selectedShipmentId.set(null);
    this.form = this.emptyForm();
    this.message.set('');
    this.errorMessage.set('');
  }

  protected shipmentOptions(): ShipmentOption[] {
    const mode = this.form.shipmentMode;

    return this.records()
      .filter((item) => {
        if (!mode || mode === 'other') {
          return true;
        }

        return this.mapModeFromBackend(item.raw.shipmentMode) === mode;
      })
      .map((item) => ({
        label: `${item.shipmentNo} - ${item.customer}`,
        value: item.shipmentNo,
        raw: item.raw
      }));
  }

  protected onTrackingModeChanged(): void {
    this.form.shipmentNo = '';
    this.form.currentLocation = '';
    this.form.trackingReference = '';
    this.form.estimatedArrival = '';
    this.selectedShipmentId.set(null);
    this.fillBrowserLocation();
  }

  protected onTrackingShipmentSelected(value: string): void {
    this.form.shipmentNo = value;

    const item = this.records().find((record) => record.shipmentNo === value);

    if (item) {
      this.prefillForm(item);
    }

    this.fillBrowserLocation();
  }
  protected saveTrackingUpdate(): void {
    if (this.isSaving()) {
      return;
    }

    const validationError =
      this.validateForm();

    if (validationError) {
      this.errorMessage.set(validationError);
      window.alert(validationError);
      return;
    }

    this.message.set('');
    this.errorMessage.set('');
    this.isSaving.set(true);

    const shipmentNo =
      this.form.shipmentNo
        .trim()
        .toUpperCase();

    const existing =
      this.records().find(
        (item) =>
          item.shipmentNo === shipmentNo
      );

    const knownId =
      this.selectedShipmentId() ||
      existing?.mongoId ||
      null;

    const resolveShipment$ =
      knownId
        ? of(
            existing?.raw || {
              _id: knownId,
              shipmentNumber: shipmentNo
            } as LogisticsShipment
          )
        : this.api.get<LogisticsShipment>(
            `/logistics/shipments/number/${encodeURIComponent(shipmentNo)}`
          );

    resolveShipment$
      .pipe(
        switchMap((shipment) => {
          const shipmentId =
            shipment._id;

          if (!shipmentId) {
            throw new Error(
              'Shipment ID could not be resolved.'
            );
          }

          this.selectedShipmentId.set(
            shipmentId
          );

          const generalUpdate: {
            trackingReference?: string;
            estimatedArrival?: string | null;
          } = {};

          if (
            this.form.trackingReference.trim()
          ) {
            generalUpdate.trackingReference =
              this.form.trackingReference.trim();
          }

          if (
            this.form.estimatedArrival
          ) {
            generalUpdate.estimatedArrival =
              this.form.estimatedArrival;
          }

          return this.api.patch<LogisticsShipment>(
            `/logistics/shipments/${shipmentId}/status`,
            {
              status:
                this.mapStatusToBackend(
                  this.form.currentStatus
                ),

              statusOther:
                this.form.currentStatus === 'other'
                  ? this.form.currentStatusOther.trim()
                  : '',

              currentLocation:
                this.form.currentLocation.trim(),

              trackingReference:
                generalUpdate.trackingReference || '',

              estimatedArrival:
                generalUpdate.estimatedArrival || null,

              remarks:
                this.buildTrackingRemarks()
            }
          );
        }),

        finalize(() =>
          this.isSaving.set(false)
        )
      )
      .subscribe({
        next: (updated) => {
          const success =
            `${updated.shipmentNumber || shipmentNo} tracking updated successfully.`;

          this.message.set(success);
          this.errorMessage.set('');

          window.alert(success);

          this.showForm.set(false);
          this.selectedShipmentId.set(null);
          this.form = this.emptyForm();

          this.loadTracking();
        },

        error: (error: {
          error?: {
            message?: string;
            errors?: Array<{ message?: string }>;
          };
          message?: string;
        }) => {
          const message =
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            error?.message ||
            'Unable to save tracking update.';

          this.errorMessage.set(message);
          window.alert(message);
        }
      });
  }

  protected viewTimeline(
    item: TrackingEvent
  ): void {
    this.selectedShipment.set(item);
  }

  protected closeTimeline(): void {
    this.selectedShipment.set(null);
  }

  protected statusLabel(
    status: string
  ): string {
    return (
      this.statusOptions.find(
        (option) =>
          option.value === status
      )?.label ||
      status
    );
  }

  protected timelineStatusLabel(
    item: TrackingTimelineItem
  ): string {
    return item.label;
  }

  private extractShipmentRows(
    result: ShipmentListResponse | LogisticsShipment[] | null | undefined
  ): LogisticsShipment[] {
    if (Array.isArray(result)) {
      return result;
    }

    const data = result?.data;

    if (Array.isArray(data)) {
      return data;
    }

    return data?.data || data?.records || result?.records || [];
  }

  private validateForm(): string {
    if (!this.form.shipmentNo.trim()) {
      return 'Shipment Number is required.';
    }

    if (!this.form.shipmentMode) {
      return 'Shipment Mode is required.';
    }

    if (
      this.form.shipmentMode === 'other' &&
      !this.form.shipmentModeOther.trim()
    ) {
      return 'Enter Shipment Mode because Other is selected.';
    }

    if (!this.form.currentLocation.trim()) {
      return 'Current Location is required.';
    }

    if (!this.form.currentStatus) {
      return 'Current Status is required.';
    }

    if (
      this.form.currentStatus === 'other' &&
      !this.form.currentStatusOther.trim()
    ) {
      return 'Enter Current Status because Other is selected.';
    }

    if (!this.form.remarks.trim()) {
      return 'Remarks are compulsory for every tracking update.';
    }

    return '';
  }

  private prefillForm(
    item: TrackingEvent
  ): void {
    const raw = item.raw;

    this.selectedShipmentId.set(
      item.mongoId
    );

    this.form.shipmentNo =
      item.shipmentNo;

    this.form.shipmentMode =
      this.mapModeFromBackend(
        raw.shipmentMode
      );

    this.form.shipmentModeOther =
      raw.shipmentMode === 'other'
        ? raw.shipmentModeOther || ''
        : '';

    this.form.currentLocation =
      item.currentLocation === '-'
        ? item.origin === '-'
          ? ''
          : item.origin
        : item.currentLocation;

    this.form.currentStatus =
      item.currentStatus;

    this.form.currentStatusOther =
      raw.status === 'other'
        ? raw.statusOther || ''
        : '';

    this.form.trackingReference =
      raw.trackingReference ||
      (raw as { airFreight?: { awbNumber?: string }; seaFreight?: { billOfLading?: string; containerNumber?: string } }).airFreight?.awbNumber ||
      (raw as { seaFreight?: { billOfLading?: string; containerNumber?: string } }).seaFreight?.billOfLading ||
      (raw as { seaFreight?: { billOfLading?: string; containerNumber?: string } }).seaFreight?.containerNumber ||
      '';

    this.form.estimatedArrival =
      this.dateForInput(
        raw.estimatedArrival
      );
  }

  private mapShipment(
    shipment: LogisticsShipment,
    index: number
  ): TrackingEvent {
    const history =
      (shipment.statusHistory || []).map(
        (item) =>
          this.mapTimelineItem(item)
      );

    if (!history.length) {
      const uiStatus =
        this.mapStatusFromBackend(
          shipment.status || 'draft'
        );

      history.push({
        status: uiStatus,
        label: this.statusLabel(uiStatus),
        location:
          shipment.currentLocation || '-',
        remarks: '',
        changedAt:
          this.formatDateTime(
            shipment.updatedAt ||
            shipment.createdAt
          )
      });
    }

    const latest =
      history[
        history.length - 1
      ];

    return {
      id: index + 1,
      mongoId: shipment._id || '',
      shipmentNo:
        shipment.shipmentNumber || '-',
      mode:
        this.modeLabel(
          shipment.shipmentMode,
          shipment.shipmentModeOther
        ),
      customer:
        shipment.customerName || '-',
      origin:
        shipment.origin?.name ||
        shipment.origin?.city ||
        '-',
      destination:
        shipment.destination?.name ||
        shipment.destination?.city ||
        '-',
      currentLocation:
        shipment.currentLocation ||
        latest.location ||
        '-',
      currentStatus:
        this.mapStatusFromBackend(
          shipment.status || 'draft'
        ),
      lastUpdated:
        this.formatDateTime(
          shipment.updatedAt ||
          shipment.createdAt
        ),
      eta:
        this.formatDate(
          shipment.estimatedArrival
        ),
      history,
      raw: shipment
    };
  }

  private mapTimelineItem(
    item: StatusHistoryItem
  ): TrackingTimelineItem {
    const uiStatus =
      this.mapStatusFromBackend(
        item.status || 'draft'
      );

    return {
      status: uiStatus,
      label:
        this.statusLabel(uiStatus),
      location:
        item.location || '-',
      remarks:
        item.remarks || '',
      changedAt:
        this.formatDateTime(
          item.changedAt
        )
    };
  }

  private fillBrowserLocation(): void {
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!this.form.gpsLatitude.trim()) {
          this.form.gpsLatitude = String(position.coords.latitude);
        }

        if (!this.form.gpsLongitude.trim()) {
          this.form.gpsLongitude = String(position.coords.longitude);
        }
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  }

  private buildTrackingRemarks(): string {
    const parts: string[] = [
      this.form.remarks.trim()
    ];

    if (
      this.form.trackingReference.trim()
    ) {
      parts.push(
        `Tracking Reference: ${this.form.trackingReference.trim()}`
      );
    }

    if (
      this.form.eventDate ||
      this.form.eventTime
    ) {
      parts.push(
        `Event Date/Time: ${this.form.eventDate || '-'} ${this.form.eventTime || ''}`.trim()
      );
    }

    if (
      this.form.estimatedArrival
    ) {
      parts.push(
        `Estimated Arrival: ${this.form.estimatedArrival}`
      );
    }

    if (
      this.form.gpsLatitude.trim() ||
      this.form.gpsLongitude.trim()
    ) {
      parts.push(
        `GPS: ${this.form.gpsLatitude.trim() || '-'}, ${this.form.gpsLongitude.trim() || '-'}`
      );
    }

    if (
      this.form.handledBy.trim()
    ) {
      parts.push(
        `Handled By: ${this.form.handledBy.trim()}`
      );
    }

    return parts.join('\n');
  }

  private mapStatusToBackend(
    status: string
  ): BackendStatus {
    switch (status) {
      case 'booking-created':
        return 'booking_created';
      case 'pickup-pending':
        return 'pickup_pending';
      case 'picked-up':
        return 'picked_up';
      case 'warehouse':
        return 'at_warehouse';
      case 'customs':
        return 'customs';
      case 'loaded':
        return 'loaded';
      case 'in-transit':
        return 'in_transit';
      case 'arrived':
        return 'arrived';
      case 'out-for-delivery':
        return 'out_for_delivery';
      case 'delivered':
        return 'delivered';
      case 'hold':
        return 'hold';
      case 'cancelled':
        return 'cancelled';
      case 'other':
        return 'other';
      default:
        return 'booking_created';
    }
  }

  private mapStatusFromBackend(
    status: BackendStatus
  ): string {
    switch (status) {
      case 'pickup_pending':
        return 'pickup-pending';
      case 'picked_up':
        return 'picked-up';
      case 'at_warehouse':
        return 'warehouse';
      case 'documents_pending':
      case 'customs':
        return 'customs';
      case 'loaded':
        return 'loaded';
      case 'in_transit':
      case 'container_pending':
      case 'stuffing':
        return 'in-transit';
      case 'arrived':
        return 'arrived';
      case 'out_for_delivery':
        return 'out-for-delivery';
      case 'delivered':
        return 'delivered';
      case 'hold':
        return 'hold';
      case 'cancelled':
        return 'cancelled';
      case 'other':
        return 'other';
      case 'draft':
      case 'booking_created':
      default:
        return 'booking-created';
    }
  }

  private mapModeFromBackend(
    mode: LogisticsShipment['shipmentMode']
  ): string {
    switch (mode) {
      case 'air_cargo':
        return 'air-cargo';
      case 'sea_freight':
        return 'sea-freight';
      case 'road':
        return 'road';
      case 'other':
        return 'other';
      default:
        return '';
    }
  }

  private modeLabel(
    mode: LogisticsShipment['shipmentMode'],
    other: string | undefined
  ): string {
    switch (mode) {
      case 'air_cargo':
        return 'Air Cargo';
      case 'sea_freight':
        return 'Sea Freight';
      case 'road':
        return 'Road Transport';
      case 'other':
        return other || 'Other';
      default:
        return '-';
    }
  }

  private formatDate(
    value: string | null | undefined
  ): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    ).format(date);
  }

  private formatDateTime(
    value: string | undefined
  ): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);
  }

  private dateForInput(
    value: string | null | undefined
  ): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date
      .toISOString()
      .slice(0, 10);
  }

  private emptyForm() {
    return {
      shipmentNo: '',
      shipmentMode: '',
      shipmentModeOther: '',
      currentLocation: '',
      currentStatus: 'booking-created',
      currentStatusOther: '',
      trackingReference: '',
      gpsLatitude: '',
      gpsLongitude: '',
      eventDate: '',
      eventTime: '',
      estimatedArrival: '',
      handledBy: '',
      remarks: ''
    };
  }
}



