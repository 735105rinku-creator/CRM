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


interface ReportSummary {
  shipments: number;
  sales: number;
  received: number;
  outstanding: number;
  vendorPayable: number;
  gst: number;
}


interface ReportModeSummary {
  air: number;
  sea: number;
  road: number;
}


interface ReportDeliverySummary {
  delivered: number;
  transit: number;
  customs: number;
  cancelled: number;
}


interface ReportApi {
  reportType?: string;

  rows?: ReportRow[];

  records?: ReportRow[];

  items?: ReportRow[];

  summary?: ReportSummary;

  modeSummary?: ReportModeSummary;

  deliverySummary?: ReportDeliverySummary;

  data?: any;

  result?: any;
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


  protected readonly errorMessage =
    signal('');


  protected readonly records =
    signal<ReportRow[]>([]);


  /*
   * Backend summary is stored separately so that,
   * when backend supplies authoritative totals,
   * we can use them.
   */
  protected readonly apiSummary =
    signal<ReportSummary | null>(
      null
    );


  protected readonly apiModeSummary =
    signal<ReportModeSummary | null>(
      null
    );


  protected readonly apiDeliverySummary =
    signal<ReportDeliverySummary | null>(
      null
    );


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


  /*
   * Prefer backend summary when supplied.
   *
   * If backend does not return summary,
   * calculate it safely from rows.
   */
  protected readonly summary =
    computed(
      () => {

        const backend =
          this.apiSummary();

        if (backend) {

          return {

            shipments:
              this.number(
                backend.shipments
              ),

            sales:
              this.number(
                backend.sales
              ),

            received:
              this.number(
                backend.received
              ),

            outstanding:
              this.number(
                backend.outstanding
              ),

            vendorPayable:
              this.number(
                backend.vendorPayable
              ),

            gst:
              this.number(
                backend.gst
              )

          };
        }


        const rows =
          this.records();


        return {

          shipments:
            rows.length,


          sales:
            rows.reduce(
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
            rows.reduce(
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
            rows.reduce(
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
            rows.reduce(
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
            rows.reduce(
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
      () => {

        const backend =
          this.apiModeSummary();

        if (backend) {

          return {

            air:
              this.number(
                backend.air
              ),

            sea:
              this.number(
                backend.sea
              ),

            road:
              this.number(
                backend.road
              )

          };
        }


        return {

          air:
            this.records()
              .filter(
                row =>
                  this.normalizeMode(
                    row.mode
                  ) ===
                  'air-cargo'
              )
              .length,


          sea:
            this.records()
              .filter(
                row =>
                  this.normalizeMode(
                    row.mode
                  ) ===
                  'sea-freight'
              )
              .length,


          road:
            this.records()
              .filter(
                row =>
                  this.normalizeMode(
                    row.mode
                  ) ===
                  'road'
              )
              .length

        };
      }
    );


  protected readonly deliverySummary =
    computed(
      () => {

        const backend =
          this.apiDeliverySummary();

        if (backend) {

          return {

            delivered:
              this.number(
                backend.delivered
              ),

            transit:
              this.number(
                backend.transit
              ),

            customs:
              this.number(
                backend.customs
              ),

            cancelled:
              this.number(
                backend.cancelled
              )

          };
        }


        return {

          delivered:
            this.records()
              .filter(
                row =>
                  this.normalizeStatus(
                    row.status
                  ) ===
                  'delivered'
              )
              .length,


          transit:
            this.records()
              .filter(
                row =>
                  this.normalizeStatus(
                    row.status
                  ) ===
                  'in-transit'
              )
              .length,


          customs:
            this.records()
              .filter(
                row =>
                  this.normalizeStatus(
                    row.status
                  ) ===
                  'customs'
              )
              .length,


          cancelled:
            this.records()
              .filter(
                row =>
                  this.normalizeStatus(
                    row.status
                  ) ===
                  'cancelled'
              )
              .length

        };
      }
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
        String(
          fromRoute
        )
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

    if (!value) {

      return;

    }


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

    this.search.set(
      ''
    );


    this.modeFilter.set(
      'all'
    );


    this.statusFilter.set(
      'all'
    );


    this.dateFrom.set(
      ''
    );


    this.dateTo.set(
      ''
    );


    this.loadReport();
  }


  /* ============================================================
     LOAD REPORT
  ============================================================ */

  protected loadReport():
    void {

    if (
      this.isLoading()
    ) {

      return;

    }


    this.isLoading.set(
      true
    );


    this.errorMessage.set(
      ''
    );


    this.api
      .get<any>(
        '/logistics/reports',
        this.queryParams()
      )

      .pipe(
        finalize(
          () =>
            this.isLoading.set(
              false
            )
        )
      )

      .subscribe({

        next:
          (
            response
          ) => {

            /*
             * Keep this temporarily while debugging.
             * This will show the real API response in F12 Console.
             */
            console.log(
              'LOGISTICS REPORT RESPONSE:',
              response
            );


            const payload =
              this.extractReportPayload(
                response
              );


            const rows =
              this.extractReportRows(
                response
              );


            console.log(
              'LOGISTICS REPORT ROWS:',
              rows
            );


            this.records.set(
              rows
            );


            this.apiSummary.set(
              this.extractSummary(
                payload
              )
            );


            this.apiModeSummary.set(
              this.extractModeSummary(
                payload
              )
            );


            this.apiDeliverySummary.set(
              this.extractDeliverySummary(
                payload
              )
            );

          },


        error:
          (
            error
          ) => {

            console.error(
              'Unable to load Logistics report:',
              error
            );


            this.records.set(
              []
            );


            this.apiSummary.set(
              null
            );


            this.apiModeSummary.set(
              null
            );


            this.apiDeliverySummary.set(
              null
            );


            this.errorMessage.set(
              error?.error?.message ||
              error?.message ||
              'Unable to load Logistics report.'
            );

          }

      });
  }


  /* ============================================================
     EXPORT EXCEL / CSV
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


            window.alert(
              error?.error?.message ||
              'Unable to export Logistics report.'
            );

          }

      });
  }


  /* ============================================================
     PDF
  ============================================================ */

  protected exportPdf():
    void {

    window.print();
  }


  /* ============================================================
     PRINT
  ============================================================ */

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
      this.reportTypes
        .find(
          item =>
            item.value ===
            this.reportType()
        )
        ?.label ||

      'Logistics Report'
    );
  }


  protected modeLabel(
    value: string
  ): string {

    const normalized =
      this.normalizeMode(
        value
      );


    return (
      this.shipmentModes
        .find(
          item =>
            item.value ===
            normalized
        )
        ?.label ||

      value ||

      '-'
    );
  }


  protected statusLabel(
    value: string
  ): string {

    const normalized =
      this.normalizeStatus(
        value
      );


    return (
      this.shipmentStatuses
        .find(
          item =>
            item.value ===
            normalized
        )
        ?.label ||

      value ||

      '-'
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
      invoiceAmount <=
      0
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
      vendorAmount <=
      0
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

    const params:
      Record<
        string,
        string
      > = {

      reportType:
        this.reportType()

    };


    const search =
      this.search()
        .trim();


    /*
     * IMPORTANT:
     *
     * Do not send:
     *
     * mode=all
     * status=all
     *
     * because backend may interpret those
     * as literal database values.
     */
    if (search) {

      params[
        'search'
      ] =
        search;

    }


    if (
      this.modeFilter() &&
      this.modeFilter() !==
        'all'
    ) {

      params[
        'mode'
      ] =
        this.modeFilter();

    }


    if (
      this.statusFilter() &&
      this.statusFilter() !==
        'all'
    ) {

      params[
        'status'
      ] =
        this.statusFilter();

    }


    if (
      this.dateFrom()
    ) {

      params[
        'fromDate'
      ] =
        this.dateFrom();

    }


    if (
      this.dateTo()
    ) {

      params[
        'toDate'
      ] =
        this.dateTo();

    }


    return params;
  }


  /* ============================================================
     API PAYLOAD EXTRACTION
  ============================================================ */

  private extractReportPayload(
    response: any
  ): any {

    if (!response) {

      return null;

    }


    /*
     * ApiService may already unwrap:
     *
     * { success, data }
     *
     * or may return data directly.
     */

    if (
      response?.data &&
      !Array.isArray(
        response.data
      )
    ) {

      /*
       * Handles:
       *
       * {
       *   data: {
       *     rows: [],
       *     summary: {}
       *   }
       * }
       */

      if (
        response.data.rows ||
        response.data.records ||
        response.data.items ||
        response.data.summary ||
        response.data.modeSummary ||
        response.data.deliverySummary
      ) {

        return response.data;

      }


      /*
       * Handles:
       *
       * {
       *   data: {
       *     data: {
       *       rows: []
       *     }
       *   }
       * }
       */

      if (
        response.data.data &&
        typeof response.data.data ===
          'object'
      ) {

        return response.data.data;

      }

    }


    if (
      response?.result &&
      typeof response.result ===
        'object'
    ) {

      return response.result;

    }


    return response;
  }


  /* ============================================================
     ROW EXTRACTION
  ============================================================ */

  private extractReportRows(
    response: any
  ): ReportRow[] {

    if (!response) {

      return [];

    }


    /*
     * Direct array response.
     */
    if (
      Array.isArray(
        response
      )
    ) {

      return this.normalizeRows(
        response
      );

    }


    /*
     * Direct:
     *
     * { rows: [] }
     */
    if (
      Array.isArray(
        response.rows
      )
    ) {

      return this.normalizeRows(
        response.rows
      );

    }


    /*
     * Direct:
     *
     * { records: [] }
     */
    if (
      Array.isArray(
        response.records
      )
    ) {

      return this.normalizeRows(
        response.records
      );

    }


    /*
     * Direct:
     *
     * { items: [] }
     */
    if (
      Array.isArray(
        response.items
      )
    ) {

      return this.normalizeRows(
        response.items
      );

    }


    /*
     * {
     *   data: []
     * }
     */
    if (
      Array.isArray(
        response.data
      )
    ) {

      return this.normalizeRows(
        response.data
      );

    }


    /*
     * {
     *   data: {
     *     rows: []
     *   }
     * }
     */
    if (
      Array.isArray(
        response.data?.rows
      )
    ) {

      return this.normalizeRows(
        response.data.rows
      );

    }


    /*
     * {
     *   data: {
     *     records: []
     *   }
     * }
     */
    if (
      Array.isArray(
        response.data?.records
      )
    ) {

      return this.normalizeRows(
        response.data.records
      );

    }


    /*
     * {
     *   data: {
     *     items: []
     *   }
     * }
     */
    if (
      Array.isArray(
        response.data?.items
      )
    ) {

      return this.normalizeRows(
        response.data.items
      );

    }


    /*
     * {
     *   data: {
     *     data: []
     *   }
     * }
     */
    if (
      Array.isArray(
        response.data?.data
      )
    ) {

      return this.normalizeRows(
        response.data.data
      );

    }


    /*
     * {
     *   data: {
     *     data: {
     *       rows: []
     *     }
     *   }
     * }
     */
    if (
      Array.isArray(
        response.data?.data?.rows
      )
    ) {

      return this.normalizeRows(
        response.data.data.rows
      );

    }


    /*
     * {
     *   result: {
     *     rows: []
     *   }
     * }
     */
    if (
      Array.isArray(
        response.result?.rows
      )
    ) {

      return this.normalizeRows(
        response.result.rows
      );

    }


    /*
     * {
     *   report: {
     *     rows: []
     *   }
     * }
     */
    if (
      Array.isArray(
        response.report?.rows
      )
    ) {

      return this.normalizeRows(
        response.report.rows
      );

    }


    return [];
  }


  /* ============================================================
     NORMALIZE ROWS
  ============================================================ */

  private normalizeRows(
    rows: any[]
  ): ReportRow[] {

    return rows.map(
      (
        row,
        index
      ) => {

        const invoiceAmount =
          this.number(
            row?.invoiceAmount ??
            row?.invoiceValue ??
            row?.totalAmount ??
            row?.grandTotal ??
            row?.amount ??
            row?.invoice?.totalAmount ??
            row?.invoice?.grandTotal
          );


        const receivedAmount =
          this.number(
            row?.receivedAmount ??
            row?.amountReceived ??
            row?.paidAmount ??
            row?.received ??
            row?.invoice?.paidAmount
          );


        const outstandingAmount =
          this.number(
            row?.outstandingAmount ??
            row?.balanceAmount ??
            row?.outstanding ??
            (
              invoiceAmount -
              receivedAmount
            )
          );


        const vendorAmount =
          this.number(
            row?.vendorAmount ??
            row?.vendorPayable ??
            row?.supplierAmount ??
            row?.vendorPayment?.totalAmount
          );


        const vendorPaid =
          this.number(
            row?.vendorPaid ??
            row?.vendorPaidAmount ??
            row?.supplierPaid ??
            row?.vendorPayment?.paidAmount
          );


        const vendorBalance =
          this.number(
            row?.vendorBalance ??
            row?.vendorOutstanding ??
            row?.supplierBalance ??
            (
              vendorAmount -
              vendorPaid
            )
          );


        const gstAmount =
          this.number(
            row?.gstAmount ??
            row?.gst ??
            row?.taxAmount ??
            row?.charges?.gstAmount ??
            row?.invoice?.gstAmount
          );


        return {

          id:
            String(
              row?.id ??
              row?._id ??
              row?.shipmentId ??
              index +
                1
            ),


          shipmentNo:
            String(
              row?.shipmentNo ??
              row?.shipmentNumber ??
              row?.shipmentId?.shipmentNumber ??
              row?.shipment?.shipmentNumber ??
              '-'
            ),


          date:
            String(
              row?.date ??
              row?.shipmentDate ??
              row?.createdAt ??
              row?.invoiceDate ??
              ''
            ),


          customer:
            String(
              row?.customer ??
              row?.customerName ??
              row?.customerId?.customerName ??
              row?.customerId?.name ??
              row?.invoice?.customerName ??
              '-'
            ),


          vendor:
            String(
              row?.vendor ??
              row?.vendorName ??
              row?.vendorId?.vendorName ??
              row?.supplierName ??
              '-'
            ),


          mode:
            this.normalizeMode(
              String(
                row?.mode ??
                row?.shipmentMode ??
                row?.transportMode ??
                ''
              )
            ),


          origin:
            this.locationText(
              row?.origin ??
              row?.source ??
              row?.from
            ),


          destination:
            this.locationText(
              row?.destination ??
              row?.to
            ),


          invoiceAmount:
            invoiceAmount,


          receivedAmount:
            receivedAmount,


          outstandingAmount:
            outstandingAmount,


          vendorAmount:
            vendorAmount,


          vendorPaid:
            vendorPaid,


          vendorBalance:
            vendorBalance,


          gstAmount:
            gstAmount,


          status:
            this.normalizeStatus(
              String(
                row?.status ??
                row?.shipmentStatus ??
                row?.currentStatus ??
                ''
              )
            )

        };
      }
    );
  }


  /* ============================================================
     SUMMARY EXTRACTION
  ============================================================ */

  private extractSummary(
    payload: any
  ): ReportSummary | null {

    if (
      !payload?.summary
    ) {

      return null;

    }


    const summary =
      payload.summary;


    return {

      shipments:
        this.number(
          summary.shipments ??
          summary.totalShipments ??
          summary.count
        ),


      sales:
        this.number(
          summary.sales ??
          summary.totalSales ??
          summary.revenue
        ),


      received:
        this.number(
          summary.received ??
          summary.amountReceived ??
          summary.totalReceived
        ),


      outstanding:
        this.number(
          summary.outstanding ??
          summary.totalOutstanding
        ),


      vendorPayable:
        this.number(
          summary.vendorPayable ??
          summary.vendorOutstanding ??
          summary.totalVendorPayable
        ),


      gst:
        this.number(
          summary.gst ??
          summary.gstAmount ??
          summary.totalGst
        )

    };
  }


  /* ============================================================
     MODE SUMMARY EXTRACTION
  ============================================================ */

  private extractModeSummary(
    payload: any
  ): ReportModeSummary | null {

    if (
      !payload?.modeSummary
    ) {

      return null;

    }


    const summary =
      payload.modeSummary;


    return {

      air:
        this.number(
          summary.air ??
          summary.airCargo ??
          summary[
            'air-cargo'
          ]
        ),


      sea:
        this.number(
          summary.sea ??
          summary.seaFreight ??
          summary[
            'sea-freight'
          ]
        ),


      road:
        this.number(
          summary.road ??
          summary.roadTransport
        )

    };
  }


  /* ============================================================
     DELIVERY SUMMARY EXTRACTION
  ============================================================ */

  private extractDeliverySummary(
    payload: any
  ): ReportDeliverySummary | null {

    if (
      !payload?.deliverySummary
    ) {

      return null;

    }


    const summary =
      payload.deliverySummary;


    return {

      delivered:
        this.number(
          summary.delivered
        ),


      transit:
        this.number(
          summary.transit ??
          summary.inTransit ??
          summary[
            'in-transit'
          ]
        ),


      customs:
        this.number(
          summary.customs ??
          summary.atCustoms
        ),


      cancelled:
        this.number(
          summary.cancelled ??
          summary.canceled
        )

    };
  }


  /* ============================================================
     NORMALIZE MODE
  ============================================================ */

  private normalizeMode(
    value: unknown
  ): string {

    const normalized =
      String(
        value ??
        ''
      )
        .trim()
        .toLowerCase()
        .replace(
          /_/g,
          '-'
        )
        .replace(
          /\s+/g,
          '-'
        );


    if (
      [
        'air',
        'aircargo',
        'air-cargo',
        'air-freight'
      ]
        .includes(
          normalized
        )
    ) {

      return 'air-cargo';

    }


    if (
      [
        'sea',
        'seafreight',
        'sea-freight',
        'ocean',
        'ocean-freight'
      ]
        .includes(
          normalized
        )
    ) {

      return 'sea-freight';

    }


    if (
      [
        'road',
        'road-transport',
        'road-freight'
      ]
        .includes(
          normalized
        )
    ) {

      return 'road';

    }


    return normalized;
  }


  /* ============================================================
     NORMALIZE STATUS
  ============================================================ */

  private normalizeStatus(
    value: unknown
  ): string {

    const normalized =
      String(
        value ??
        ''
      )
        .trim()
        .toLowerCase()
        .replace(
          /_/g,
          '-'
        )
        .replace(
          /\s+/g,
          '-'
        );


    if (
      [
        'booking-created',
        'booked',
        'created',
        'booking'
      ]
        .includes(
          normalized
        )
    ) {

      return 'booking-created';

    }


    if (
      [
        'customs',
        'at-customs',
        'under-customs',
        'custom-clearance',
        'customs-clearance'
      ]
        .includes(
          normalized
        )
    ) {

      return 'customs';

    }


    if (
      [
        'in-transit',
        'transit',
        'intransit'
      ]
        .includes(
          normalized
        )
    ) {

      return 'in-transit';

    }


    if (
      [
        'delivered',
        'delivery-completed',
        'completed'
      ]
        .includes(
          normalized
        )
    ) {

      return 'delivered';

    }


    if (
      [
        'cancelled',
        'canceled'
      ]
        .includes(
          normalized
        )
    ) {

      return 'cancelled';

    }


    return normalized;
  }


  /* ============================================================
     LOCATION TEXT
  ============================================================ */

  private locationText(
    value: any
  ): string {

    if (
      value === null ||
      value === undefined
    ) {

      return '-';

    }


    if (
      typeof value ===
      'string'
    ) {

      return (
        value.trim() ||
        '-'
      );

    }


    return String(
      value?.name ??
      value?.city ??
      value?.location ??
      value?.address ??
      value?.portName ??
      value?.airportName ??
      '-'
    );
  }


  /* ============================================================
     NUMBER HELPER
  ============================================================ */

  private number(
    value: unknown
  ): number {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {

      return 0;

    }


    if (
      typeof value ===
      'string'
    ) {

      /*
       * Allows values such as:
       *
       * ₹8,250
       * 8,250.00
       */
      const cleaned =
        value
          .replace(
            /,/g,
            ''
          )
          .replace(
            /[^\d.-]/g,
            ''
          );


      const parsed =
        Number(
          cleaned
        );


      return Number.isFinite(
        parsed
      )
        ? parsed
        : 0;

    }


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