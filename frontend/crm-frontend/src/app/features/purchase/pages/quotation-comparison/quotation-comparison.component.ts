import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  PurchaseAccess,
  PurchaseApiResponse,
  PurchaseQuotationStatus,
  PurchaseRequest,
  QuotationComparisonRow
} from '../../models/purchase.models';

import {
  PurchaseQuotationService
} from '../../services/purchase-quotation.service';

import {
  PurchaseRequestService
} from '../../services/purchase-request.service';


@Component({
  selector: 'app-quotation-comparison',

  standalone: true,

  imports: [
    CommonModule,
  ],

  templateUrl:
    './quotation-comparison.component.html',

  styleUrl:
    './quotation-comparison.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class QuotationComparisonComponent
  implements OnInit {

  /* ============================================================
     DEPENDENCIES
  ============================================================ */

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly quotationService =
    inject(PurchaseQuotationService);

  private readonly purchaseRequestService =
    inject(PurchaseRequestService);


  /* ============================================================
     DATA
  ============================================================ */

  purchaseRequestId =
    '';


  purchaseRequest:
    PurchaseRequest |
    null = null;


  comparisonRows:
    QuotationComparisonRow[] = [];


  purchaseAccess:
    PurchaseAccess |
    null = null;


  /* ============================================================
     STATE
  ============================================================ */

  isLoading =
    false;


  isActionLoading =
    false;


  actionQuotationId =
    '';


  errorMessage =
    '';


  successMessage =
    '';


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit():
    void {

    this.purchaseRequestId =
      (
        this.route
          .snapshot
          .queryParamMap
          .get(
            'purchaseRequestId'
          ) ||
        ''
      ).trim();


    if (
      !this.purchaseRequestId
    ) {

      this.errorMessage =
        'Purchase Request reference is required for quotation comparison.';

      this.cdr.markForCheck();

      return;
    }


    this.loadPurchaseAccess();

    this.loadPurchaseRequest();

    this.loadComparison();
  }


  /* ============================================================
     ACCESS
  ============================================================ */

  private loadPurchaseAccess():
    void {

    this.purchaseRequestService
      .getPurchaseAccess()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          response => {

            this.purchaseAccess =
              this.extractResponseData<PurchaseAccess>(
                response
              );

            this.cdr.markForCheck();
          },


        error:
          () => {

            /*
             * Backend remains authoritative.
             * If access cannot be resolved,
             * approval actions remain unavailable.
             */

            this.purchaseAccess =
              null;

            this.cdr.markForCheck();
          }

      });
  }


  get canApprove():
    boolean {

    return (
      this.purchaseAccess
        ?.canApprove ===
      true
    );
  }


  /* ============================================================
     PURCHASE REQUEST
  ============================================================ */

  private loadPurchaseRequest():
    void {

    if (
      !this.purchaseRequestId
    ) {

      return;
    }


    this.purchaseRequestService
      .getPurchaseRequestById(
        this.purchaseRequestId
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          response => {

            this.purchaseRequest =
              this.extractResponseData<PurchaseRequest>(
                response
              );

            this.cdr.markForCheck();
          },


        error:
          () => {

            /*
             * Comparison can still work if
             * PR summary cannot be loaded.
             */

            this.purchaseRequest =
              null;

            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     COMPARISON
  ============================================================ */

  loadComparison():
    void {

    if (
      !this.purchaseRequestId
    ) {

      return;
    }


    this.clearMessages();


    this.isLoading =
      true;


    this.cdr.markForCheck();


    this.quotationService
      .getComparison(
        this.purchaseRequestId
      )
      .pipe(

        finalize(
          () => {

            this.isLoading =
              false;

            this.cdr.markForCheck();
          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next:
          response => {

            this.comparisonRows =
              this.extractComparisonRows(
                response
              );

            this.cdr.markForCheck();
          },


        error:
          error => {

            this.comparisonRows =
              [];

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to load quotation comparison.'
              );

            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     RESPONSE NORMALIZATION
  ============================================================ */

  private extractComparisonRows(
    response:
      unknown
  ):
    QuotationComparisonRow[] {

    if (
      Array.isArray(
        response
      )
    ) {

      return response as
        QuotationComparisonRow[];
    }


    if (
      !response ||
      typeof response !==
        'object'
    ) {

      return [];
    }


    const value =
      response as any;


    if (
      Array.isArray(
        value.rows
      )
    ) {

      return value.rows;
    }


    if (
      Array.isArray(
        value.quotations
      )
    ) {

      return value.quotations;
    }


    if (
      Array.isArray(
        value.data
      )
    ) {

      return value.data;
    }


    if (
      Array.isArray(
        value.data?.rows
      )
    ) {

      return value.data.rows;
    }


    if (
      Array.isArray(
        value.data?.quotations
      )
    ) {

      return value.data.quotations;
    }


    return [];
  }


  private extractResponseData<T>(
    response:
      T |
      PurchaseApiResponse<T> |
      null |
      undefined
  ):
    T |
    null {

    if (
      response ===
        null ||
      response ===
        undefined
    ) {

      return null;
    }


    if (
      typeof response ===
        'object' &&
      'data' in
        (response as object)
    ) {

      return (
        response as
          PurchaseApiResponse<T>
      ).data;
    }


    return response as T;
  }


  /* ============================================================
     LOWEST PRICE
  ============================================================ */

  get lowestComparableAmount():
    number |
    null {

    const amounts =
      this.comparisonRows
        .filter(
          row =>
            row.status !==
            'rejected'
        )
        .map(
          row =>
            this.toNumber(
              row.grandTotal
            )
        )
        .filter(
          amount =>
            amount >
            0
        );


    if (
      amounts.length ===
      0
    ) {

      return null;
    }


    return Math.min(
      ...amounts
    );
  }


  isLowestPrice(
    row:
      QuotationComparisonRow
  ):
    boolean {

    const lowest =
      this.lowestComparableAmount;


    if (
      lowest ===
      null
    ) {

      return false;
    }


    return (
      row.status !==
        'rejected' &&
      this.toNumber(
        row.grandTotal
      ) ===
        lowest
    );
  }


  /* ============================================================
     DELIVERY COMPARISON
  ============================================================ */

  get shortestDeliveryDays():
    number |
    null {

    const days =
      this.comparisonRows
        .filter(
          row =>
            row.status !==
            'rejected'
        )
        .map(
          row =>
            this.extractDeliveryDays(
              row.deliveryTime
            )
        )
        .filter(
          (
            value
          ):
            value is number =>
          value !==
          null
        );


    if (
      days.length ===
      0
    ) {

      return null;
    }


    return Math.min(
      ...days
    );
  }


  isShortestDelivery(
    row:
      QuotationComparisonRow
  ):
    boolean {

    const shortest =
      this.shortestDeliveryDays;


    const current =
      this.extractDeliveryDays(
        row.deliveryTime
      );


    return (
      shortest !==
        null &&
      current !==
        null &&
      current ===
        shortest &&
      row.status !==
        'rejected'
    );
  }


  private extractDeliveryDays(
    value:
      string |
      null |
      undefined
  ):
    number |
    null {

    if (
      !value
    ) {

      return null;
    }


    const normalized =
      String(
        value
      )
        .trim()
        .toLowerCase();


    const match =
      normalized.match(
        /(\d+(?:\.\d+)?)/
      );


    if (
      !match
    ) {

      return null;
    }


    let amount =
      Number(
        match[1]
      );


    if (
      !Number.isFinite(
        amount
      )
    ) {

      return null;
    }


    if (
      normalized.includes(
        'week'
      )
    ) {

      amount *=
        7;
    }


    if (
      normalized.includes(
        'month'
      )
    ) {

      amount *=
        30;
    }


    if (
      normalized.includes(
        'hour'
      )
    ) {

      amount /=
        24;
    }


    return amount;
  }


  /* ============================================================
     SELECT
  ============================================================ */

  selectQuotation(
    row:
      QuotationComparisonRow
  ):
    void {

    if (
      !this.canApprove ||
      this.isActionLoading
    ) {

      return;
    }


    if (
      row.status ===
        'selected'
    ) {

      return;
    }


    if (
      row.status ===
        'rejected'
    ) {

      this.errorMessage =
        'Rejected quotation cannot be selected.';

      this.cdr.markForCheck();

      return;
    }


    const confirmed =
      window.confirm(
        `Select quotation ${row.quotationNumber} from ${row.vendorName} as the preferred quotation?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    this.clearMessages();


    this.isActionLoading =
      true;


    this.actionQuotationId =
      row.quotationId;


    this.cdr.markForCheck();


    this.quotationService
      .selectQuotation(
        row.quotationId
      )
      .pipe(

        finalize(
          () => {

            this.isActionLoading =
              false;

            this.actionQuotationId =
              '';

            this.cdr.markForCheck();
          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next:
          () => {

            this.successMessage =
              'Quotation selected successfully.';

            this.loadComparison();
          },


        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to select quotation.'
              );

            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     REJECT
  ============================================================ */

  rejectQuotation(
    row:
      QuotationComparisonRow
  ):
    void {

    if (
      !this.canApprove ||
      this.isActionLoading
    ) {

      return;
    }


    if (
      row.status ===
        'selected'
    ) {

      this.errorMessage =
        'Selected quotation cannot be rejected from this screen.';

      this.cdr.markForCheck();

      return;
    }


    if (
      row.status ===
        'rejected'
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Reject quotation ${row.quotationNumber} from ${row.vendorName}?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    this.clearMessages();


    this.isActionLoading =
      true;


    this.actionQuotationId =
      row.quotationId;


    this.cdr.markForCheck();


    this.quotationService
      .rejectQuotation(
        row.quotationId
      )
      .pipe(

        finalize(
          () => {

            this.isActionLoading =
              false;

            this.actionQuotationId =
              '';

            this.cdr.markForCheck();
          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next:
          () => {

            this.successMessage =
              'Quotation rejected successfully.';

            this.loadComparison();
          },


        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to reject quotation.'
              );

            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     NAVIGATION
  ============================================================ */

  openQuotation(
    row:
      QuotationComparisonRow
  ):
    void {

    void this.router.navigate([
      '/purchase/quotations',
      row.quotationId,
      'edit'
    ]);
  }


  createPurchaseOrder(
    row:
      QuotationComparisonRow
  ):
    void {

    if (
      row.status !==
        'selected'
    ) {

      return;
    }


    void this.router.navigate(
      [
        '/purchase/purchase-orders/new'
      ],
      {
        queryParams: {

          quotationId:
            row.quotationId,

          purchaseRequestId:
            this.purchaseRequestId

        }
      }
    );
  }


  backToQuotations():
    void {

    void this.router.navigate([
      '/purchase/quotations'
    ]);
  }


  /* ============================================================
     PURCHASE REQUEST DISPLAY
  ============================================================ */

  getPurchaseRequestNumber():
    string {

    return (
      this.purchaseRequest
        ?.prNumber ||
      'Purchase Request'
    );
  }


  getPurchaseRequestItem():
    string {

    return (
      this.purchaseRequest
        ?.itemName ||
      '-'
    );
  }


  getPurchaseRequestQuantity():
    string {

    if (
      !this.purchaseRequest
    ) {

      return '-';
    }


    return (
      `${this.purchaseRequest.requiredQuantity} ${this.purchaseRequest.unit || ''}`
    ).trim();
  }


  /* ============================================================
     ROW DISPLAY
  ============================================================ */

  getVendorName(
    row:
      QuotationComparisonRow
  ):
    string {

    return (
      row.vendorName ||
      'Vendor'
    );
  }


  getUnitPrice(
    row:
      QuotationComparisonRow
  ):
    number {

    return this.toNumber(
      row.unitPrice
    );
  }


  getSubtotal(
    row:
      QuotationComparisonRow
  ):
    number {

    return this.toNumber(
      row.subtotal
    );
  }


  getTaxTotal(
    row:
      QuotationComparisonRow
  ):
    number {

    return this.toNumber(
      row.taxTotal
    );
  }


  getFreight(
    row:
      QuotationComparisonRow
  ):
    number {

    return this.toNumber(
      row.freightCharges
    );
  }


  getOtherCharges(
    row:
      QuotationComparisonRow
  ):
    number {

    return this.toNumber(
      row.otherCharges
    );
  }


  getGrandTotal(
    row:
      QuotationComparisonRow
  ):
    number {

    return this.toNumber(
      row.grandTotal
    );
  }


  /* ============================================================
     FORMAT
  ============================================================ */

  formatMoney(
    value:
      number |
      null |
      undefined
  ):
    string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style:
          'currency',

        currency:
          'INR',

        maximumFractionDigits:
          2
      }
    ).format(
      this.toNumber(
        value
      )
    );
  }


  formatDate(
    value:
      string |
      Date |
      null |
      undefined
  ):
    string {

    if (
      !value
    ) {

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


    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric'
      }
    ).format(
      date
    );
  }


  isExpired(
    row:
      QuotationComparisonRow
  ):
    boolean {

    if (
      !row.validUntil
    ) {

      return false;
    }


    const validUntil =
      new Date(
        row.validUntil
      );


    if (
      Number.isNaN(
        validUntil.getTime()
      )
    ) {

      return false;
    }


    validUntil.setHours(
      23,
      59,
      59,
      999
    );


    return (
      validUntil.getTime() <
      Date.now()
    );
  }


  getStatusLabel(
    status:
      PurchaseQuotationStatus
  ):
    string {

    switch (
      status
    ) {

      case 'requested':
        return 'Requested';

      case 'received':
        return 'Received';

      case 'selected':
        return 'Selected';

      case 'rejected':
        return 'Rejected';

      default:
        return String(
          status ||
          '-'
        );
    }
  }


  getStatusClass(
    status:
      PurchaseQuotationStatus
  ):
    string {

    return (
      'status-badge--' +
      String(
        status ||
        'unknown'
      )
    );
  }


  getSelectionText(
    row:
      QuotationComparisonRow
  ):
    string {

    if (
      row.status ===
        'selected'
    ) {

      return 'Selected';
    }


    if (
      this.isActionLoading &&
      this.actionQuotationId ===
        row.quotationId
    ) {

      return 'Selecting...';
    }


    return 'Select';
  }


  /* ============================================================
     MESSAGES
  ============================================================ */

  clearMessages():
    void {

    this.errorMessage =
      '';

    this.successMessage =
      '';
  }


  /* ============================================================
     TRACK
  ============================================================ */

  trackByQuotationId(
    _index:
      number,
    row:
      QuotationComparisonRow
  ):
    string {

    return row.quotationId;
  }


  /* ============================================================
     NUMBER
  ============================================================ */

  private toNumber(
    value:
      unknown
  ):
    number {

    const number =
      Number(
        value
      );


    return Number.isFinite(
      number
    )
      ? number
      : 0;
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

}
