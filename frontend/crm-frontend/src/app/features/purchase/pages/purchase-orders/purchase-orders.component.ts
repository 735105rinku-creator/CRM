import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  takeUntil
} from 'rxjs';

import {
  PurchaseAccess,
  PurchaseOrder,
  PurchaseOrderFilters,
  PurchaseOrderStatus
} from '../../models/purchase.models';

import {
  PurchaseOrderDeliverySummary,
  PurchaseOrderService,
  PurchaseOrderStatusCounts
} from '../../services/purchase-order.service';

import {
  PurchaseRequestService
} from '../../services/purchase-request.service';


@Component({
  selector:
    'app-purchase-orders',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './purchase-orders.component.html',

  styleUrl:
    './purchase-orders.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class PurchaseOrdersComponent
  implements OnInit, OnDestroy {

  /* ============================================================
     FILTER CONTROLS
  ============================================================ */

  readonly searchControl =
    new FormControl<string>(
      '',
      {
        nonNullable:
          true
      }
    );


  readonly statusControl =
    new FormControl<
      PurchaseOrderStatus | ''
    >(
      '',
      {
        nonNullable:
          true
      }
    );


  readonly fromDateControl =
    new FormControl<string>(
      '',
      {
        nonNullable:
          true
      }
    );


  readonly toDateControl =
    new FormControl<string>(
      '',
      {
        nonNullable:
          true
      }
    );


  /* ============================================================
     STATUS OPTIONS
  ============================================================ */

  readonly statusOptions:
    Array<{
      value:
        PurchaseOrderStatus;

      label:
        string;
    }> = [

      {
        value:
          'draft',

        label:
          'Draft'
      },

      {
        value:
          'approved',

        label:
          'Approved'
      },

      {
        value:
          'sent',

        label:
          'Sent'
      },

      {
        value:
          'partially_received',

        label:
          'Partially Received'
      },

      {
        value:
          'received',

        label:
          'Received'
      },

      {
        value:
          'cancelled',

        label:
          'Cancelled'
      }

    ];


  /* ============================================================
     DATA
  ============================================================ */

  purchaseOrders:
    PurchaseOrder[] =
    [];


  purchaseAccess:
    PurchaseAccess |
    null =
    null;


  statusCounts:
    PurchaseOrderStatusCounts = {

      draft:
        0,

      approved:
        0,

      sent:
        0,

      partially_received:
        0,

      received:
        0,

      cancelled:
        0
    };


  deliverySummary:
    PurchaseOrderDeliverySummary = {

      pendingDeliveries:
        0,

      overdueDeliveries:
        0
    };


  /* ============================================================
     STATE
  ============================================================ */

  isLoading =
    false;


  isSummaryLoading =
    false;


  processingOrderId =
    '';


  errorMessage =
    '';


  actionMessage =
    '';


  actionMessageType:
    'success' |
    'error' |
    'warning' |
    '' =
    '';


  /* ============================================================
     PAGINATION
  ============================================================ */

  currentPage =
    1;


  pageSize =
    10;


  totalRecords =
    0;


  totalPages =
    1;


  /* ============================================================
     DESTROY
  ============================================================ */

  private readonly destroy$ =
    new Subject<void>();


  constructor(
    private readonly purchaseOrderService:
      PurchaseOrderService,

    private readonly purchaseRequestService:
      PurchaseRequestService,

    private readonly router:
      Router,

    private readonly cdr:
      ChangeDetectorRef
  ) {}


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit():
    void {

    this.setupFilters();

    this.loadAccess();

    this.loadPurchaseOrders();

    this.loadSummary();
  }


  /* ============================================================
     DESTROY
  ============================================================ */

  ngOnDestroy():
    void {

    this.destroy$
      .next();

    this.destroy$
      .complete();
  }


  /* ============================================================
     ACCESS
  ============================================================ */

  private loadAccess():
    void {

    this.purchaseRequestService
      .getPurchaseAccess()
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe({

        next:
          (
            response:
              unknown
          ) => {

            const raw =
              response as
                | PurchaseAccess
                | {
                    data?:
                      PurchaseAccess;
                  }
                | null;


            if (
              raw &&
              typeof raw ===
                'object' &&
              'data' in raw
            ) {

              this.purchaseAccess =
                raw.data ||
                null;

            } else {

              this.purchaseAccess =
                raw as
                  PurchaseAccess |
                  null;
            }


            this.cdr
              .markForCheck();
          },

        error:
          () => {

            this.purchaseAccess =
              null;

            this.cdr
              .markForCheck();
          }

      });
  }


  /* ============================================================
     SENIOR PERMISSION
  ============================================================ */

  get canApprove():
    boolean {

    return (
      this.purchaseAccess
        ?.canApprove ===
      true
    );
  }


  /* ============================================================
     FILTER SUBSCRIPTIONS
  ============================================================ */

  private setupFilters():
    void {

    this.searchControl
      .valueChanges
      .pipe(
        debounceTime(
          350
        ),

        distinctUntilChanged(),

        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        () => {

          this.currentPage =
            1;

          this.loadPurchaseOrders();
        }
      );


    this.statusControl
      .valueChanges
      .pipe(
        distinctUntilChanged(),

        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        () => {

          this.currentPage =
            1;

          this.loadPurchaseOrders();
        }
      );


    this.fromDateControl
      .valueChanges
      .pipe(
        distinctUntilChanged(),

        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        () => {

          this.currentPage =
            1;

          this.loadPurchaseOrders();
        }
      );


    this.toDateControl
      .valueChanges
      .pipe(
        distinctUntilChanged(),

        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        () => {

          this.currentPage =
            1;

          this.loadPurchaseOrders();
        }
      );
  }


  /* ============================================================
     LOAD LIST
  ============================================================ */

  loadPurchaseOrders():
    void {

    this.isLoading =
      true;


    this.errorMessage =
      '';


    const filters:
      PurchaseOrderFilters = {

      search:
        this.searchControl
          .value
          .trim(),

      status:
        this.statusControl
          .value,

      fromDate:
        this.fromDateControl
          .value ||
        undefined,

      toDate:
        this.toDateControl
          .value ||
        undefined,

      page:
        this.currentPage,

      limit:
        this.pageSize,

      sort:
        '-poDate'
    };


    this.purchaseOrderService
      .getPurchaseOrders(
        filters
      )
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.isLoading =
              false;

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          response => {

            const rows =
              response
                ?.rows;


            const pagination =
              response
                ?.pagination;


            this.purchaseOrders =
              Array.isArray(
                rows
              )
                ? rows
                : [];


            this.totalRecords =
              pagination
                ?.total ??
              this.purchaseOrders
                .length;


            this.totalPages =
              Math.max(
                pagination
                  ?.pages ??
                1,
                1
              );


            if (
              this.currentPage >
              this.totalPages
            ) {

              this.currentPage =
                this.totalPages;
            }


            this.cdr
              .markForCheck();
          },

        error:
          error => {

            this.purchaseOrders =
              [];


            this.totalRecords =
              0;


            this.totalPages =
              1;


            this.errorMessage =
              this.getErrorMessage(
                error,
                'Purchase Orders could not be loaded.'
              );


            this.cdr
              .markForCheck();
          }

      });
  }


  /* ============================================================
     LOAD SUMMARY
  ============================================================ */

  loadSummary():
    void {

    this.isSummaryLoading =
      true;


    forkJoin({

      counts:
        this.purchaseOrderService
          .getStatusCounts(),

      delivery:
        this.purchaseOrderService
          .getDeliverySummary()

    })
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.isSummaryLoading =
              false;

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          result => {

            this.statusCounts = {
              ...this.statusCounts,
              ...result.counts
            };


            this.deliverySummary = {
              ...this.deliverySummary,
              ...result.delivery
            };


            this.cdr
              .markForCheck();
          },

        error:
          () => {

            /*
             * Summary failure must not block
             * Purchase Order list.
             */

            this.cdr
              .markForCheck();
          }

      });
  }


  /* ============================================================
     REFRESH
  ============================================================ */

  refresh():
    void {

    this.loadPurchaseOrders();

    this.loadSummary();
  }


  /* ============================================================
     CLEAR FILTERS
  ============================================================ */

  clearFilters():
    void {

    this.searchControl
      .setValue(
        '',
        {
          emitEvent:
            false
        }
      );


    this.statusControl
      .setValue(
        '',
        {
          emitEvent:
            false
        }
      );


    this.fromDateControl
      .setValue(
        '',
        {
          emitEvent:
            false
        }
      );


    this.toDateControl
      .setValue(
        '',
        {
          emitEvent:
            false
        }
      );


    this.currentPage =
      1;


    this.loadPurchaseOrders();
  }


  /* ============================================================
     FILTER BY STATUS CARD
  ============================================================ */

  filterByStatus(
    status:
      PurchaseOrderStatus |
      ''
  ):
    void {

    this.statusControl
      .setValue(
        status
      );
  }


  /* ============================================================
     PAGINATION
  ============================================================ */

  goToPreviousPage():
    void {

    if (
      this.currentPage <=
      1 ||
      this.isLoading
    ) {

      return;
    }


    this.currentPage -=
      1;


    this.loadPurchaseOrders();
  }


  goToNextPage():
    void {

    if (
      this.currentPage >=
      this.totalPages ||
      this.isLoading
    ) {

      return;
    }


    this.currentPage +=
      1;


    this.loadPurchaseOrders();
  }


  /* ============================================================
     CREATE
  ============================================================ */

  createPurchaseOrder():
    void {

    this.router
      .navigate([
        '/purchase/purchase-orders/new'
      ]);
  }


  /* ============================================================
     OPEN / EDIT
  ============================================================ */

  openPurchaseOrder(
    purchaseOrder:
      PurchaseOrder
  ):
    void {
  
    if (
      !purchaseOrder?._id
    ) {
  
      this.showMessage(
        'Purchase Order reference is missing.',
        'error'
      );
  
      return;
    }
  
  
    this.router
      .navigate([
        '/purchase/purchase-orders',
        purchaseOrder._id
      ]);
  }


  /* ============================================================
     GRN
  ============================================================ */

  createGoodsReceipt(
    purchaseOrder:
      PurchaseOrder
  ):
    void {

    if (
      ![
        'approved',
        'sent',
        'partially_received'
      ].includes(
        purchaseOrder.status
      )
    ) {

      this.showMessage(
        'Goods Receipt can be created only for an approved, sent or partially received Purchase Order.',
        'warning'
      );

      return;
    }


    this.router
      .navigate(
        [
          '/purchase/goods-receipts/new'
        ],
        {
          queryParams: {
            purchaseOrderId:
              purchaseOrder._id
          }
        }
      );
  }


  /* ============================================================
     APPROVE
     UI + backend both enforce Senior approval.
  ============================================================ */

  approvePurchaseOrder(
    purchaseOrder:
      PurchaseOrder
  ):
    void {

    if (
      !this.canApprove
    ) {

      this.showMessage(
        'Only a Purchase Senior can approve a Purchase Order.',
        'warning'
      );

      return;
    }


    if (
      purchaseOrder.status !==
      'draft'
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Approve Purchase Order ${purchaseOrder.poNumber}?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    this.processingOrderId =
      purchaseOrder._id;


    this.clearActionMessage();


    this.purchaseOrderService
      .approvePurchaseOrder(
        purchaseOrder._id
      )
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.processingOrderId =
              '';

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          updated => {

            this.replaceOrder(
              updated
            );


            this.showMessage(
              `Purchase Order ${updated.poNumber || purchaseOrder.poNumber} approved successfully.`,
              'success'
            );


            this.loadSummary();
          },

        error:
          error => {

            this.showMessage(
              this.getErrorMessage(
                error,
                'Purchase Order could not be approved.'
              ),
              'error'
            );
          }

      });
  }


  /* ============================================================
     SEND TO VENDOR
  ============================================================ */

  sendPurchaseOrder(
    purchaseOrder:
      PurchaseOrder
  ):
    void {

    if (
      purchaseOrder.status !==
      'approved'
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Mark Purchase Order ${purchaseOrder.poNumber} as sent to vendor?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    this.processingOrderId =
      purchaseOrder._id;


    this.clearActionMessage();


    this.purchaseOrderService
      .sendPurchaseOrder(
        purchaseOrder._id
      )
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.processingOrderId =
              '';

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          updated => {

            this.replaceOrder(
              updated
            );


            this.showMessage(
              `Purchase Order ${updated.poNumber || purchaseOrder.poNumber} marked as sent.`,
              'success'
            );


            this.loadSummary();
          },

        error:
          error => {

            this.showMessage(
              this.getErrorMessage(
                error,
                'Purchase Order could not be marked as sent.'
              ),
              'error'
            );
          }

      });
  }


  /* ============================================================
     CANCEL
  ============================================================ */

  cancelPurchaseOrder(
    purchaseOrder:
      PurchaseOrder
  ):
    void {

    if (
      ![
        'draft',
        'approved',
        'sent'
      ].includes(
        purchaseOrder.status
      )
    ) {

      this.showMessage(
        'This Purchase Order can no longer be cancelled.',
        'warning'
      );

      return;
    }


    const reason =
      window.prompt(
        `Enter cancellation reason for ${purchaseOrder.poNumber}:`
      );


    if (
      reason ===
      null
    ) {

      return;
    }


    const cleanReason =
      reason.trim();


    if (
      !cleanReason
    ) {

      this.showMessage(
        'Cancellation reason is required.',
        'warning'
      );

      return;
    }


    this.processingOrderId =
      purchaseOrder._id;


    this.clearActionMessage();


    this.purchaseOrderService
      .cancelPurchaseOrder(
        purchaseOrder._id,
        cleanReason
      )
      .pipe(

        takeUntil(
          this.destroy$
        ),

        finalize(
          () => {

            this.processingOrderId =
              '';

            this.cdr
              .markForCheck();
          }
        )

      )
      .subscribe({

        next:
          updated => {

            this.replaceOrder(
              updated
            );


            this.showMessage(
              `Purchase Order ${updated.poNumber || purchaseOrder.poNumber} cancelled.`,
              'success'
            );


            this.loadSummary();
          },

        error:
          error => {

            this.showMessage(
              this.getErrorMessage(
                error,
                'Purchase Order could not be cancelled.'
              ),
              'error'
            );
          }

      });
  }


  /* ============================================================
     ACTION VISIBILITY
  ============================================================ */

  canEdit(
    purchaseOrder:
      PurchaseOrder
  ):
    boolean {

    return (
      purchaseOrder.status ===
      'draft'
    );
  }


  canSend(
    purchaseOrder:
      PurchaseOrder
  ):
    boolean {

    return (
      purchaseOrder.status ===
      'approved'
    );
  }


  canCancel(
    purchaseOrder:
      PurchaseOrder
  ):
    boolean {

    return [
      'draft',
      'approved',
      'sent'
    ].includes(
      purchaseOrder.status
    );
  }


  canCreateGrn(
    purchaseOrder:
      PurchaseOrder
  ):
    boolean {

    return [
      'approved',
      'sent',
      'partially_received'
    ].includes(
      purchaseOrder.status
    );
  }


  isProcessing(
    purchaseOrder:
      PurchaseOrder
  ):
    boolean {

    return (
      this.processingOrderId ===
      purchaseOrder._id
    );
  }


  /* ============================================================
     REPLACE UPDATED ROW
  ============================================================ */

  private replaceOrder(
    updated:
      PurchaseOrder
  ):
    void {

    this.purchaseOrders =
      this.purchaseOrders
        .map(
          order =>
            order._id === updated._id
              ? { ...order, ...updated }
              : order
        );


    this.cdr.detectChanges();
  }


  /* ============================================================
     DISPLAY: VENDOR
  ============================================================ */

  getVendorName(
    purchaseOrder:
      PurchaseOrder
  ):
    string {

    const raw =
      purchaseOrder as
        PurchaseOrder &
        {
          vendorName?:
            string;

          vendorCode?:
            string;
        };


    if (
      raw.vendorName
    ) {

      return raw.vendorName;
    }


    if (
      purchaseOrder.vendor &&
      typeof purchaseOrder.vendor ===
        'object'
    ) {

      return (
        purchaseOrder.vendor
          .name ||
        purchaseOrder.vendor
          .companyName ||
        '—'
      );
    }


    return (
      typeof purchaseOrder.vendor ===
        'string'
        ? purchaseOrder.vendor
        : '—'
    );
  }


  /* ============================================================
     DISPLAY: PR NUMBER
  ============================================================ */

  getPurchaseRequestNumber(
    purchaseOrder:
      PurchaseOrder
  ):
    string {

    const raw =
      purchaseOrder as
        PurchaseOrder &
        {
          purchaseRequestNumber?:
            string;
        };


    if (
      raw.purchaseRequestNumber
    ) {

      return raw
        .purchaseRequestNumber;
    }


    if (
      purchaseOrder.purchaseRequest &&
      typeof purchaseOrder.purchaseRequest ===
        'object'
    ) {

      return (
        purchaseOrder
          .purchaseRequest
          .prNumber ||
        '—'
      );
    }


    return '—';
  }


  /* ============================================================
     DISPLAY: QUOTATION
  ============================================================ */

  getQuotationNumber(
    purchaseOrder:
      PurchaseOrder
  ):
    string {

    const raw =
      purchaseOrder as
        PurchaseOrder &
        {
          quotationNumber?:
            string;
        };


    if (
      raw.quotationNumber
    ) {

      return raw
        .quotationNumber;
    }


    if (
      purchaseOrder.quotation &&
      typeof purchaseOrder.quotation ===
        'object'
    ) {

      return (
        purchaseOrder
          .quotation
          .quotationNumber ||
        '—'
      );
    }


    return '—';
  }


  /* ============================================================
     DISPLAY: WAREHOUSE
  ============================================================ */

  getWarehouseName(
    purchaseOrder:
      PurchaseOrder
  ):
    string {

    const deliveryType = purchaseOrder.deliveryType || 'company_warehouse';

    if (deliveryType !== 'company_warehouse') {
      return purchaseOrder.deliveryLocationName ||
        purchaseOrder.otherDeliveryType ||
        deliveryType.replace(/_/g, ' ');
    }

    const raw =
      purchaseOrder as
        PurchaseOrder &
        {
          warehouseName?:
            string;
        };


    if (
      raw.warehouseName
    ) {

      return raw
        .warehouseName;
    }


    if (
      purchaseOrder.warehouse &&
      typeof purchaseOrder.warehouse ===
        'object'
    ) {

      return (
        purchaseOrder
          .warehouse
          .name ||
        '—'
      );
    }


    return '—';
  }


  /* ============================================================
     QUANTITY TOTALS
  ============================================================ */

  getOrderedQuantity(
    purchaseOrder:
      PurchaseOrder
  ):
    number {

    return (
      purchaseOrder.items ||
      []
    )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.orderedQuantity ||
            0
          ),
        0
      );
  }


  getReceivedQuantity(
    purchaseOrder:
      PurchaseOrder
  ):
    number {

    return (
      purchaseOrder.items ||
      []
    )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.receivedQuantity ||
            0
          ),
        0
      );
  }


  getRemainingQuantity(
    purchaseOrder:
      PurchaseOrder
  ):
    number {

    return (
      purchaseOrder.items ||
      []
    )
      .reduce(
        (
          total,
          item
        ) => {

          const ordered =
            Number(
              item.orderedQuantity ||
              0
            );


          const received =
            Number(
              item.receivedQuantity ||
              0
            );


          const backendRemaining =
            item.remainingQuantity;


          return (
            total +
            (
              backendRemaining !==
                undefined
                ? Number(
                    backendRemaining
                  )
                : Math.max(
                    ordered -
                    received,
                    0
                  )
            )
          );
        },
        0
      );
  }


  /* ============================================================
     DATE
  ============================================================ */

  getDateValue(
    value:
      string |
      null |
      undefined
  ):
    string {

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


    return date
      .toLocaleDateString(
        'en-IN',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric'
        }
      );
  }


  /* ============================================================
     CURRENCY
  ============================================================ */

  formatCurrency(
    value:
      number |
      null |
      undefined
  ):
    string {

    const amount =
      Number(
        value ||
        0
      );


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
        amount
      );
  }


  /* ============================================================
     STATUS LABEL
  ============================================================ */

  getStatusLabel(
    status:
      PurchaseOrderStatus
  ):
    string {

    const option =
      this.statusOptions
        .find(
          item =>
            item.value ===
            status
        );


    return (
      option?.label ||
      status
    );
  }


  /* ============================================================
     STATUS CLASS
  ============================================================ */

  getStatusClass(
    status:
      PurchaseOrderStatus
  ):
    string {

    switch (
      status
    ) {

      case 'approved':
        return 'status-badge--approved';

      case 'sent':
        return 'status-badge--sent';

      case 'partially_received':
        return 'status-badge--partial';

      case 'received':
        return 'status-badge--received';

      case 'cancelled':
        return 'status-badge--cancelled';

      case 'draft':
      default:
        return 'status-badge--draft';
    }
  }


  /* ============================================================
     DELIVERY STATE
  ============================================================ */

  isDeliveryOverdue(
    purchaseOrder:
      PurchaseOrder
  ):
    boolean {

    if (
      !purchaseOrder
        .expectedDeliveryDate
    ) {

      return false;
    }


    if (
      [
        'received',
        'cancelled'
      ].includes(
        purchaseOrder.status
      )
    ) {

      return false;
    }


    const deliveryDate =
      new Date(
        purchaseOrder
          .expectedDeliveryDate
      );


    if (
      Number.isNaN(
        deliveryDate.getTime()
      )
    ) {

      return false;
    }


    const today =
      new Date();


    today.setHours(
      0,
      0,
      0,
      0
    );


    deliveryDate.setHours(
      0,
      0,
      0,
      0
    );


    return (
      deliveryDate.getTime() <
      today.getTime()
    );
  }


  /* ============================================================
     MESSAGE
  ============================================================ */

  private showMessage(
    message:
      string,

    type:
      'success' |
      'error' |
      'warning'
  ):
    void {

    this.actionMessage =
      message;


    this.actionMessageType =
      type;


    this.cdr
      .markForCheck();
  }


  clearActionMessage():
    void {

    this.actionMessage =
      '';


    this.actionMessageType =
      '';
  }


  /* ============================================================
     ERROR
  ============================================================ */

  private getErrorMessage(
    error:
      any,

    fallback:
      string
  ):
    string {

    return (
      error?.error?.message ||
      error?.message ||
      fallback
    );
  }


  /* ============================================================
     TRACK BY
  ============================================================ */

  trackByPurchaseOrderId(
    _index:
      number,

    purchaseOrder:
      PurchaseOrder
  ):
    string {

    return purchaseOrder._id;
  }

}
