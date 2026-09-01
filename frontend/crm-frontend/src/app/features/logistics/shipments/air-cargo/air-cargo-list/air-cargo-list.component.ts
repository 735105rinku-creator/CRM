import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../../../core/services/api.service';

type ShipmentStatus =
  | 'Booking Created'
  | 'Pickup Pending'
  | 'At Warehouse'
  | 'Customs'
  | 'Airline Booked'
  | 'In Transit'
  | 'Delivered'
  | 'Cancelled';

type BackendShipmentStatus =
  | 'draft'
  | 'booking_created'
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

interface ShipmentRow {
  mongoId: string;

  shipmentId: string;
  bookingDate: string;

  customer: string;
  contactPerson: string;
  mobile: string;

  origin: string;
  destination: string;

  airline: string;
  awbNumber: string;

  grossWeight: number;
  chargeableWeight: number;

  amount: number;

  status: ShipmentStatus;

  priority:
    | 'Normal'
    | 'Express'
    | 'Urgent';

  backendStatus:
    BackendShipmentStatus;

  raw:
    LogisticsShipment;
}

interface LogisticsShipment {
  _id?: string;

  shipmentNumber?: string;

  customerName?: string;

  contactPerson?: string;

  mobile?: string;

  origin?: {
    name?: string;
    city?: string;
  };

  destination?: {
    name?: string;
    city?: string;
  };

  cargo?: {
    description?: string;
    grossWeight?: number;
    chargeableWeight?: number;
  };

  airFreight?: {
    airline?: string;
    airlineOther?: string;
    awbNumber?: string;
  };

  charges?: {
    totalAmount?: number;
  };

  status?:
    BackendShipmentStatus;

  remarks?: string;

  createdAt?: string;
  currentLocation?: string;
}

interface ShipmentPagination {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

interface ShipmentListResponse {
  data?: LogisticsShipment[] | { data?: LogisticsShipment[]; records?: LogisticsShipment[]; pagination?: ShipmentPagination };
  records?: LogisticsShipment[];
  pagination?: ShipmentPagination;
}

interface DeleteShipmentResponse {
  shipmentId?: string;
  shipmentNumber?: string;
  deleted?: boolean;
}

interface CreateShipmentPayload {
  shipmentMode: 'air_cargo';

  customerName: string;

  contactPerson?: string;
  mobile?: string;

  origin?: {
    name?: string;
    city?: string;
  };

  destination?: {
    name?: string;
    city?: string;
  };

  cargo?: {
    description?: string;
    grossWeight?: number;
    chargeableWeight?: number;
  };

  airFreight?: {
    airline?: string;
    airlineOther?: string;
    awbNumber?: string;
  };

  charges?: {
    freightAmount?: number;
    currency?: string;
  };

  status:
    'draft';

  remarks:
    string;
}

@Component({
  selector: 'app-air-cargo-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl:
    './air-cargo-list.component.html',
  styleUrl:
    './air-cargo-list.component.scss'
})
export class AirCargoListComponent
  implements OnInit {

  private readonly api =
    inject(ApiService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);


  protected readonly pageTitle =
    signal(
      'All Air Cargo Shipments'
    );


  protected readonly searchTerm =
    signal('');

  protected readonly statusFilter =
    signal('all');

  protected readonly priorityFilter =
    signal('all');

  protected readonly fromDate =
    signal('');

  protected readonly toDate =
    signal('');


  protected currentPage =
    signal(1);

  protected readonly pageSize =
    8;


  protected readonly isLoading =
    signal(false);

  protected readonly isDeleting =
    signal(false);

  protected readonly message =
    signal('');

  protected readonly errorMessage =
    signal('');


  /*
   * No demo rows.
   * Records now come only from MongoDB.
   */
  protected readonly shipments =
    signal<ShipmentRow[]>([]);


  protected readonly filteredShipments =
    computed(() => {

      const search =
        this.searchTerm()
          .trim()
          .toLowerCase();

      const status =
        this.statusFilter();

      const priority =
        this.priorityFilter();


      return this.shipments().filter(
        (shipment) => {

          const matchesSearch =
            !search ||
            shipment.shipmentId
              .toLowerCase()
              .includes(search) ||
            shipment.customer
              .toLowerCase()
              .includes(search) ||
            shipment.awbNumber
              .toLowerCase()
              .includes(search) ||
            shipment.origin
              .toLowerCase()
              .includes(search) ||
            shipment.destination
              .toLowerCase()
              .includes(search);


          const matchesStatus =
            status === 'all' ||
            (
              status === 'pending'
                ? ![
                    'delivered',
                    'cancelled'
                  ].includes(
                    shipment.backendStatus
                  )
                : shipment.status
                    .toLowerCase()
                    .replace(
                      /\s+/g,
                      '-'
                    ) === status
            );


          const matchesPriority =
            priority === 'all' ||
            shipment.priority
              .toLowerCase() ===
              priority;


          return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority
          );
        }
      );
    });


  protected readonly paginatedShipments =
    computed(() => {

      const start =
        (
          this.currentPage() -
          1
        ) *
        this.pageSize;


      return this
        .filteredShipments()
        .slice(
          start,
          start +
          this.pageSize
        );
    });


  protected readonly totalPages =
    computed(() =>
      Math.max(
        1,
        Math.ceil(
          this
            .filteredShipments()
            .length /
          this.pageSize
        )
      )
    );


  protected readonly summary =
    computed(() => {

      const list =
        this.shipments();


      return {

        total:
          list.length,


        inTransit:
          list.filter(
            (item) =>
              item.status ===
              'In Transit'
          ).length,


        delivered:
          list.filter(
            (item) =>
              item.status ===
              'Delivered'
          ).length,


        pending:
          list.filter(
            (item) =>
              ![
                'Delivered',
                'Cancelled'
              ].includes(
                item.status
              )
          ).length

      };
    });


  ngOnInit(): void {
    const title =
      this.route.snapshot.data?.['title'];

    if (typeof title === 'string' && title.trim()) {
      this.pageTitle.set(title);
    }

    const status =
      this.route.snapshot.data?.['shipmentStatus'];

    if (typeof status === 'string' && status.trim()) {
      this.statusFilter.set(status);
    }

    this.loadShipments();
  }


  /* ==========================================================
     LOAD LIVE AIR CARGO
  ========================================================== */

  protected loadShipments(): void {

    this.isLoading.set(true);

    this.errorMessage.set('');


    const query: Record<string, string | number> = {
      page: 1,
      limit: 100,
      sortBy:
        'createdAt',
      sortOrder:
        'desc'
    };

    const routeStatus =
      this.statusFilter();

    if (routeStatus !== 'all' && routeStatus !== 'pending') {
      query['status'] = this.backendStatusForFilter(routeStatus);
    }

    if (this.fromDate()) {
      query['fromDate'] = this.fromDate();
    }

    if (this.toDate()) {
      query['toDate'] = this.toDate();
    }


    this.api
      .get<ShipmentListResponse | LogisticsShipment[]>(
        '/logistics/shipments/air-cargo',
        query
      )

      .pipe(
        finalize(() =>
          this.isLoading.set(
            false
          )
        )
      )

      .subscribe({

        next: (
          result
        ) => {

          const rows =
            this.extractShipmentRows(result)
              .map(
                (
                  shipment
                ) =>
                  this.mapShipment(
                    shipment
                  )
              );


          this.shipments.set(
            this.applyRouteStatusFilter(rows)
          );


          if (
            this.currentPage() >
            this.totalPages()
          ) {

            this.currentPage.set(
              this.totalPages()
            );
          }
        },


        error: (
          error: {
            error?: {
              message?: string;
              errors?: Array<{
                message?: string;
              }>;
            };
          }
        ) => {

          this.shipments.set(
            []
          );


          this.errorMessage.set(
            error?.error
              ?.message ||
            error?.error
              ?.errors?.[0]
              ?.message ||
            'Unable to load Air Cargo shipments.'
          );
        }

      });
  }


  /* ==========================================================
     FILTERS
  ========================================================== */

  protected setSearch(
    value: string
  ): void {

    this.searchTerm.set(
      value
    );

    this.currentPage.set(
      1
    );
  }


  protected setStatus(
    value: string
  ): void {

    this.statusFilter.set(
      value
    );

    this.currentPage.set(
      1
    );
  }


  protected setPriority(
    value: string
  ): void {

    this.priorityFilter.set(
      value
    );

    this.currentPage.set(
      1
    );
  }


  protected clearFilters(): void {

    this.searchTerm.set('');

    this.statusFilter.set(
      'all'
    );

    this.priorityFilter.set(
      'all'
    );

    this.fromDate.set('');

    this.toDate.set('');

    this.currentPage.set(
      1
    );

    this.loadShipments();
  }

  protected applyDateFilter(): void {
    this.currentPage.set(1);
    this.loadShipments();
  }


  /* ==========================================================
     PAGINATION
  ========================================================== */

  protected previousPage(): void {

    if (
      this.currentPage() >
      1
    ) {

      this.currentPage.update(
        (
          page
        ) =>
          page - 1
      );
    }
  }


  protected nextPage(): void {

    if (
      this.currentPage() <
      this.totalPages()
    ) {

      this.currentPage.update(
        (
          page
        ) =>
          page + 1
      );
    }
  }


  /* ==========================================================
     VIEW
  ========================================================== */

  protected viewShipment(
    shipment: ShipmentRow
  ): void {

    const raw =
      shipment.raw;


    const details = [
      `Shipment: ${shipment.shipmentId}`,
      `Customer: ${shipment.customer}`,
      `Contact: ${shipment.contactPerson || '-'}`,
      `Mobile: ${shipment.mobile || '-'}`,
      `Route: ${shipment.origin} -> ${shipment.destination}`,
      `Airline: ${shipment.airline || '-'}`,
      `AWB: ${shipment.awbNumber || '-'}`,
      `Gross Weight: ${shipment.grossWeight} Kg`,
      `Chargeable Weight: ${shipment.chargeableWeight} Kg`,
      `Amount: ${this.formatCurrency(shipment.amount)}`,
      `Priority: ${shipment.priority}`,
      `Status: ${shipment.status}`,
      '',
      `Remarks: ${raw.remarks || '-'}`
    ].join('\n');


    window.alert(
      details
    );
  }


  /* ==========================================================
     EDIT
  ========================================================== */

  protected editShipment(
    shipment: ShipmentRow
  ): void {

    /*
     * The Air Cargo create page does not yet contain
     * an edit-mode loader.
     *
     * We pass both IDs now; the next Air Cargo edit step
     * will consume these query parameters.
     */
    void this.router.navigate(
      [
        '/logistics/air-cargo/new'
      ],
      {
        queryParams: {
          editId:
            shipment.mongoId,

          shipmentNumber:
            shipment.shipmentId
        }
      }
    );
  }


  /* ==========================================================
     DUPLICATE
  ========================================================== */

  protected duplicateShipment(
    shipment: ShipmentRow
  ): void {

    if (
      !shipment.mongoId
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Create a draft copy of ${shipment.shipmentId}?`
      );


    if (!confirmed) {
      return;
    }


    const raw =
      shipment.raw;


    const payload:
      CreateShipmentPayload = {

      shipmentMode:
        'air_cargo',

      customerName:
        raw.customerName ||
        shipment.customer,

      contactPerson:
        raw.contactPerson ||
        shipment.contactPerson,

      mobile:
        raw.mobile ||
        shipment.mobile,

      origin: {
        name:
          raw.origin?.name ||
          raw.origin?.city ||
          shipment.origin,

        city:
          raw.origin?.city ||
          raw.origin?.name ||
          shipment.origin
      },

      destination: {
        name:
          raw.destination
            ?.name ||
          raw.destination
            ?.city ||
          shipment.destination,

        city:
          raw.destination
            ?.city ||
          raw.destination
            ?.name ||
          shipment.destination
      },

      cargo: {
        description:
          raw.cargo
            ?.description ||
          '',

        grossWeight:
          this.number(
            raw.cargo
              ?.grossWeight
          ),

        chargeableWeight:
          this.number(
            raw.cargo
              ?.chargeableWeight
          )
      },

      airFreight: {
        airline:
          raw.airFreight
            ?.airline ||
          '',

        airlineOther:
          raw.airFreight
            ?.airlineOther ||
          '',

        awbNumber:
          ''
      },

      charges: {
        freightAmount:
          this.number(
            raw.charges
              ?.totalAmount
          ),

        currency:
          'INR'
      },

      status:
        'draft',

      remarks:
        `Duplicated from ${shipment.shipmentId}.\n${raw.remarks || ''}`
          .trim()
    };


    this.message.set('');

    this.errorMessage.set('');


    this.api
      .post<LogisticsShipment>(
        '/logistics/shipments',
        payload
      )

      .subscribe({

        next: (
          created
        ) => {

          const number =
            created
              ?.shipmentNumber ||
            'new draft';


          this.message.set(
            `${number} created as a draft copy.`
          );


          this.loadShipments();
        },


        error: (
          error: {
            error?: {
              message?: string;
            };
          }
        ) => {

          this.errorMessage.set(
            error?.error
              ?.message ||
            'Unable to duplicate shipment.'
          );
        }

      });
  }

  protected showAwb(
    shipment: ShipmentRow
  ): void {

    const awb =
      shipment.awbNumber &&
      shipment.awbNumber !== '-'
        ? shipment.awbNumber
        : 'AWB not entered yet';

    window.alert(
      [
        `Shipment: ${shipment.shipmentId}`,
        `Airline: ${shipment.airline || '-'}`,
        `AWB: ${awb}`,
        `Route: ${shipment.origin} -> ${shipment.destination}`
      ].join('\n')
    );
  }


  protected createInvoice(
    shipment: ShipmentRow
  ): void {

    void this.router.navigate(
      ['/logistics/invoices/new'],
      {
        queryParams: {
          shipmentId:
            shipment.mongoId,
          shipmentNumber:
            shipment.shipmentId,
          customer:
            shipment.customer,
          amount:
            shipment.amount
        }
      }
    );
  }


  protected updateStatus(
    shipment: ShipmentRow
  ): void {

    if (!shipment.mongoId) {
      return;
    }

    const nextStatus =
      window.prompt(
        'Enter status: booking_created, pickup_pending, at_warehouse, customs, loaded, in_transit, delivered, cancelled',
        shipment.backendStatus
      );

    if (!nextStatus) {
      return;
    }

    const status =
      this.backendStatusForFilter(nextStatus);

    const remarks =
      window.prompt(
        'Enter status remarks',
        `Status changed from ${shipment.status}`
      );

    if (!remarks?.trim()) {
      this.errorMessage.set('Remarks are required for status update.');
      return;
    }

    this.message.set('');
    this.errorMessage.set('');

    this.api
      .patch<LogisticsShipment>(
        `/logistics/shipments/${shipment.mongoId}/status`,
        {
          status,
          currentLocation:
            shipment.raw.currentLocation ||
            shipment.origin,
          remarks:
            remarks.trim()
        }
      )
      .subscribe({
        next: () => {
          this.message.set(`${shipment.shipmentId} status updated.`);
          this.loadShipments();
        },
        error: (error: { error?: { message?: string; errors?: Array<{ message?: string }> } }) => {
          this.errorMessage.set(
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Unable to update shipment status.'
          );
        }
      });
  }

  /* ==========================================================
     DELETE / SOFT DELETE
  ========================================================== */

  protected deleteShipment(
    shipment: ShipmentRow
  ): void {

    if (
      !shipment.mongoId ||
      this.isDeleting()
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Delete ${shipment.shipmentId}? This will remove it from the active shipment register.`
      );


    if (!confirmed) {
      return;
    }


    this.isDeleting.set(
      true
    );

    this.message.set('');

    this.errorMessage.set('');


    this.api
      .delete<DeleteShipmentResponse>(
        `/logistics/shipments/${shipment.mongoId}`
      )

      .pipe(
        finalize(() =>
          this.isDeleting.set(
            false
          )
        )
      )

      .subscribe({

        next: () => {

          this.message.set(
            `${shipment.shipmentId} deleted successfully.`
          );


          this.shipments.update(
            (
              current
            ) =>
              current.filter(
                (
                  row
                ) =>
                  row.mongoId !==
                  shipment.mongoId
              )
          );


          if (
            this.currentPage() >
            this.totalPages()
          ) {

            this.currentPage.set(
              this.totalPages()
            );
          }
        },


        error: (
          error: {
            error?: {
              message?: string;
              errors?: Array<{
                message?: string;
              }>;
            };
          }
        ) => {

          this.errorMessage.set(
            error?.error
              ?.message ||
            error?.error
              ?.errors?.[0]
              ?.message ||
            'Unable to delete shipment.'
          );
        }

      });
  }


  /* ==========================================================
     NEW
  ========================================================== */

  protected newShipment(): void {

    void this.router.navigate(
      [
        '/logistics/air-cargo/new'
      ]
    );
  }


  /* ==========================================================
     EXPORT CSV
  ========================================================== */

  protected exportShipments(): void {

    const rows =
      this.filteredShipments();


    if (
      !rows.length
    ) {

      this.errorMessage.set(
        'There are no Air Cargo shipments to export.'
      );

      return;
    }


    const header = [
      'Shipment ID',
      'Booking Date',
      'Customer',
      'Contact Person',
      'Mobile',
      'Origin',
      'Destination',
      'Airline',
      'AWB Number',
      'Gross Weight Kg',
      'Chargeable Weight Kg',
      'Amount INR',
      'Priority',
      'Status'
    ];


    const body =
      rows.map(
        (
          shipment
        ) => [
          shipment.shipmentId,
          shipment.bookingDate,
          shipment.customer,
          shipment.contactPerson,
          shipment.mobile,
          shipment.origin,
          shipment.destination,
          shipment.airline,
          shipment.awbNumber,
          shipment.grossWeight,
          shipment.chargeableWeight,
          shipment.amount,
          shipment.priority,
          shipment.status
        ]
      );


    const csv =
      [
        header,
        ...body
      ]
        .map(
          (
            row
          ) =>
            row
              .map(
                (
                  value
                ) =>
                  this.csvValue(
                    value
                  )
              )
              .join(',')
        )
        .join('\n');


    const blob =
      new Blob(
        [
          '\ufeff',
          csv
        ],
        {
          type:
            'text/csv;charset=utf-8;'
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const anchor =
      document.createElement(
        'a'
      );


    anchor.href =
      url;

    anchor.download =
      `air-cargo-shipments-${this.today()}.csv`;


    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url
    );
  }


  /* ==========================================================
     STATUS / PRIORITY CSS
  ========================================================== */

  protected statusClass(
    status: ShipmentStatus
  ): string {

    return status
      .toLowerCase()
      .replace(
        /\s+/g,
        '-'
      );
  }


  protected priorityClass(
    priority:
      ShipmentRow['priority']
  ): string {

    return priority
      .toLowerCase();
  }


  protected formatCurrency(
    value: number
  ): string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style:
          'currency',

        currency:
          'INR',

        maximumFractionDigits:
          0
      }
    ).format(
      value
    );
  }


  /* ==========================================================
     BACKEND -> EXISTING TABLE MODEL
  ========================================================== */

  private mapShipment(
    shipment:
      LogisticsShipment
  ): ShipmentRow {

    const backendStatus =
      shipment.status ||
      'draft';


    return {

      mongoId:
        shipment._id ||
        '',


      shipmentId:
        shipment
          .shipmentNumber ||
        '-',


      bookingDate:
        this.formatDate(
          shipment.createdAt
        ),


      customer:
        shipment
          .customerName ||
        '-',


      contactPerson:
        shipment
          .contactPerson ||
        '-',


      mobile:
        shipment.mobile ||
        '-',


      origin:
        shipment.origin
          ?.name ||
        shipment.origin
          ?.city ||
        '-',


      destination:
        shipment.destination
          ?.name ||
        shipment.destination
          ?.city ||
        '-',


      airline:
        shipment.airFreight
          ?.airline ===
          'other'
          ? (
              shipment.airFreight
                ?.airlineOther ||
              'Other'
            )
          : (
              shipment.airFreight
                ?.airline ||
              '-'
            ),


      awbNumber:
        shipment.airFreight
          ?.awbNumber ||
        '-',


      grossWeight:
        this.number(
          shipment.cargo
            ?.grossWeight
        ),


      chargeableWeight:
        this.number(
          shipment.cargo
            ?.chargeableWeight
        ),


      amount:
        this.number(
          shipment.charges
            ?.totalAmount
        ),


      status:
        this.statusLabel(
          backendStatus
        ),


      priority:
        this.extractPriority(
          shipment.cargo
            ?.description
        ),


      backendStatus,

      raw:
        shipment
    };
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

  private applyRouteStatusFilter(
    rows: ShipmentRow[]
  ): ShipmentRow[] {

    const status =
      this.statusFilter();

    if (status === 'all') {
      return rows;
    }

    if (status === 'pending') {
      return rows.filter(
        (shipment) =>
          ![
            'delivered',
            'cancelled'
          ].includes(
            shipment.backendStatus
          )
      );
    }

    const backendStatus =
      this.backendStatusForFilter(status);

    return rows.filter(
      (shipment) =>
        shipment.backendStatus ===
        backendStatus
    );
  }


  private backendStatusForFilter(
    status: string
  ): BackendShipmentStatus {

    const normalized =
      status
        .trim()
        .toLowerCase()
        .replace(/-/g, '_');

    const map:
      Record<string, BackendShipmentStatus> = {
      all:
        'draft',
      pending:
        'booking_created',
      booking_created:
        'booking_created',
      pickup_pending:
        'pickup_pending',
      at_warehouse:
        'at_warehouse',
      customs:
        'customs',
      airline_booked:
        'loaded',
      in_transit:
        'in_transit',
      delivered:
        'delivered',
      cancelled:
        'cancelled'
    };

    return map[normalized] ||
      'booking_created';
  }

  private statusLabel(
    status:
      BackendShipmentStatus
  ): ShipmentStatus {

    switch (
      status
    ) {

      case 'booking_created':
      case 'draft':
        return 'Booking Created';


      case 'pickup_pending':
      case 'picked_up':
        return 'Pickup Pending';


      case 'at_warehouse':
        return 'At Warehouse';


      case 'documents_pending':
      case 'customs':
      case 'hold':
        return 'Customs';


      case 'loaded':
        return 'Airline Booked';


      case 'in_transit':
      case 'arrived':
      case 'out_for_delivery':
        return 'In Transit';


      case 'delivered':
        return 'Delivered';


      case 'cancelled':
        return 'Cancelled';


      case 'other':
      default:
        return 'Booking Created';
    }
  }


  private extractPriority(
    description:
      string | undefined
  ):
    | 'Normal'
    | 'Express'
    | 'Urgent' {

    const value =
      String(
        description ||
        ''
      );


    const match =
      value.match(
        /Priority:\s*(normal|express|urgent)/i
      );


    switch (
      match?.[1]
        ?.toLowerCase()
    ) {

      case 'express':
        return 'Express';


      case 'urgent':
        return 'Urgent';


      case 'normal':
      default:
        return 'Normal';
    }
  }


  private formatDate(
    value:
      string | undefined
  ): string {

    if (!value) {
      return '-';
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }


    return new Intl
      .DateTimeFormat(
        'en-GB',
        {
          day:
            '2-digit',

          month:
            '2-digit',

          year:
            'numeric'
        }
      )
      .format(
        date
      );
  }


  private number(
    value:
      unknown
  ): number {

    const parsed =
      Number(
        value
      );


    return Number.isFinite(
      parsed
    )
      ? parsed
      : 0;
  }


  private csvValue(
    value:
      unknown
  ): string {

    const normalized =
      String(
        value ??
        ''
      )
        .replace(
          /"/g,
          '""'
        );


    return `"${normalized}"`;
  }


  private today(): string {

    return new Date()
      .toISOString()
      .slice(
        0,
        10
      );
  }
}







