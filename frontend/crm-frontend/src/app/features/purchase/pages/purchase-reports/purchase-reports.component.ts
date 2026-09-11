import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink
} from '@angular/router';

import {
  forkJoin,
  of
} from 'rxjs';

import {
  catchError,
  finalize
} from 'rxjs/operators';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  PurchaseRequestService
} from '../../services/purchase-request.service';

import {
  VendorEnquiryService
} from '../../services/vendor-enquiry.service';

import {
  PurchaseQuotationService
} from '../../services/purchase-quotation.service';

import {
  PurchaseOrderService
} from '../../services/purchase-order.service';

import {
  GoodsReceiptService
} from '../../services/goods-receipt.service';

import {
  PurchaseReferenceService
} from '../../services/purchase-reference.service';

import {
  PurchaseInvoiceService
} from '../../services/purchase-invoice.service';

import {
  PurchaseInvoiceMetrics
} from '../../models/purchase.models';


export interface PurchaseReportSummary {
  purchaseRequests: number;

  vendorEnquiries: number;

  quotations: number;

  purchaseOrders: number;

  goodsReceipts: number;

  vendors: number;

  pendingDeliveries: number;

  overdueDeliveries: number;
}


@Component({
  selector: 'app-purchase-reports',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl:
    './purchase-reports.component.html',

  styleUrl:
    './purchase-reports.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class PurchaseReportsComponent {

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly purchaseRequestService =
    inject(PurchaseRequestService);

  private readonly vendorEnquiryService =
    inject(VendorEnquiryService);

  private readonly quotationService =
    inject(PurchaseQuotationService);

  private readonly purchaseOrderService =
    inject(PurchaseOrderService);

  private readonly goodsReceiptService =
    inject(GoodsReceiptService);

  private readonly purchaseReferenceService =
    inject(PurchaseReferenceService);

  private readonly purchaseInvoiceService =
    inject(PurchaseInvoiceService);


  /* ============================================================
     PAGE STATE
  ============================================================ */

  readonly loading =
    signal(false);

  readonly loadError =
    signal('');


  /* ============================================================
     SUMMARY
  ============================================================ */

  readonly summary =
    signal<PurchaseReportSummary>({
      purchaseRequests: 0,

      vendorEnquiries: 0,

      quotations: 0,

      purchaseOrders: 0,

      goodsReceipts: 0,

      vendors: 0,

      pendingDeliveries: 0,

      overdueDeliveries: 0
    });


  /* ============================================================
     STATUS COUNTS
  ============================================================ */

  readonly purchaseRequestStatusCounts =
    signal<Record<string, number>>({});

  readonly vendorEnquiryStatusCounts =
    signal<Record<string, number>>({});

  readonly quotationStatusCounts =
    signal<Record<string, number>>({});

  readonly purchaseOrderStatusCounts =
    signal<Record<string, number>>({});

  readonly goodsReceiptStatusCounts =
    signal<Record<string, number>>({});

  readonly invoiceMetrics =
    signal<PurchaseInvoiceMetrics>({
      total: 0,
      matched: 0,
      exceptions: 0,
      pendingVerification: 0,
      verified: 0,
      pendingHandoff: 0,
      handedOff: 0,
      invoiceTotal: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      unpaid: 0,
      partiallyPaid: 0,
      paid: 0
    });


  constructor() {

    this.loadReports();
  }


  /* ============================================================
     LOAD REPORTS
  ============================================================ */

  loadReports(): void {

    this.loading.set(true);

    this.loadError.set('');


    forkJoin({

      purchaseRequests:
        this.purchaseRequestService
          .getPurchaseRequests({
            page: 1,
            limit: 100
          })
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      vendorEnquiries:
        this.vendorEnquiryService
          .getVendorEnquiries({
            page: 1,
            limit: 100
          })
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      vendorEnquiryCounts:
        this.vendorEnquiryService
          .getStatusCounts()
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      quotations:
        this.quotationService
          .getQuotations({
            page: 1,
            limit: 100
          })
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      purchaseOrders:
        this.purchaseOrderService
          .getPurchaseOrders({
            page: 1,
            limit: 100
          })
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      purchaseOrderCounts:
        this.purchaseOrderService
          .getStatusCounts()
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      deliverySummary:
        this.purchaseOrderService
          .getDeliverySummary()
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      goodsReceipts:
        this.goodsReceiptService
          .getAll({
            page: 1,
            limit: 100
          })
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      goodsReceiptCounts:
        this.goodsReceiptService
          .getStatusCounts()
          .pipe(
            catchError(
              () => of(null)
            )
          ),


      vendors:
        this.purchaseReferenceService
          .getVendors()
          .pipe(
            catchError(
              () => of([])
            )
          ),


      invoiceMetrics:
        this.purchaseInvoiceService
          .metrics()
          .pipe(
            catchError(
              () => of(null)
            )
          )

    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(
          () => {
            this.loading.set(false);
          }
        )
      )
      .subscribe({

        next: response => {

          /* ======================================================
             PURCHASE REQUESTS
          ====================================================== */

          const purchaseRequests =
            this.extractRows(
              response.purchaseRequests
            );

          const purchaseRequestTotal =
            this.extractTotal(
              response.purchaseRequests,
              purchaseRequests.length
            );

          const purchaseRequestCounts =
            this.buildStatusCounts(
              purchaseRequests
            );

          this.purchaseRequestStatusCounts.set(
            purchaseRequestCounts
          );


          /* ======================================================
             VENDOR ENQUIRIES / RFQ
          ====================================================== */

          const vendorEnquiries =
            this.extractRows(
              response.vendorEnquiries
            );

          const vendorEnquiryApiCounts =
            this.normalizeNumericRecord(
              response.vendorEnquiryCounts
            );

          const vendorEnquiryCounts =
            Object.keys(
              vendorEnquiryApiCounts
            ).length
              ? vendorEnquiryApiCounts
              : this.buildStatusCounts(
                  vendorEnquiries
                );

          this.vendorEnquiryStatusCounts.set(
            vendorEnquiryCounts
          );

          const vendorEnquiryTotal =
            Object.keys(
              vendorEnquiryApiCounts
            ).length
              ? this.sumNumericRecord(
                  vendorEnquiryApiCounts
                )
              : this.extractTotal(
                  response.vendorEnquiries,
                  vendorEnquiries.length
                );


          /* ======================================================
             QUOTATIONS
          ====================================================== */

          const quotations =
            this.extractRows(
              response.quotations
            );

          const quotationTotal =
            this.extractTotal(
              response.quotations,
              quotations.length
            );

          this.quotationStatusCounts.set(
            this.buildStatusCounts(
              quotations
            )
          );


          /* ======================================================
             PURCHASE ORDERS
          ====================================================== */

          const purchaseOrders =
            this.extractRows(
              response.purchaseOrders
            );

          const purchaseOrderApiCounts =
            this.normalizeNumericRecord(
              response.purchaseOrderCounts
            );

          const purchaseOrderCounts =
            Object.keys(
              purchaseOrderApiCounts
            ).length
              ? purchaseOrderApiCounts
              : this.buildStatusCounts(
                  purchaseOrders
                );

          this.purchaseOrderStatusCounts.set(
            purchaseOrderCounts
          );

          const purchaseOrderTotal =
            Object.keys(
              purchaseOrderApiCounts
            ).length
              ? this.sumNumericRecord(
                  purchaseOrderApiCounts
                )
              : this.extractTotal(
                  response.purchaseOrders,
                  purchaseOrders.length
                );


          /* ======================================================
             GOODS RECEIPTS / GRN
          ====================================================== */

          const goodsReceipts =
            this.extractRows(
              response.goodsReceipts
            );

          const goodsReceiptApiCounts =
            this.normalizeNumericRecord(
              response.goodsReceiptCounts
            );

          const goodsReceiptCounts =
            Object.keys(
              goodsReceiptApiCounts
            ).length
              ? goodsReceiptApiCounts
              : this.buildStatusCounts(
                  goodsReceipts
                );

          this.goodsReceiptStatusCounts.set(
            goodsReceiptCounts
          );

          const goodsReceiptTotal =
            Object.keys(
              goodsReceiptApiCounts
            ).length
              ? this.sumNumericRecord(
                  goodsReceiptApiCounts
                )
              : this.extractTotal(
                  response.goodsReceipts,
                  goodsReceipts.length
                );


          /* ======================================================
             DELIVERY SUMMARY
          ====================================================== */

          const deliverySummary =
            this.unwrapObject(
              response.deliverySummary
            );

          const pendingDeliveries =
            this.toNumber(
              deliverySummary[
                'pendingDeliveries'
              ]
            );

          const overdueDeliveries =
            this.toNumber(
              deliverySummary[
                'overdueDeliveries'
              ]
            );


          /* ======================================================
             VENDORS
          ====================================================== */

          const vendors =
            Array.isArray(
              response.vendors
            )
              ? response.vendors
              : this.extractRows(
                  response.vendors
                );

          if (
            response.invoiceMetrics
          ) {
            this.invoiceMetrics.set(
              response.invoiceMetrics
            );
          }


          /* ======================================================
             FINAL SUMMARY
          ====================================================== */

          this.summary.set({

            purchaseRequests:
              purchaseRequestTotal,

            vendorEnquiries:
              vendorEnquiryTotal,

            quotations:
              quotationTotal,

            purchaseOrders:
              purchaseOrderTotal,

            goodsReceipts:
              goodsReceiptTotal,

            vendors:
              vendors.length,

            pendingDeliveries,

            overdueDeliveries

          });


          /* ======================================================
             PARTIAL API FAILURE
          ====================================================== */

          const hasUnavailableData =
            response.purchaseRequests === null ||
            response.vendorEnquiries === null ||
            response.quotations === null ||
            response.purchaseOrders === null ||
            response.goodsReceipts === null ||
            response.invoiceMetrics === null;


          if (
            hasUnavailableData
          ) {

            this.loadError.set(
              'Some Purchase report data could not be loaded. Available data is still shown.'
            );

          }

        },


        error: () => {

          this.loadError.set(
            'Purchase reports could not be loaded.'
          );

        }

      });

  }


  /* ============================================================
     REFRESH
  ============================================================ */

  refreshReports(): void {

    if (
      this.loading()
    ) {
      return;
    }


    this.loadReports();
  }


  /* ============================================================
     LIST ROW NORMALIZER
  ============================================================ */

  private extractRows(
    response: unknown
  ): any[] {

    if (
      Array.isArray(
        response
      )
    ) {

      return response;
    }


    if (
      !response ||
      typeof response !==
        'object'
    ) {

      return [];
    }


    const raw =
      response as Record<
        string,
        any
      >;


    if (
      Array.isArray(
        raw['rows']
      )
    ) {

      return raw['rows'];
    }


    if (
      Array.isArray(
        raw['data']
      )
    ) {

      return raw['data'];
    }


    if (
      raw['data'] &&
      typeof raw['data'] ===
        'object'
    ) {

      if (
        Array.isArray(
          raw['data']['rows']
        )
      ) {

        return raw[
          'data'
        ][
          'rows'
        ];
      }


      if (
        Array.isArray(
          raw['data']['data']
        )
      ) {

        return raw[
          'data'
        ][
          'data'
        ];
      }


      if (
        raw[
          'data'
        ][
          'data'
        ] &&
        Array.isArray(
          raw[
            'data'
          ][
            'data'
          ][
            'rows'
          ]
        )
      ) {

        return raw[
          'data'
        ][
          'data'
        ][
          'rows'
        ];
      }

    }


    return [];
  }


  /* ============================================================
     TOTAL NORMALIZER
  ============================================================ */

  private extractTotal(
    response: unknown,
    fallback:
      number
  ): number {

    if (
      !response ||
      typeof response !==
        'object'
    ) {

      return fallback;
    }


    const raw =
      response as Record<
        string,
        any
      >;


    const candidates = [

      raw[
        'total'
      ],

      raw[
        'totalItems'
      ],

      raw[
        'count'
      ],

      raw[
        'pagination'
      ]?.[
        'total'
      ],

      raw[
        'pagination'
      ]?.[
        'totalItems'
      ],

      raw[
        'data'
      ]?.[
        'total'
      ],

      raw[
        'data'
      ]?.[
        'totalItems'
      ],

      raw[
        'data'
      ]?.[
        'pagination'
      ]?.[
        'total'
      ],

      raw[
        'data'
      ]?.[
        'pagination'
      ]?.[
        'totalItems'
      ],

      raw[
        'data'
      ]?.[
        'data'
      ]?.[
        'total'
      ],

      raw[
        'data'
      ]?.[
        'data'
      ]?.[
        'totalItems'
      ],

      raw[
        'data'
      ]?.[
        'data'
      ]?.[
        'pagination'
      ]?.[
        'total'
      ],

      raw[
        'data'
      ]?.[
        'data'
      ]?.[
        'pagination'
      ]?.[
        'totalItems'
      ]

    ];


    for (
      const candidate
      of candidates
    ) {

      const value =
        Number(
          candidate
        );


      if (
        Number.isFinite(
          value
        )
      ) {

        return value;
      }

    }


    return fallback;
  }


  /* ============================================================
     STATUS COUNTS FROM LIST
  ============================================================ */

  private buildStatusCounts(
    rows: any[]
  ): Record<
    string,
    number
  > {

    const counts:
      Record<
        string,
        number
      > = {};


    for (
      const row
      of rows
    ) {

      const status =
        String(
          row?.status ??
          'unknown'
        )
          .trim()
          .toLowerCase();


      if (
        !status
      ) {
        continue;
      }


      counts[
        status
      ] =
        (
          counts[
            status
          ] ??
          0
        ) +
        1;

    }


    return counts;
  }


  /* ============================================================
     NUMERIC RECORD NORMALIZER
  ============================================================ */

  private normalizeNumericRecord(
    value: unknown
  ): Record<
    string,
    number
  > {

    const raw =
      this.unwrapObject(
        value
      );


    const result:
      Record<
        string,
        number
      > = {};


    for (
      const [
        key,
        currentValue
      ]
      of Object.entries(
        raw
      )
    ) {

      const numberValue =
        Number(
          currentValue
        );


      if (
        Number.isFinite(
          numberValue
        )
      ) {

        result[
          key
        ] =
          numberValue;

      }

    }


    return result;
  }


  /* ============================================================
     SUM NUMERIC RECORD
  ============================================================ */

  private sumNumericRecord(
    record:
      Record<
        string,
        number
      >
  ): number {

    return Object
      .values(
        record
      )
      .reduce(
        (
          total,
          value
        ) =>
          total +
          Number(
            value ||
            0
          ),
        0
      );
  }


  /* ============================================================
     RESPONSE OBJECT NORMALIZER
  ============================================================ */

  private unwrapObject(
    value: unknown
  ): Record<
    string,
    any
  > {

    if (
      !value ||
      typeof value !==
        'object' ||
      Array.isArray(
        value
      )
    ) {

      return {};
    }


    const raw =
      value as Record<
        string,
        any
      >;


    if (
      raw[
        'data'
      ] &&
      typeof raw[
        'data'
      ] ===
        'object' &&
      !Array.isArray(
        raw[
          'data'
        ]
      )
    ) {

      if (
        raw[
          'data'
        ][
          'data'
        ] &&
        typeof raw[
          'data'
        ][
          'data'
        ] ===
          'object' &&
        !Array.isArray(
          raw[
            'data'
          ][
            'data'
          ]
        )
      ) {

        return raw[
          'data'
        ][
          'data'
        ];

      }


      return raw[
        'data'
      ];

    }


    return raw;
  }


  /* ============================================================
     SAFE NUMBER
  ============================================================ */

  private toNumber(
    value: unknown
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

}
