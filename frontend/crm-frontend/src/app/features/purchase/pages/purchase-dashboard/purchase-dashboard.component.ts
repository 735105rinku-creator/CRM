import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
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
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  forkJoin,
  of
} from 'rxjs';

import {
  catchError,
  finalize
} from 'rxjs/operators';


import {
  ApiService
} from '../../../../core/services/api.service';


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
  PurchaseApiListData,
  PurchaseInvoiceMetrics,
  PurchaseRequest
} from '../../models/purchase.models';


interface PurchaseSummaryCard {

  label: string;

  value: number;

  caption: string;

  route: string;

  icon:
    | 'request'
    | 'quotation'
    | 'order'
    | 'receipt'
    | 'delivery'
    | 'vendor';
}


interface PurchaseActivity {

  reference: string;

  type: string;

  vendor: string;

  status: string;

  date: string;
}


interface PurchaseQuickAction {

  label: string;

  description: string;

  route: string;

  icon:
    | 'request'
    | 'enquiry'
    | 'quotation'
    | 'order'
    | 'receipt'
    | 'vendor';
}


interface EmployeeDashboardResponse {

  employee?: {

    _id?: string;

    employeeCode?: string;

    displayName?: string;

    firstName?: string;

    lastName?: string;

    officialEmail?: string;

    email?: string;


    designationId?: {

      designationName?: string;

      name?: string;

    };


    departmentId?: {

      departmentName?: string;

      name?: string;

    };

  };


  user?: {

    _id?: string;

    displayName?: string;

    name?: string;

    firstName?: string;

    lastName?: string;

    email?: string;

  };


  company?: {

    _id?: string;

    companyName?: string;

    name?: string;

    companyCode?: string;

    logo?: string;

    logoUrl?: string;

  };
}


@Component({

  selector:
    'app-purchase-dashboard',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl:
    './purchase-dashboard.component.html',

  styleUrl:
    './purchase-dashboard.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush

})
export class PurchaseDashboardComponent {


  /* ============================================================
     SERVICES
  ============================================================ */

  private readonly api =
    inject(
      ApiService
    );


  private readonly purchaseRequestService =
    inject(
      PurchaseRequestService
    );


  private readonly vendorEnquiryService =
    inject(
      VendorEnquiryService
    );


  private readonly quotationService =
    inject(
      PurchaseQuotationService
    );


  private readonly purchaseOrderService =
    inject(
      PurchaseOrderService
    );


  private readonly goodsReceiptService =
    inject(
      GoodsReceiptService
    );


  private readonly purchaseReferenceService =
    inject(
      PurchaseReferenceService
    );


  private readonly purchaseInvoiceService =
    inject(
      PurchaseInvoiceService
    );


  private readonly destroyRef =
    inject(
      DestroyRef
    );


  /* ============================================================
     EMPLOYEE DASHBOARD
  ============================================================ */

  readonly employeeDashboard =
    signal<
      EmployeeDashboardResponse |
      null
    >(
      null
    );


  readonly isEmployeeLoading =
    signal(
      false
    );


  readonly employeeLoadError =
    signal(
      ''
    );


  /* ============================================================
     PURCHASE DASHBOARD STATE
  ============================================================ */

  readonly purchaseRequests =
    signal<
      PurchaseRequest[]
    >(
      []
    );


  readonly purchaseRequestTotal =
    signal(
      0
    );


  readonly vendorEnquiryTotal =
    signal(
      0
    );


  readonly quotationTotal =
    signal(
      0
    );


  readonly purchaseOrderTotal =
    signal(
      0
    );


  readonly activePurchaseOrderTotal =
    signal(
      0
    );


  readonly goodsReceiptTotal =
    signal(
      0
    );


  readonly pendingDeliveryTotal =
    signal(
      0
    );


  readonly overdueDeliveryTotal =
    signal(
      0
    );


  readonly activeVendorTotal =
    signal(
      0
    );


  readonly purchaseInvoiceMetrics =
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


  readonly purchaseDataLoading =
    signal(
      false
    );


  readonly purchaseDataError =
    signal(
      ''
    );


  readonly recentActivity =
    signal<
      PurchaseActivity[]
    >(
      []
    );


  /* ============================================================
     EMPLOYEE INFORMATION
  ============================================================ */

  readonly employeeName =
    computed(
      () => {

        const dashboard =
          this.employeeDashboard();


        const employee =
          dashboard?.employee;


        const user =
          dashboard?.user;


        const employeeDisplayName =
          employee
            ?.displayName
            ?.trim();


        if (
          employeeDisplayName
        ) {

          return employeeDisplayName;
        }


        const employeeFullName = [

          employee?.firstName,

          employee?.lastName

        ]
          .filter(
            Boolean
          )
          .join(
            ' '
          )
          .trim();


        if (
          employeeFullName
        ) {

          return employeeFullName;
        }


        const userDisplayName =

          user
            ?.displayName
            ?.trim() ||

          user
            ?.name
            ?.trim();


        if (
          userDisplayName
        ) {

          return userDisplayName;
        }


        const userFullName = [

          user?.firstName,

          user?.lastName

        ]
          .filter(
            Boolean
          )
          .join(
            ' '
          )
          .trim();


        if (
          userFullName
        ) {

          return userFullName;
        }


        return 'Purchase Employee';

      }
    );


  readonly employeeCode =
    computed(
      () => {

        return (
          this
            .employeeDashboard()
            ?.employee
            ?.employeeCode ||
          ''
        );

      }
    );


  readonly designationName =
    computed(
      () => {

        const designation =
          this
            .employeeDashboard()
            ?.employee
            ?.designationId;


        return (

          designation
            ?.designationName ||

          designation
            ?.name ||

          'Purchase Executive'

        );

      }
    );


  readonly departmentName =
    computed(
      () => {

        const department =
          this
            .employeeDashboard()
            ?.employee
            ?.departmentId;


        return (

          department
            ?.departmentName ||

          department
            ?.name ||

          'Purchase'

        );

      }
    );


  readonly companyName =
    computed(
      () => {

        const company =
          this
            .employeeDashboard()
            ?.company;


        return (

          company
            ?.companyName ||

          company
            ?.name ||

          'Opas Bizz Pvt. Ltd.'

        );

      }
    );


  readonly greeting =
    computed(
      () => {

        const hour =
          new Date()
            .getHours();


        if (
          hour < 12
        ) {

          return 'Good Morning';
        }


        if (
          hour < 17
        ) {

          return 'Good Afternoon';
        }


        return 'Good Evening';

      }
    );


  readonly currentDate =
    computed(
      () => {

        return new Intl
          .DateTimeFormat(
            'en-GB',
            {

              weekday:
                'long',

              day:
                '2-digit',

              month:
                'long',

              year:
                'numeric'

            }
          )
          .format(
            new Date()
          );

      }
    );


  /* ============================================================
     PURCHASE REQUEST COUNTS
  ============================================================ */

  readonly draftPurchaseRequestCount =
    computed(
      () => {

        return this
          .purchaseRequests()
          .filter(
            request =>
              request.status ===
              'draft'
          )
          .length;

      }
    );


  readonly pendingPurchaseRequestCount =
    computed(
      () => {

        return this
          .purchaseRequests()
          .filter(
            request =>
              request.status ===
              'pending_approval'
          )
          .length;

      }
    );


  readonly approvedPurchaseRequestCount =
    computed(
      () => {

        return this
          .purchaseRequests()
          .filter(
            request =>
              request.status ===
              'approved'
          )
          .length;

      }
    );


  /* ============================================================
     SUMMARY CARDS
  ============================================================ */

  readonly summaryCards =
    computed<
      PurchaseSummaryCard[]
    >(
      () => {

        const totalRequests =
          this.purchaseRequestTotal();


        const openRequests =
          this
            .purchaseRequests()
            .filter(
              request =>
                request.status !==
                'rejected'
            )
            .length;


        const rfqCount =
          this.vendorEnquiryTotal();


        const quotationCount =
          this.quotationTotal();


        const rfqQuotationTotal =
          rfqCount +
          quotationCount;


        return [

          {

            label:
              'Purchase Requests',

            value:
              totalRequests,

            caption:
              openRequests > 0
                ? `${openRequests} open requirement${
                    openRequests === 1
                      ? ''
                      : 's'
                  }`
                : 'No open requirements',

            route:
              '/purchase/purchase-requests',

            icon:
              'request'

          },


          {

            label:
              'RFQs / Quotations',

            value:
              rfqQuotationTotal,

            caption:
              rfqQuotationTotal > 0
                ? `${rfqCount} RFQ${
                    rfqCount === 1
                      ? ''
                      : 's'
                  } • ${quotationCount} quotation${
                    quotationCount === 1
                      ? ''
                      : 's'
                  }`
                : 'Awaiting comparison',

            route:
              '/purchase/quotations',

            icon:
              'quotation'

          },


          {

            label:
              'Purchase Orders',

            value:
              this.activePurchaseOrderTotal(),

            caption:
              this.purchaseOrderTotal() > 0
                ? `${this.purchaseOrderTotal()} total purchase order${
                    this.purchaseOrderTotal() === 1
                      ? ''
                      : 's'
                  }`
                : 'No purchase orders',

            route:
              '/purchase/purchase-orders',

            icon:
              'order'

          },


          {

            label:
              'Goods Received',

            value:
              this.goodsReceiptTotal(),

            caption:
              this.goodsReceiptTotal() > 0
                ? `${this.goodsReceiptTotal()} receipt${
                    this.goodsReceiptTotal() === 1
                      ? ''
                      : 's'
                  } recorded`
                : 'No completed receipts',

            route:
              '/purchase/goods-receipts',

            icon:
              'receipt'

          },


          {

            label:
              'Pending Deliveries',

            value:
              this.pendingDeliveryTotal(),

            caption:
              this.overdueDeliveryTotal() > 0
                ? `${this.overdueDeliveryTotal()} overdue`
                : 'Expected deliveries',

            route:
              '/purchase/purchase-orders',

            icon:
              'delivery'

          },


          {

            label:
              'Vendor Invoices',

            value:
              this.purchaseInvoiceMetrics().total,

            caption:
              `${this.purchaseInvoiceMetrics().pendingVerification} pending verification • ${this.purchaseInvoiceMetrics().exceptions} exception${
                this.purchaseInvoiceMetrics().exceptions === 1
                  ? ''
                  : 's'
              }`,

            route:
              '/purchase/invoices',

            icon:
              'order'

          },


          {

            label:
              'Outstanding Payables',

            value:
              this.purchaseInvoiceMetrics().outstandingAmount,

            caption:
              `${this.purchaseInvoiceMetrics().unpaid} unpaid • ${this.purchaseInvoiceMetrics().partiallyPaid} partially paid`,

            route:
              '/purchase/invoices',

            icon:
              'order'

          },


          {

            label:
              'Active Vendors',

            value:
              this.activeVendorTotal(),

            caption:
              this.activeVendorTotal() > 0
                ? 'Available vendor master'
                : 'No active vendors',

            route:
              '/purchase/vendors',

            icon:
              'vendor'

          }

        ];

      }
    );


  /* ============================================================
     QUICK ACTIONS
  ============================================================ */

  readonly quickActions:
    PurchaseQuickAction[] = [

      {

        label:
          'New Purchase Request',

        description:
          'Raise a new purchase requirement.',

        route:
          '/purchase/purchase-requests/new',

        icon:
          'request'

      },


      {

        label:
          'Vendor Enquiry',

        description:
          'Send an RFQ to vendors.',

        route:
          '/purchase/vendor-enquiries/new',

        icon:
          'enquiry'

      },


      {

        label:
          'Add Quotation',

        description:
          'Record a supplier quotation.',

        route:
          '/purchase/quotations/new',

        icon:
          'quotation'

      },


      {

        label:
          'Create Purchase Order',

        description:
          'Prepare a supplier purchase order.',

        route:
          '/purchase/purchase-orders/new',

        icon:
          'order'

      },


      {

        label:
          'Record GRN',

        description:
          'Record goods received against a PO.',

        route:
          '/purchase/goods-receipts/new',

        icon:
          'receipt'

      },


      {

        label:
          'Vendors',

        description:
          'View the existing vendor master.',

        route:
          '/purchase/vendors',

        icon:
          'vendor'

      }

    ];


  /* ============================================================
     CONSTRUCTOR
  ============================================================ */

  constructor() {

    this.loadEmployeeDashboard();

    this.loadPurchaseDashboardData();

  }


  /* ============================================================
     LOAD EMPLOYEE DASHBOARD
  ============================================================ */

  loadEmployeeDashboard():
    void {

    this.isEmployeeLoading
      .set(
        true
      );


    this.employeeLoadError
      .set(
        ''
      );


    this.api
      .get<
        EmployeeDashboardResponse
      >(
        '/hr/employees/dashboard'
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          response => {

            this.employeeDashboard
              .set(
                response ??
                null
              );


            this.isEmployeeLoading
              .set(
                false
              );

          },


        error:
          () => {

            this.employeeDashboard
              .set(
                null
              );


            this.employeeLoadError
              .set(
                'Employee information could not be loaded.'
              );


            this.isEmployeeLoading
              .set(
                false
              );

          }

      });

  }


  /* ============================================================
     LOAD COMPLETE PURCHASE DASHBOARD
  ============================================================ */

  loadPurchaseDashboardData():
    void {

    this.purchaseDataLoading
      .set(
        true
      );


    this.purchaseDataError
      .set(
        ''
      );


    forkJoin({

      purchaseRequests:
        this.purchaseRequestService
          .getPurchaseRequests({
            page:
              1,

            limit:
              100
          })
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),


      vendorEnquiries:
        this.vendorEnquiryService
          .getVendorEnquiries({
            page:
              1,

            limit:
              100
          })
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),


      quotations:
        this.quotationService
          .getQuotations({
            page:
              1,

            limit:
              100
          })
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),


      purchaseOrders:
        this.purchaseOrderService
          .getPurchaseOrders({
            page:
              1,

            limit:
              100
          })
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),


      purchaseOrderCounts:
        this.purchaseOrderService
          .getStatusCounts()
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),


      deliverySummary:
        this.purchaseOrderService
          .getDeliverySummary()
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),


      goodsReceipts:
        this.goodsReceiptService
          .getAll({
            page:
              1,

            limit:
              100
          })
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          ),


      vendors:
        this.purchaseReferenceService
          .getVendors()
          .pipe(
            catchError(
              () =>
                of(
                  []
              )
            )
          ),


      invoiceMetrics:
        this.purchaseInvoiceService
          .metrics()
          .pipe(
            catchError(
              () =>
                of(
                  null
                )
            )
          )

    })
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(
          () => {

            this.purchaseDataLoading
              .set(
                false
              );

          }
        )

      )
      .subscribe({

        next:
          response => {

            /* ==================================================
               PURCHASE REQUESTS
            ================================================== */

            const purchaseRequests =
              this.extractRows<
                PurchaseRequest
              >(
                response.purchaseRequests
              );


            this.purchaseRequests
              .set(
                purchaseRequests
              );


            this.purchaseRequestTotal
              .set(
                this.extractTotal(
                  response.purchaseRequests,
                  purchaseRequests.length
                )
              );


            /* ==================================================
               RFQ / VENDOR ENQUIRIES
            ================================================== */

            const vendorEnquiries =
              this.extractRows(
                response.vendorEnquiries
              );


            this.vendorEnquiryTotal
              .set(
                this.extractTotal(
                  response.vendorEnquiries,
                  vendorEnquiries.length
                )
              );


            /* ==================================================
               QUOTATIONS
            ================================================== */

            const quotations =
              this.extractRows(
                response.quotations
              );


            this.quotationTotal
              .set(
                this.extractTotal(
                  response.quotations,
                  quotations.length
                )
              );


            /* ==================================================
               PURCHASE ORDERS
            ================================================== */

            const purchaseOrders =
              this.extractRows(
                response.purchaseOrders
              );


            const purchaseOrderTotal =
              this.extractTotal(
                response.purchaseOrders,
                purchaseOrders.length
              );


            this.purchaseOrderTotal
              .set(
                purchaseOrderTotal
              );


            const poCounts =
              this.unwrapObject(
                response.purchaseOrderCounts
              );


            const activePoCount =
              this.calculateActivePurchaseOrders(
                poCounts,
                purchaseOrders
              );


            this.activePurchaseOrderTotal
              .set(
                activePoCount
              );


            /* ==================================================
               GOODS RECEIPTS
            ================================================== */

            const goodsReceipts =
              this.extractRows(
                response.goodsReceipts
              );


            this.goodsReceiptTotal
              .set(
                this.extractTotal(
                  response.goodsReceipts,
                  goodsReceipts.length
                )
              );


            /* ==================================================
               DELIVERY SUMMARY
            ================================================== */

            const delivery =
              this.unwrapObject(
                response.deliverySummary
              );


            this.pendingDeliveryTotal
              .set(
                this.toNumber(
                  delivery[
                    'pendingDeliveries'
                  ]
                )
              );


            this.overdueDeliveryTotal
              .set(
                this.toNumber(
                  delivery[
                    'overdueDeliveries'
                  ]
                )
              );


            /* ==================================================
               ACTIVE VENDORS
            ================================================== */

            const vendors =
              Array.isArray(
                response.vendors
              )
                ? response.vendors
                : this.extractRows(
                    response.vendors
                  );


            this.activeVendorTotal
              .set(
                vendors.length
              );


            if (
              response.invoiceMetrics
            ) {

              this.purchaseInvoiceMetrics
                .set(
                  response.invoiceMetrics
                );

            }


            /* ==================================================
               RECENT ACTIVITY
            ================================================== */

            this.recentActivity
              .set(
                this.buildRecentActivity(
                  purchaseRequests
                )
              );


            /* ==================================================
               PARTIAL FAILURE MESSAGE
            ================================================== */

            const someDataFailed =

              response.purchaseRequests ===
                null ||

              response.vendorEnquiries ===
                null ||

              response.quotations ===
                null ||

              response.purchaseOrders ===
                null ||

              response.goodsReceipts ===
                null ||

              response.invoiceMetrics ===
                null;


            if (
              someDataFailed
            ) {

              this.purchaseDataError
                .set(
                  'Some Purchase dashboard information could not be loaded.'
                );

            }

          },


        error:
          () => {

            this.purchaseDataError
              .set(
                'Purchase dashboard information could not be loaded.'
              );

          }

      });

  }


  /* ============================================================
     ACTIVE PURCHASE ORDERS
  ============================================================ */

  private calculateActivePurchaseOrders(
    statusCounts:
      Record<
        string,
        any
      >,

    purchaseOrders:
      any[]
  ):
    number {

    const hasCounts =
      Object.keys(
        statusCounts
      ).length > 0;


    if (
      hasCounts
    ) {

      return (

        this.toNumber(
          statusCounts[
            'draft'
          ]
        ) +

        this.toNumber(
          statusCounts[
            'approved'
          ]
        ) +

        this.toNumber(
          statusCounts[
            'sent'
          ]
        ) +

        this.toNumber(
          statusCounts[
            'partially_received'
          ]
        )

      );

    }


    return purchaseOrders
      .filter(
        order => {

          const status =
            String(
              order?.status ||
              ''
            )
              .trim()
              .toLowerCase();


          return (

            status !==
              'received' &&

            status !==
              'cancelled'

          );

        }
      )
      .length;

  }


  /* ============================================================
     GENERIC LIST NORMALIZER
  ============================================================ */

  private extractRows<T = any>(
    response:
      unknown
  ):
    T[] {

    const raw =
      response as any;


    if (
      Array.isArray(
        raw
      )
    ) {

      return raw;
    }


    if (
      Array.isArray(
        raw?.rows
      )
    ) {

      return raw.rows;
    }


    if (
      Array.isArray(
        raw?.data
      )
    ) {

      return raw.data;
    }


    if (
      Array.isArray(
        raw?.data?.rows
      )
    ) {

      return raw.data.rows;
    }


    if (
      Array.isArray(
        raw?.data?.data
      )
    ) {

      return raw.data.data;
    }


    if (
      Array.isArray(
        raw?.data?.data?.rows
      )
    ) {

      return raw.data.data.rows;
    }


    return [];

  }


  /* ============================================================
     TOTAL NORMALIZER
  ============================================================ */

  private extractTotal(
    response:
      unknown,

    fallback:
      number
  ):
    number {

    const raw =
      response as any;


    const candidates = [

      raw
        ?.pagination
        ?.total,

      raw
        ?.pagination
        ?.totalItems,

      raw
        ?.total,

      raw
        ?.totalCount,

      raw
        ?.count,

      raw
        ?.data
        ?.pagination
        ?.total,

      raw
        ?.data
        ?.pagination
        ?.totalItems,

      raw
        ?.data
        ?.total,

      raw
        ?.data
        ?.totalCount,

      raw
        ?.data
        ?.count,

      raw
        ?.data
        ?.data
        ?.pagination
        ?.total,

      raw
        ?.data
        ?.data
        ?.pagination
        ?.totalItems,

      raw
        ?.data
        ?.data
        ?.total,

      raw
        ?.data
        ?.data
        ?.totalCount,

      raw
        ?.data
        ?.data
        ?.count

    ];


    for (
      const candidate
      of candidates
    ) {

      const numericValue =
        Number(
          candidate
        );


      if (
        Number.isFinite(
          numericValue
        ) &&
        numericValue >= 0
      ) {

        return numericValue;
      }

    }


    return fallback;

  }


  /* ============================================================
     OBJECT NORMALIZER
  ============================================================ */

  private unwrapObject(
    value:
      unknown
  ):
    Record<
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
    value:
      unknown
  ):
    number {

    const numeric =
      Number(
        value
      );


    return Number.isFinite(
      numeric
    )
      ? numeric
      : 0;

  }


  /* ============================================================
     RECENT PURCHASE ACTIVITY
  ============================================================ */

  private buildRecentActivity(
    requests:
      PurchaseRequest[]
  ):
    PurchaseActivity[] {

    return [

      ...requests

    ]
      .sort(
        (
          first,
          second
        ) => {

          return (

            this.purchaseRequestTimestamp(
              second
            ) -

            this.purchaseRequestTimestamp(
              first
            )

          );

        }
      )
      .slice(
        0,
        5
      )
      .map(
        request => {

          const raw =
            request as any;


          return {

            reference:
              this.purchaseRequestReference(
                request
              ),

            type:
              'Purchase Request',

            vendor:
              raw
                ?.vendorName ||
              '—',

            status:
              this.formatStatus(
                String(
                  request.status ||
                  'draft'
                )
              ),

            date:
              this.purchaseRequestDate(
                request
              )

          };

        }
      );

  }


  private purchaseRequestReference(
    request:
      PurchaseRequest
  ):
    string {

    const raw =
      request as any;


    return (

      raw
        ?.requestNumber ||

      raw
        ?.prNumber ||

      raw
        ?.purchaseRequestNumber ||

      raw
        ?.referenceNumber ||

      raw
        ?._id ||

      'Purchase Request'

    );

  }


  private purchaseRequestTimestamp(
    request:
      PurchaseRequest
  ):
    number {

    const raw =
      request as any;


    const value =

      raw
        ?.updatedAt ||

      raw
        ?.createdAt ||

      raw
        ?.requestDate ||

      raw
        ?.requiredByDate;


    if (
      !value
    ) {

      return 0;
    }


    const timestamp =
      new Date(
        value
      )
        .getTime();


    return Number.isNaN(
      timestamp
    )
      ? 0
      : timestamp;

  }


  private purchaseRequestDate(
    request:
      PurchaseRequest
  ):
    string {

    const raw =
      request as any;


    const value =

      raw
        ?.updatedAt ||

      raw
        ?.createdAt ||

      raw
        ?.requestDate ||

      raw
        ?.requiredByDate;


    if (
      !value
    ) {

      return '—';
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

      return '—';
    }


    return new Intl
      .DateTimeFormat(
        'en-GB',
        {

          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric'

        }
      )
      .format(
        date
      );

  }


  private formatStatus(
    status:
      string
  ):
    string {

    if (
      !status
    ) {

      return 'Draft';
    }


    return status
      .replace(
        /_/g,
        ' '
      )
      .replace(
        /\b\w/g,
        character =>
          character.toUpperCase()
      );

  }


  /* ============================================================
     TRACK BY
  ============================================================ */

  trackByCard(
    index:
      number,

    card:
      PurchaseSummaryCard
  ):
    string {

    return card.label;

  }


  trackByActivity(
    index:
      number,

    activity:
      PurchaseActivity
  ):
    string {

    return activity.reference;

  }


  trackByAction(
    index:
      number,

    action:
      PurchaseQuickAction
  ):
    string {

    return action.route;

  }

}
