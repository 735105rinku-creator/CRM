import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';


interface Option {
  label: string;
  value: string;
}


interface ReportRow {
  id: string;

  shipmentNo: string;

  date: string;

  customer: string;

  vendor: string;

  mode: string;

  origin: string;

  destination: string;

  invoiceAmount: number;

  receivedAmount: number;

  outstandingAmount: number;

  vendorAmount: number;

  vendorPaid: number;

  vendorBalance: number;

  gstAmount: number;

  status: string;
}


interface ReportApi {
  reportType?: string;

  rows?: ReportRow[];

  summary?: {
    shipments: number;

    sales: number;

    received: number;

    outstanding: number;

    vendorPayable: number;

    gst: number;
  };

  modeSummary?: {
    air: number;

    sea: number;

    road: number;
  };

  deliverySummary?: {
    delivered: number;

    transit: number;

    customs: number;

    cancelled: number;
  };
}


@Component({
  selector: 'app-logistics-reports',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './logistics-reports.component.html',

  styleUrl:
    './logistics-reports.component.scss'
})
export class LogisticsReportsComponent
  implements OnInit {

  private readonly api =
    inject(ApiService);

  private readonly route =
    inject(ActivatedRoute);


  /* ============================================================
     FILTERS
  ============================================================ */

  protected readonly reportType =
    signal(
      'shipment-performance'
    );

  protected readonly search =
    signal('');

  protected readonly modeFilter =
    signal('all');

  protected readonly statusFilter =
    signal('all');

  protected readonly dateFrom =
    signal('');

  protected readonly dateTo =
    signal('');

  protected readonly isLoading =
    signal(false);

  protected readonly records =
    signal<ReportRow[]>([]);


  /* ============================================================
     OPTIONS
  ============================================================ */

  protected readonly reportTypes:
    Option[] = [

      {
        label:
          'Shipment Performance Report',

        value:
          'shipment-performance'
      },

      {
        label:
          'Sales Report',

        value:
          'sales'
      },

      {
        label:
          'Outstanding Report',

        value:
          'outstanding'
      },

      {
        label:
          'GST Report',

        value:
          'gst'
      },

      {
        label:
          'Vendor Payment Report',

        value:
          'vendor-payment'
      }
    ];


  protected readonly shipmentModes:
    Option[] = [

      {
        label:
          'Air Cargo',

        value:
          'air-cargo'
      },

      {
        label:
          'Sea Freight',

        value:
          'sea-freight'
      },

      {
        label:
          'Road Transport',

        value:
          'road'
      }
    ];


  protected readonly shipmentStatuses:
    Option[] = [

      {
        label:
          'Booking Created',

        value:
          'booking-created'
      },

      {
        label:
          'Customs',

        value:
          'customs'
      },

      {
        label:
          'In Transit',

        value:
          'in-transit'
      },

      {
        label:
          'Delivered',

        value:
          'delivered'
      },

      {
        label:
          'Cancelled',

        value:
          'cancelled'
      }
    ];


  /* ============================================================
     COMPUTED RECORDS
  ============================================================ */

  protected readonly filteredRecords =
    computed(
      () =>
        this.records()
    );


  protected readonly summary =
    computed(
      () => {

        const r =
          this.records();

        return {

          shipments:
            r.length,

          sales:
            r.reduce(
              (
                sum,
                row
              ) =>
                sum +
                this.number(
                  row.invoiceAmount
                ),
              0
            ),

          received:
            r.reduce(
              (
                sum,
                row
              ) =>
                sum +
                this.number(
                  row.receivedAmount
                ),
              0
            ),

          outstanding:
            r.reduce(
              (
                sum,
                row
              ) =>
                sum +
                this.number(
                  row.outstandingAmount
                ),
              0
            ),

          vendorPayable:
            r.reduce(
              (
                sum,
                row
              ) =>
                sum +
                this.number(
                  row.vendorBalance
                ),
              0
            ),

          gst:
            r.reduce(
              (
                sum,
                row
              ) =>
                sum +
                this.number(
                  row.gstAmount
                ),
              0
            )
        };
      }
    );


  protected readonly modeSummary =
    computed(
      () => ({

        air:
          this.records()
            .filter(
              row =>
                row.mode ===
                'air-cargo'
            )
            .length,

        sea:
          this.records()
            .filter(
              row =>
                row.mode ===
                'sea-freight'
            )
            .length,

        road:
          this.records()
            .filter(
              row =>
                row.mode ===
                'road'
            )
            .length
      })
    );


  protected readonly deliverySummary =
    computed(
      () => ({

        delivered:
          this.records()
            .filter(
              row =>
                row.status ===
                'delivered'
            )
            .length,

        transit:
          this.records()
            .filter(
              row =>
                row.status ===
                'in-transit'
            )
            .length,

        customs:
          this.records()
            .filter(
              row =>
                row.status ===
                'customs'
            )
            .length,

        cancelled:
          this.records()
            .filter(
              row =>
                row.status ===
                'cancelled'
            )
            .length
      })
    );


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {

    const fromRoute =
      this.route
        .snapshot
        .data[
      'reportType'
      ];


    if (fromRoute) {

      this.reportType.set(
        String(fromRoute)
      );
    }


    this.loadReport();
  }


  /* ============================================================
     REPORT TYPE
  ============================================================ */

  protected setReportType(
    value: string
  ): void {

    this.reportType.set(
      value
    );


    this.loadReport();
  }


  /* ============================================================
     CLEAR FILTERS
  ============================================================ */

  protected clearFilters():
    void {

    this.search.set('');

    this.modeFilter.set(
      'all'
    );

    this.statusFilter.set(
      'all'
    );

    this.dateFrom.set('');

    this.dateTo.set('');


    this.loadReport();
  }


  /* ============================================================
     LOAD REPORT
  ============================================================ */

  protected loadReport():
    void {

    this.isLoading.set(
      true
    );


    this.api
      .get<ReportApi>(
        '/logistics/reports',
        this.queryParams()
      )

      .pipe(
        finalize(
          () =>
            this.isLoading
              .set(false)
        )
      )

      .subscribe({

        next:
          (
            response
          ) => {

            this.records.set(
              response?.rows ||
              []
            );
          },


        error:
          () => {

            this.records.set(
              []
            );
          }

      });
  }


  /* ============================================================
     EXPORT
  ============================================================ */

  protected exportExcel():
    void {

    this.api
      .getBlob(
        '/logistics/reports/export.csv',
        this.queryParams()
      )
      .subscribe({

        next:
          (
            blob
          ) => {

            const url =
              URL.createObjectURL(
                blob
              );


            const link =
              document.createElement(
                'a'
              );


            const date =
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                );


            link.href =
              url;

            link.download =
              `logistics-${this.reportType()}-${date}.csv`;


            link.style.display =
              'none';


            document.body
              .appendChild(
                link
              );


            link.click();

            link.remove();


            setTimeout(
              () =>
                URL.revokeObjectURL(
                  url
                ),
              0
            );
          },


        error:
          (
            error
          ) => {

            console.error(
              'Unable to export logistics report',
              error
            );
          }

      });
  }


  protected exportPdf():
    void {

    window.print();
  }


  protected printReport():
    void {

    window.print();
  }


  /* ============================================================
     LABEL HELPERS
  ============================================================ */

  protected reportTitle():
    string {

    return (
      this.reportTypes.find(
        item =>
          item.value ===
          this.reportType()
      )?.label ||
      'Logistics Report'
    );
  }


  protected modeLabel(
    value: string
  ): string {

    return (
      this.shipmentModes.find(
        item =>
          item.value ===
          value
      )?.label ||
      value
    );
  }


  protected statusLabel(
    value: string
  ): string {

    return (
      this.shipmentStatuses.find(
        item =>
          item.value ===
          value
      )?.label ||
      value
    );
  }


  /* ============================================================
     RECEIVED PERCENTAGE
  ============================================================ */

  protected receivedPercentage(
    row: ReportRow
  ): number {

    const invoiceAmount =
      this.number(
        row.invoiceAmount
      );


    const receivedAmount =
      this.number(
        row.receivedAmount
      );


    if (
      invoiceAmount <= 0
    ) {
      return 0;
    }


    return Math.min(
      100,

      Math.max(
        0,

        Math.round(
          (
            receivedAmount /
            invoiceAmount
          ) *
          100
        )
      )
    );
  }


  /* ============================================================
     VENDOR PAID PERCENTAGE
  ============================================================ */

  protected vendorPaidPercentage(
    row: ReportRow
  ): number {

    const vendorAmount =
      this.number(
        row.vendorAmount
      );


    const vendorPaid =
      this.number(
        row.vendorPaid
      );


    if (
      vendorAmount <= 0
    ) {
      return 0;
    }


    return Math.min(
      100,

      Math.max(
        0,

        Math.round(
          (
            vendorPaid /
            vendorAmount
          ) *
          100
        )
      )
    );
  }


  /* ============================================================
     FORMAT CURRENCY
  ============================================================ */

  protected formatCurrency(
    value: number
  ): string {

    return new Intl
      .NumberFormat(
        'en-IN',
        {
          style:
            'currency',

          currency:
            'INR',

          maximumFractionDigits:
            2
        }
      )
      .format(
        this.number(
          value
        )
      );
  }


  /* ============================================================
     FORMAT DATE
  ============================================================ */

  protected formatDate(
    value: string
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

      return value;
    }


    return new Intl
      .DateTimeFormat(
        'en-GB'
      )
      .format(
        date
      );
  }


  /* ============================================================
     QUERY PARAMS
  ============================================================ */

  private queryParams():
    Record<
      string,
      string
    > {

    return {

      reportType:
        this.reportType(),

      search:
        this.search()
          .trim(),

      mode:
        this.modeFilter(),

      status:
        this.statusFilter(),

      fromDate:
        this.dateFrom(),

      toDate:
        this.dateTo()
    };
  }


  /* ============================================================
     NUMBER HELPER
  ============================================================ */

  private number(
    value: unknown
  ): number {

    const numberValue =
      Number(
        value
      );


    return Number.isFinite(
      numberValue
    )
      ? numberValue
      : 0;
  }

}