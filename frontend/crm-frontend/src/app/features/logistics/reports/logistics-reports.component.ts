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


interface ReportEmployeeOption {
  value: string;
  employeeId: string;
  name: string;
  employeeCode: string;
  label: string;
}


interface ReportScope {
  type: 'own' | 'department';

  label: string;

  description: string;

  scopeLabel: string;

  canFilterEmployees: boolean;

  selectedEmployeeId: string;
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

  createdByEmployeeId: string;

  createdByName: string;

  createdByEmployeeCode: string;

  createdByDesignation: string;

  createdByDisplay: string;
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


  protected readonly employeeFilter =
    signal('all');


  protected readonly isLoading =
    signal(false);


  protected readonly errorMessage =
    signal('');


  protected readonly records =
    signal<ReportRow[]>([]);


  /* ============================================================
     REPORT SCOPE
  ============================================================ */

  protected readonly reportScope =
    signal<ReportScope>({
      type:
        'own',

      label:
        'My Logistics Report',

      description:
        'Only records from your Logistics workspace.',

      scopeLabel:
        'My Workspace',

      canFilterEmployees:
        false,

      selectedEmployeeId:
        ''
    });


  protected readonly employeeOptions =
    signal<ReportEmployeeOption[]>([]);


  protected readonly isDepartmentReport =
    computed(
      () =>
        this.reportScope().type ===
        'department'
    );


  protected readonly canFilterEmployees =
    computed(
      () =>
        this.reportScope()
          .canFilterEmployees ===
        true
    );


  protected readonly scopeTitle =
    computed(
      () =>
        this.reportScope().label ||
        (
          this.isDepartmentReport()
            ? 'Logistics Department Report'
            : 'My Logistics Report'
        )
    );


  protected readonly scopeDescription =
    computed(
      () =>
        this.reportScope().description ||
        (
          this.isDepartmentReport()
            ? 'Includes records created by Logistics employees.'
            : 'Only records from your Logistics workspace.'
        )
    );


  protected readonly scopeLabel =
    computed(
      () =>
        this.reportScope().scopeLabel ||
        (
          this.isDepartmentReport()
            ? 'Department'
            : 'My Workspace'
        )
    );


  /* ============================================================
     BACKEND SUMMARY
  ============================================================ */

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
     RECORDS
  ============================================================ */

  protected readonly filteredRecords =
    computed(
      () =>
        this.records()
    );


  /* ============================================================
     SUMMARY
  ============================================================ */

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


  /* ============================================================
     MODE SUMMARY
  ============================================================ */

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


  /* ============================================================
     DELIVERY SUMMARY
  ============================================================ */

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
     EMPLOYEE FILTER
  ============================================================ */

  protected setEmployeeFilter(
    value: string
  ): void {

    if (
      !this.canFilterEmployees()
    ) {

      return;
    }


    this.employeeFilter.set(
      value ||
      'all'
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


    this.employeeFilter.set(
      'all'
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
          response => {

            const payload =
              this.extractReportPayload(
                response
              );


            const rows =
              this.extractReportRows(
                response
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


            this.applyScope(
              payload
            );


            this.employeeOptions.set(
              this.extractEmployeeOptions(
                payload
              )
            );
          },


        error:
          error => {

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


            this.employeeOptions.set(
              []
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
     EXCEL / CSV
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
          blob => {

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
          error => {

            console.error(
              'Unable to export Logistics report:',
              error
            );


            const message =
              error?.error?.message ||
              error?.message ||
              'Unable to export Logistics report.';


            window.alert(
              message
            );
          }

      });
  }


  /* ============================================================
     PDF
  ============================================================ */

  protected exportPdf():
    void {

    this.openPrintableReport(
      'pdf'
    );
  }


  /* ============================================================
     PRINT
  ============================================================ */

  protected printReport():
    void {

    this.openPrintableReport(
      'print'
    );
  }


  /* ============================================================
     PROFESSIONAL PRINT / PDF DOCUMENT
  ============================================================ */

  private openPrintableReport(
    mode:
      'pdf' |
      'print'
  ): void {

    const popup =
      window.open(
        '',
        '_blank',
        'width=1300,height=900'
      );


    if (!popup) {

      window.alert(
        'Please allow pop-ups to print or save the report as PDF.'
      );

      return;
    }


    const html =
      this.buildPrintableReportHtml(
        mode
      );


    popup.document.open();

    popup.document.write(
      html
    );

    popup.document.close();


    popup.focus();


    setTimeout(
      () => {

        popup.print();

      },
      350
    );
  }


  /* ============================================================
     PRINTABLE REPORT HTML
  ============================================================ */

  private buildPrintableReportHtml(
    mode:
      'pdf' |
      'print'
  ): string {

    const title =
      this.reportTitle();


    const generatedAt =
      new Intl.DateTimeFormat(
        'en-IN',
        {
          dateStyle:
            'medium',

          timeStyle:
            'short'
        }
      )
        .format(
          new Date()
        );


    const selectedEmployee =
      this.selectedEmployeeLabel();


    const filterText =
      this.printFilterDescription();


    const summary =
      this.summary();


    const table =
      this.buildPrintableTable();


    const documentTitle =
      mode ===
        'pdf'
        ? `${title} - PDF`
        : `${title} - Print`;


    return `
<!DOCTYPE html>
<html>
<head>

  <meta charset="utf-8">

  <title>
    ${this.escapeHtml(documentTitle)}
  </title>

  <style>

    @page {
      size: A4 landscape;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;

      background: #ffffff;

      color: #172033;

      font-family:
        Arial,
        Helvetica,
        sans-serif;
    }

    body {
      padding: 8px;
    }

    .report-document {
      width: 100%;

      margin: 0 auto;
    }

    .report-header {
      display: flex;

      justify-content: space-between;
      align-items: flex-start;

      gap: 24px;

      padding-bottom: 16px;

      border-bottom:
        2px solid #c9a86a;
    }

    .company {
      margin-bottom: 5px;

      color: #98703a;

      font-size: 11px;
      font-weight: 800;

      letter-spacing: 1.4px;

      text-transform: uppercase;
    }

    h1 {
      margin:
        0
        0
        5px;

      color: #07111f;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 24px;
    }

    .subtitle {
      margin: 0;

      color: #6f7b89;

      font-size: 11px;
    }

    .header-meta {
      min-width: 250px;

      font-size: 10px;
      line-height: 1.7;

      text-align: right;
    }

    .header-meta strong {
      color: #07111f;
    }

    .scope-panel {
      display: grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );

      gap: 10px;

      margin:
        14px
        0;
    }

    .scope-item {
      padding:
        9px
        11px;

      border:
        1px solid #dfe4ea;

      border-radius:
        7px;

      background:
        #f7f9fb;
    }

    .scope-item small {
      display: block;

      margin-bottom: 3px;

      color: #7e8995;

      font-size: 8px;
      font-weight: 700;

      text-transform: uppercase;

      letter-spacing: 0.5px;
    }

    .scope-item strong {
      color: #132034;

      font-size: 10px;
    }

    .filters {
      margin-bottom: 14px;

      padding:
        9px
        11px;

      border:
        1px solid #e4e8ed;

      border-radius:
        7px;

      color: #697584;

      font-size: 9px;

      line-height: 1.5;
    }

    .summary-grid {
      display: grid;

      grid-template-columns:
        repeat(
          6,
          minmax(0, 1fr)
        );

      gap: 8px;

      margin-bottom: 16px;
    }

    .summary-card {
      padding:
        9px;

      border:
        1px solid #dfe4ea;

      border-radius:
        7px;

      background:
        #fafbfc;
    }

    .summary-card small {
      display: block;

      margin-bottom: 5px;

      color: #7d8895;

      font-size: 8px;
    }

    .summary-card strong {
      display: block;

      color: #07111f;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 12px;
    }

    .table-title {
      display: flex;

      justify-content: space-between;
      align-items: center;

      margin-bottom: 7px;
    }

    .table-title h2 {
      margin: 0;

      color: #07111f;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 14px;
    }

    .table-title span {
      color: #7b8795;

      font-size: 9px;
    }

    table {
      width: 100%;

      border-collapse:
        collapse;

      table-layout:
        auto;
    }

    thead {
      display:
        table-header-group;
    }

    tr {
      page-break-inside:
        avoid;
    }

    th,
    td {
      padding:
        7px
        6px;

      border:
        1px solid #dde2e7;

      vertical-align:
        top;

      text-align:
        left;
    }

    th {
      background:
        #07111f;

      color:
        #ffffff;

      font-size:
        7.5px;

      font-weight:
        700;

      text-transform:
        uppercase;

      white-space:
        nowrap;
    }

    td {
      color:
        #3f4d5d;

      font-size:
        8px;

      line-height:
        1.4;
    }

    tbody tr:nth-child(even) {
      background:
        #f7f9fb;
    }

    .employee strong {
      display:
        block;

      color:
        #07111f;
    }

    .employee small {
      color:
        #98703a;
    }

    .money {
      white-space:
        nowrap;
    }

    .positive {
      color:
        #2f7454;

      font-weight:
        700;
    }

    .negative {
      color:
        #9e3d43;

      font-weight:
        700;
    }

    .footer {
      margin-top:
        14px;

      padding-top:
        8px;

      border-top:
        1px solid #dfe4ea;

      color:
        #8994a0;

      font-size:
        8px;

      text-align:
        center;
    }

    .screen-note {
      margin-bottom:
        12px;

      padding:
        10px;

      border:
        1px solid #ead8b6;

      border-radius:
        7px;

      background:
        #fffaf1;

      color:
        #7d6238;

      font-size:
        10px;

      text-align:
        center;
    }

    @media print {

      body {
        padding:
          0;
      }

      .screen-note {
        display:
          none;
      }

    }

  </style>

</head>

<body>

  <div class="report-document">

    ${
      mode ===
        'pdf'
        ? `
          <div class="screen-note">
            In the print dialog choose
            <strong>Save as PDF</strong>
            as the destination.
          </div>
        `
        : ''
    }

    <header class="report-header">

      <div>

        <div class="company">
          OPAS BIZZ PRIVATE LIMITED
        </div>

        <h1>
          ${this.escapeHtml(title)}
        </h1>

        <p class="subtitle">
          Logistics Department Report
        </p>

      </div>

      <div class="header-meta">

        <div>
          <strong>Generated:</strong>
          ${this.escapeHtml(generatedAt)}
        </div>

        <div>
          <strong>Scope:</strong>
          ${this.escapeHtml(this.scopeLabel())}
        </div>

        <div>
          <strong>Records:</strong>
          ${this.filteredRecords().length}
        </div>

      </div>

    </header>


    <section class="scope-panel">

      <div class="scope-item">

        <small>
          Report Scope
        </small>

        <strong>
          ${this.escapeHtml(this.scopeTitle())}
        </strong>

      </div>


      <div class="scope-item">

        <small>
          Employee
        </small>

        <strong>
          ${this.escapeHtml(selectedEmployee)}
        </strong>

      </div>


      <div class="scope-item">

        <small>
          Report Type
        </small>

        <strong>
          ${this.escapeHtml(title)}
        </strong>

      </div>

    </section>


    <div class="filters">

      <strong>
        Applied Filters:
      </strong>

      ${this.escapeHtml(filterText)}

    </div>


    <section class="summary-grid">

      <div class="summary-card">

        <small>
          Shipments
        </small>

        <strong>
          ${summary.shipments}
        </strong>

      </div>


      <div class="summary-card">

        <small>
          Total Sales
        </small>

        <strong>
          ${this.escapeHtml(
            this.formatCurrency(
              summary.sales
            )
          )}
        </strong>

      </div>


      <div class="summary-card">

        <small>
          Amount Received
        </small>

        <strong>
          ${this.escapeHtml(
            this.formatCurrency(
              summary.received
            )
          )}
        </strong>

      </div>


      <div class="summary-card">

        <small>
          Outstanding
        </small>

        <strong>
          ${this.escapeHtml(
            this.formatCurrency(
              summary.outstanding
            )
          )}
        </strong>

      </div>


      <div class="summary-card">

        <small>
          Vendor Payable
        </small>

        <strong>
          ${this.escapeHtml(
            this.formatCurrency(
              summary.vendorPayable
            )
          )}
        </strong>

      </div>


      <div class="summary-card">

        <small>
          GST
        </small>

        <strong>
          ${this.escapeHtml(
            this.formatCurrency(
              summary.gst
            )
          )}
        </strong>

      </div>

    </section>


    <section>

      <div class="table-title">

        <h2>
          Report Result
        </h2>

        <span>
          ${this.filteredRecords().length}
          records
        </span>

      </div>

      ${table}

    </section>


    <footer class="footer">
      OPAS BIZZ PRIVATE LIMITED • Logistics Department •
      ${this.escapeHtml(title)}
    </footer>

  </div>

</body>
</html>
    `;
  }


  /* ============================================================
     PRINT TABLE
  ============================================================ */

  private buildPrintableTable():
    string {

    const rows =
      this.filteredRecords();


    if (
      !rows.length
    ) {

      return `
        <div
          style="
            padding:30px;
            border:1px solid #dde2e7;
            text-align:center;
            font-size:11px;
            color:#7d8997;
          "
        >
          No report data found.
        </div>
      `;
    }


    switch (
      this.reportType()
    ) {

      case 'sales':

        return this.salesPrintTable(
          rows
        );


      case 'outstanding':

        return this.outstandingPrintTable(
          rows
        );


      case 'gst':

        return this.gstPrintTable(
          rows
        );


      case 'vendor-payment':

        return this.vendorPaymentPrintTable(
          rows
        );


      default:

        return this.shipmentPrintTable(
          rows
        );
    }
  }


  /* ============================================================
     SHIPMENT TABLE
  ============================================================ */

  private shipmentPrintTable(
    rows: ReportRow[]
  ): string {

    return `
      <table>

        <thead>
          <tr>
            <th>Shipment</th>
            <th>Date</th>
            <th>Employee</th>
            <th>Customer</th>
            <th>Mode</th>
            <th>Route</th>
            <th>Invoice Value</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          ${rows
            .map(
              row => `
                <tr>

                  <td>
                    <strong>
                      ${this.escapeHtml(row.shipmentNo)}
                    </strong>
                  </td>

                  <td>
                    ${this.escapeHtml(
                      this.formatDate(
                        row.date
                      )
                    )}
                  </td>

                  <td class="employee">
                    ${this.printEmployeeCell(row)}
                  </td>

                  <td>
                    ${this.escapeHtml(row.customer)}
                  </td>

                  <td>
                    ${this.escapeHtml(
                      this.modeLabel(
                        row.mode
                      )
                    )}
                  </td>

                  <td>
                    ${this.escapeHtml(row.origin)}
                    →
                    ${this.escapeHtml(row.destination)}
                  </td>

                  <td class="money">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.invoiceAmount
                      )
                    )}
                  </td>

                  <td>
                    ${this.escapeHtml(
                      this.statusLabel(
                        row.status
                      )
                    )}
                  </td>

                </tr>
              `
            )
            .join('')}

        </tbody>

      </table>
    `;
  }


  /* ============================================================
     SALES TABLE
  ============================================================ */

  private salesPrintTable(
    rows: ReportRow[]
  ): string {

    return `
      <table>

        <thead>
          <tr>
            <th>Date</th>
            <th>Shipment</th>
            <th>Employee</th>
            <th>Customer</th>
            <th>Mode</th>
            <th>Invoice</th>
            <th>Received</th>
            <th>Outstanding</th>
            <th>Collection</th>
          </tr>
        </thead>

        <tbody>

          ${rows
            .map(
              row => `
                <tr>

                  <td>
                    ${this.escapeHtml(
                      this.formatDate(
                        row.date
                      )
                    )}
                  </td>

                  <td>
                    <strong>
                      ${this.escapeHtml(row.shipmentNo)}
                    </strong>
                  </td>

                  <td class="employee">
                    ${this.printEmployeeCell(row)}
                  </td>

                  <td>
                    ${this.escapeHtml(row.customer)}
                  </td>

                  <td>
                    ${this.escapeHtml(
                      this.modeLabel(
                        row.mode
                      )
                    )}
                  </td>

                  <td class="money">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.invoiceAmount
                      )
                    )}
                  </td>

                  <td class="money positive">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.receivedAmount
                      )
                    )}
                  </td>

                  <td class="money negative">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.outstandingAmount
                      )
                    )}
                  </td>

                  <td>
                    ${this.receivedPercentage(row)}%
                  </td>

                </tr>
              `
            )
            .join('')}

        </tbody>

      </table>
    `;
  }


  /* ============================================================
     OUTSTANDING TABLE
  ============================================================ */

  private outstandingPrintTable(
    rows: ReportRow[]
  ): string {

    const outstandingRows =
      rows.filter(
        row =>
          row.outstandingAmount >
          0
      );


    if (
      !outstandingRows.length
    ) {

      return `
        <div
          style="
            padding:30px;
            border:1px solid #dde2e7;
            text-align:center;
            font-size:11px;
            color:#7d8997;
          "
        >
          No outstanding records found.
        </div>
      `;
    }


    return `
      <table>

        <thead>
          <tr>
            <th>Shipment</th>
            <th>Employee</th>
            <th>Customer</th>
            <th>Invoice</th>
            <th>Received</th>
            <th>Outstanding</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          ${outstandingRows
            .map(
              row => `
                <tr>

                  <td>
                    <strong>
                      ${this.escapeHtml(row.shipmentNo)}
                    </strong>
                  </td>

                  <td class="employee">
                    ${this.printEmployeeCell(row)}
                  </td>

                  <td>
                    ${this.escapeHtml(row.customer)}
                  </td>

                  <td class="money">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.invoiceAmount
                      )
                    )}
                  </td>

                  <td class="money positive">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.receivedAmount
                      )
                    )}
                  </td>

                  <td class="money negative">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.outstandingAmount
                      )
                    )}
                  </td>

                  <td>
                    Payment Pending
                  </td>

                </tr>
              `
            )
            .join('')}

        </tbody>

      </table>
    `;
  }


  /* ============================================================
     GST TABLE
  ============================================================ */

  private gstPrintTable(
    rows: ReportRow[]
  ): string {

    return `
      <table>

        <thead>
          <tr>
            <th>Date</th>
            <th>Shipment</th>
            <th>Employee</th>
            <th>Customer</th>
            <th>Taxable Value</th>
            <th>GST Amount</th>
            <th>Total Invoice</th>
          </tr>
        </thead>

        <tbody>

          ${rows
            .map(
              row => `
                <tr>

                  <td>
                    ${this.escapeHtml(
                      this.formatDate(
                        row.date
                      )
                    )}
                  </td>

                  <td>
                    <strong>
                      ${this.escapeHtml(row.shipmentNo)}
                    </strong>
                  </td>

                  <td class="employee">
                    ${this.printEmployeeCell(row)}
                  </td>

                  <td>
                    ${this.escapeHtml(row.customer)}
                  </td>

                  <td class="money">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.invoiceAmount -
                        row.gstAmount
                      )
                    )}
                  </td>

                  <td class="money">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.gstAmount
                      )
                    )}
                  </td>

                  <td class="money">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.invoiceAmount
                      )
                    )}
                  </td>

                </tr>
              `
            )
            .join('')}

        </tbody>

      </table>
    `;
  }


  /* ============================================================
     VENDOR PAYMENT TABLE
  ============================================================ */

  private vendorPaymentPrintTable(
    rows: ReportRow[]
  ): string {

    return `
      <table>

        <thead>
          <tr>
            <th>Shipment</th>
            <th>Employee</th>
            <th>Vendor</th>
            <th>Vendor Invoice</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Payment Progress</th>
          </tr>
        </thead>

        <tbody>

          ${rows
            .map(
              row => `
                <tr>

                  <td>
                    <strong>
                      ${this.escapeHtml(row.shipmentNo)}
                    </strong>
                  </td>

                  <td class="employee">
                    ${this.printEmployeeCell(row)}
                  </td>

                  <td>
                    ${this.escapeHtml(row.vendor)}
                  </td>

                  <td class="money">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.vendorAmount
                      )
                    )}
                  </td>

                  <td class="money positive">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.vendorPaid
                      )
                    )}
                  </td>

                  <td class="money negative">
                    ${this.escapeHtml(
                      this.formatCurrency(
                        row.vendorBalance
                      )
                    )}
                  </td>

                  <td>
                    ${this.vendorPaidPercentage(row)}%
                  </td>

                </tr>
              `
            )
            .join('')}

        </tbody>

      </table>
    `;
  }


  /* ============================================================
     EMPLOYEE CELL
  ============================================================ */

  private printEmployeeCell(
    row: ReportRow
  ): string {

    const name =
      row.createdByName ||
      'Not Available';


    const code =
      row.createdByEmployeeCode ||
      '';


    return `
      <strong>
        ${this.escapeHtml(name)}
      </strong>

      ${
        code
          ? `
            <small>
              Employee Code:
              ${this.escapeHtml(code)}
            </small>
          `
          : ''
      }
    `;
  }


  /* ============================================================
     SELECTED EMPLOYEE LABEL
  ============================================================ */

  private selectedEmployeeLabel():
    string {

    if (
      !this.canFilterEmployees()
    ) {

      return (
        this.reportScope().type ===
          'own'
          ? 'Current Employee'
          : 'All Employees'
      );
    }


    const employeeId =
      this.employeeFilter();


    if (
      !employeeId ||
      employeeId ===
        'all'
    ) {

      return 'All Employees';
    }


    return (
      this.employeeOptions()
        .find(
          item =>
            item.employeeId ===
            employeeId
        )
        ?.label ||
      'Selected Employee'
    );
  }


  /* ============================================================
     FILTER DESCRIPTION
  ============================================================ */

  private printFilterDescription():
    string {

    const filters:
      string[] = [];


    const search =
      this.search()
        .trim();


    if (search) {

      filters.push(
        `Search: ${search}`
      );
    }


    if (
      this.dateFrom()
    ) {

      filters.push(
        `From: ${this.dateFrom()}`
      );
    }


    if (
      this.dateTo()
    ) {

      filters.push(
        `To: ${this.dateTo()}`
      );
    }


    if (
      this.modeFilter() !==
        'all'
    ) {

      filters.push(
        `Mode: ${this.modeLabel(
          this.modeFilter()
        )}`
      );
    }


    if (
      this.statusFilter() !==
        'all'
    ) {

      filters.push(
        `Status: ${this.statusLabel(
          this.statusFilter()
        )}`
      );
    }


    if (
      this.canFilterEmployees()
    ) {

      filters.push(
        `Employee: ${this.selectedEmployeeLabel()}`
      );
    }


    return (
      filters.length
        ? filters.join(' | ')
        : 'No additional filters applied'
    );
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


  protected employeeDisplay(
    row: ReportRow
  ): string {

    if (
      row.createdByDisplay &&
      row.createdByDisplay !==
        'Not Available'
    ) {

      return row.createdByDisplay;
    }


    if (
      row.createdByEmployeeCode &&
      row.createdByName
    ) {

      return (
        `${row.createdByName} • ` +
        row.createdByEmployeeCode
      );
    }


    return (
      row.createdByName ||
      'Not Available'
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


    if (
      this.canFilterEmployees() &&
      this.employeeFilter() &&
      this.employeeFilter() !==
        'all'
    ) {

      params[
        'employeeId'
      ] =
        this.employeeFilter();
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


    if (
      response?.data &&
      !Array.isArray(
        response.data
      )
    ) {

      if (
        response.data.rows ||
        response.data.records ||
        response.data.items ||
        response.data.summary ||
        response.data.modeSummary ||
        response.data.deliverySummary ||
        response.data.scope ||
        response.data.employeeOptions
      ) {

        return response.data;
      }


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
     REPORT SCOPE
  ============================================================ */

  private applyScope(
    payload: any
  ): void {

    const raw =
      payload?.scope;


    if (
      !raw ||
      typeof raw !==
        'object'
    ) {

      this.reportScope.set({
        type:
          'own',

        label:
          'My Logistics Report',

        description:
          'Only records from your Logistics workspace.',

        scopeLabel:
          'My Workspace',

        canFilterEmployees:
          false,

        selectedEmployeeId:
          ''
      });


      this.employeeFilter.set(
        'all'
      );


      return;
    }


    const type:
      'own' |
      'department' =
        raw.type ===
          'department'
          ? 'department'
          : 'own';


    const canFilterEmployees =
      raw.canFilterEmployees ===
      true;


    const selectedEmployeeId =
      String(
        raw.selectedEmployeeId ||
        ''
      )
        .trim();


    this.reportScope.set({

      type,

      label:
        String(
          raw.label ||
          (
            type ===
              'department'
              ? 'Logistics Department Report'
              : 'My Logistics Report'
          )
        ),

      description:
        String(
          raw.description ||
          (
            type ===
              'department'
              ? 'Includes records created by Logistics employees.'
              : 'Only records from your Logistics workspace.'
          )
        ),

      scopeLabel:
        String(
          raw.scopeLabel ||
          (
            type ===
              'department'
              ? 'Department'
              : 'My Workspace'
          )
        ),

      canFilterEmployees,

      selectedEmployeeId
    });


    if (
      !canFilterEmployees
    ) {

      this.employeeFilter.set(
        'all'
      );

      return;
    }


    this.employeeFilter.set(
      selectedEmployeeId ||
      'all'
    );
  }


  /* ============================================================
     EMPLOYEE OPTIONS
  ============================================================ */

  private extractEmployeeOptions(
    payload: any
  ): ReportEmployeeOption[] {

    if (
      !this.reportScope()
        .canFilterEmployees
    ) {

      return [];
    }


    const rawOptions =
      Array.isArray(
        payload?.employeeOptions
      )
        ? payload.employeeOptions
        : [];


    const unique =
      new Map<
        string,
        ReportEmployeeOption
      >();


    for (
      const raw of rawOptions
    ) {

      const employeeId =
        String(
          raw?.employeeId ??
          raw?.value ??
          raw?._id ??
          ''
        )
          .trim();


      if (
        !employeeId
      ) {

        continue;
      }


      const name =
        String(
          raw?.name ??
          raw?.displayName ??
          ''
        )
          .trim() ||
        'Employee';


      const employeeCode =
        String(
          raw?.employeeCode ??
          ''
        )
          .trim();


      const label =
        String(
          raw?.label ??
          ''
        )
          .trim() ||
        (
          employeeCode
            ? `${name} (${employeeCode})`
            : name
        );


      unique.set(
        employeeId,
        {
          value:
            employeeId,

          employeeId,

          name,

          employeeCode,

          label
        }
      );
    }


    return Array
      .from(
        unique.values()
      )
      .sort(
        (
          first,
          second
        ) =>
          first.label
            .localeCompare(
              second.label
            )
      );
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


    if (
      Array.isArray(
        response
      )
    ) {

      return this.normalizeRows(
        response
      );
    }


    if (
      Array.isArray(
        response.rows
      )
    ) {

      return this.normalizeRows(
        response.rows
      );
    }


    if (
      Array.isArray(
        response.records
      )
    ) {

      return this.normalizeRows(
        response.records
      );
    }


    if (
      Array.isArray(
        response.items
      )
    ) {

      return this.normalizeRows(
        response.items
      );
    }


    if (
      Array.isArray(
        response.data
      )
    ) {

      return this.normalizeRows(
        response.data
      );
    }


    if (
      Array.isArray(
        response.data?.rows
      )
    ) {

      return this.normalizeRows(
        response.data.rows
      );
    }


    if (
      Array.isArray(
        response.data?.records
      )
    ) {

      return this.normalizeRows(
        response.data.records
      );
    }


    if (
      Array.isArray(
        response.data?.items
      )
    ) {

      return this.normalizeRows(
        response.data.items
      );
    }


    if (
      Array.isArray(
        response.data?.data
      )
    ) {

      return this.normalizeRows(
        response.data.data
      );
    }


    if (
      Array.isArray(
        response.data?.data?.rows
      )
    ) {

      return this.normalizeRows(
        response.data.data.rows
      );
    }


    if (
      Array.isArray(
        response.result?.rows
      )
    ) {

      return this.normalizeRows(
        response.result.rows
      );
    }


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


        const creatorName =
          String(
            row?.createdByName ??
            row?.creatorName ??
            row?.employeeName ??
            row?.createdByEmployeeId?.displayName ??
            row?.createdByEmployeeId?.name ??
            this.personName(
              row?.createdByEmployeeId
            ) ??
            row?.createdBy?.displayName ??
            row?.createdBy?.name ??
            this.personName(
              row?.createdBy
            ) ??
            ''
          )
            .trim() ||
          'Not Available';


        const creatorEmployeeCode =
          String(
            row?.createdByEmployeeCode ??
            row?.creatorEmployeeCode ??
            row?.employeeCode ??
            row?.createdByEmployeeId?.employeeCode ??
            ''
          )
            .trim();


        const creatorEmployeeId =
          this.idText(
            row?.createdByEmployeeId ??
            row?.creatorEmployeeId ??
            row?.employeeId
          );


        const creatorDesignation =
          String(
            row?.createdByDesignation ??
            row?.designation ??
            row?.createdByEmployeeId?.designation ??
            row?.createdByEmployeeId?.organizationRole ??
            ''
          )
            .trim();


        const creatorDisplay =
          String(
            row?.createdByDisplay ??
            row?.creatorDisplay ??
            ''
          )
            .trim() ||
          (
            creatorEmployeeCode &&
            creatorName !==
              'Not Available'
              ? `${creatorName} • ${creatorEmployeeCode}`
              : creatorName
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


          invoiceAmount,


          receivedAmount,


          outstandingAmount,


          vendorAmount,


          vendorPaid,


          vendorBalance,


          gstAmount,


          status:
            this.normalizeStatus(
              String(
                row?.status ??
                row?.shipmentStatus ??
                row?.currentStatus ??
                ''
              )
            ),


          createdByEmployeeId:
            creatorEmployeeId,


          createdByName:
            creatorName,


          createdByEmployeeCode:
            creatorEmployeeCode,


          createdByDesignation:
            creatorDesignation,


          createdByDisplay:
            creatorDisplay
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
     PERSON NAME
  ============================================================ */

  private personName(
    value: any
  ): string {

    if (
      !value ||
      typeof value !==
        'object'
    ) {

      return '';
    }


    const displayName =
      String(
        value.displayName ??
        ''
      )
        .trim();


    if (
      displayName
    ) {

      return displayName;
    }


    const name =
      String(
        value.name ??
        ''
      )
        .trim();


    if (
      name
    ) {

      return name;
    }


    return [
      String(
        value.firstName ??
        ''
      )
        .trim(),

      String(
        value.lastName ??
        ''
      )
        .trim()
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      );
  }


  /* ============================================================
     ID TEXT
  ============================================================ */

  private idText(
    value: any
  ): string {

    if (!value) {

      return '';
    }


    if (
      typeof value ===
        'string'
    ) {

      return value;
    }


    return String(
      value?._id ??
      value?.id ??
      ''
    );
  }


  /* ============================================================
     ESCAPE HTML
  ============================================================ */

  private escapeHtml(
    value: unknown
  ): string {

    return String(
      value ??
      ''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
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