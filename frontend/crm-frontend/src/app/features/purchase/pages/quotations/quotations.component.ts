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
  FormBuilder,
  ReactiveFormsModule
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  PurchaseAccess,
  PurchasePagination,
  PurchaseQuotation,
  PurchaseQuotationFilters,
  PurchaseQuotationStatus,
  PurchaseVendorOption,
  PURCHASE_QUOTATION_STATUS_OPTIONS
} from '../../models/purchase.models';

import {
  PurchaseQuotationService
} from '../../services/purchase-quotation.service';

import {
  PurchaseRequestService
} from '../../services/purchase-request.service';


@Component({
  selector: 'app-quotations',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl:
    './quotations.component.html',

  styleUrl:
    './quotations.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class QuotationsComponent
  implements OnInit {

  /* ============================================================
     DEPENDENCIES
  ============================================================ */

  private readonly fb =
    inject(FormBuilder);

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
     OPTIONS
  ============================================================ */

  readonly statusOptions =
    PURCHASE_QUOTATION_STATUS_OPTIONS;


  /* ============================================================
     DATA
  ============================================================ */

  quotations:
    PurchaseQuotation[] = [];

  purchaseAccess:
    PurchaseAccess | null = null;


  pagination:
    PurchasePagination = {

      total:
        0,

      page:
        1,

      limit:
        25,

      pages:
        1

    };


  /* ============================================================
     UI STATE
  ============================================================ */

  isLoading =
    false;


  errorMessage =
    '';


  successMessage =
    '';


  actionQuotationId =
    '';


  actionType:
    'select' |
    'reject' |
    '' = '';


  /* ============================================================
     FILTER FORM
  ============================================================ */

  readonly filterForm =
    this.fb.nonNullable.group({

      search:
        '',

      status:
        '' as
          PurchaseQuotationStatus |
          '',

      fromDate:
        '',

      toDate:
        '',

      limit:
        25

    });


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit():
    void {

    this.setupFilters();

    this.loadPurchaseAccess();

    this.loadQuotations();
  }


  private loadPurchaseAccess(): void {

    this.purchaseRequestService
      .getPurchaseAccess()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({
        next: access => {
          this.purchaseAccess = access;
          this.cdr.markForCheck();
        },
        error: () => {
          this.purchaseAccess = null;
          this.cdr.markForCheck();
        }
      });
  }


  get canApprove(): boolean {

    return this.purchaseAccess
      ?.canApprove === true;
  }


  /* ============================================================
     FILTER SUBSCRIPTION
  ============================================================ */

  private setupFilters():
    void {

    this.filterForm
      .valueChanges
      .pipe(

        debounceTime(
          350
        ),

        distinctUntilChanged(
          (
            previous,
            current
          ) =>
            JSON.stringify(
              previous
            ) ===
            JSON.stringify(
              current
            )
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe(
        () => {

          this.pagination.page =
            1;

          this.loadQuotations();
        }
      );
  }


  /* ============================================================
     LOAD QUOTATIONS
  ============================================================ */

  loadQuotations():
    void {

    this.isLoading =
      true;

    this.errorMessage =
      '';

    this.cdr.markForCheck();


    const filters =
      this.buildFilters();


    this.quotationService
      .getQuotations(
        filters
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

            this.quotations =
              Array.isArray(
                response?.rows
              )
                ? response.rows
                : [];


            if (
              response?.pagination
            ) {

              this.pagination = {

                total:
                  Number(
                    response.pagination.total ||
                    0
                  ),

                page:
                  Number(
                    response.pagination.page ||
                    1
                  ),

                limit:
                  Number(
                    response.pagination.limit ||
                    25
                  ),

                pages:
                  Math.max(
                    1,
                    Number(
                      response.pagination.pages ||
                      1
                    )
                  )

              };
            }


            this.cdr.markForCheck();
          },


        error:
          error => {

            this.quotations =
              [];


            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to load quotations.'
              );


            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     BUILD FILTERS
  ============================================================ */

  private buildFilters():
    PurchaseQuotationFilters {

    const value =
      this.filterForm
        .getRawValue();


    return {

      search:
        value.search.trim(),

      status:
        value.status,

      fromDate:
        value.fromDate,

      toDate:
        value.toDate,

      page:
        this.pagination.page,

      limit:
        Number(
          value.limit ||
          25
        )

    };
  }


  /* ============================================================
     CLEAR FILTERS
  ============================================================ */

  clearFilters():
    void {

    this.pagination.page =
      1;


    this.filterForm.reset({

      search:
        '',

      status:
        '',

      fromDate:
        '',

      toDate:
        '',

      limit:
        25

    });
  }


  /* ============================================================
     REFRESH
  ============================================================ */

  refresh():
    void {

    this.loadQuotations();
  }


  /* ============================================================
     SELECT QUOTATION
  ============================================================ */

  selectQuotation(
    quotation:
      PurchaseQuotation
  ):
    void {

    if (
      !this.canApprove ||
      quotation.status !==
      'received'
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Select quotation ${quotation.quotationNumber} from ${this.getVendorName(quotation)}?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    this.clearMessages();


    this.actionQuotationId =
      quotation._id;

    this.actionType =
      'select';

    this.cdr.markForCheck();


    this.quotationService
      .selectQuotation(
        quotation._id
      )
      .pipe(

        finalize(
          () => {

            this.actionQuotationId =
              '';

            this.actionType =
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


            this.loadQuotations();

            this.cdr.markForCheck();
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
     REJECT QUOTATION
  ============================================================ */

  rejectQuotation(
    quotation:
      PurchaseQuotation
  ):
    void {

    if (
      !this.canApprove ||
      quotation.status !==
        'received' &&
      quotation.status !==
        'requested'
    ) {

      return;
    }


    const remarks =
      window.prompt(
        `Enter rejection reason for ${quotation.quotationNumber}:`
      );


    if (
      remarks ===
      null
    ) {

      return;
    }


    const trimmedRemarks =
      remarks.trim();


    if (
      !trimmedRemarks
    ) {

      this.errorMessage =
        'Rejection reason is required.';

      this.cdr.markForCheck();

      return;
    }


    this.clearMessages();


    this.actionQuotationId =
      quotation._id;

    this.actionType =
      'reject';

    this.cdr.markForCheck();


    this.quotationService
      .rejectQuotation(
        quotation._id,
        trimmedRemarks
      )
      .pipe(

        finalize(
          () => {

            this.actionQuotationId =
              '';

            this.actionType =
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


            this.loadQuotations();

            this.cdr.markForCheck();
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
     COMPARISON
  ============================================================ */

  compareQuotation(
    quotation:
      PurchaseQuotation
  ):
    void {

    const purchaseRequestId =
      this.getPurchaseRequestId(
        quotation
      );


    if (
      !purchaseRequestId
    ) {

      this.errorMessage =
        'This quotation is not linked to a Purchase Request, so comparison is not available.';

      this.cdr.markForCheck();

      return;
    }


    void this.router.navigate(
      [
        '/purchase/quotations/comparison'
      ],
      {
        queryParams: {
          purchaseRequestId
        }
      }
    );
  }


  /* ============================================================
     PAGINATION
  ============================================================ */

  previousPage():
    void {

    if (
      this.pagination.page <=
      1 ||
      this.isLoading
    ) {

      return;
    }


    this.pagination.page -=
      1;


    this.loadQuotations();
  }


  nextPage():
    void {

    if (
      this.pagination.page >=
      this.pagination.pages ||
      this.isLoading
    ) {

      return;
    }


    this.pagination.page +=
      1;


    this.loadQuotations();
  }


  goToPage(
    page:
      number
  ):
    void {

    if (
      page < 1 ||
      page >
        this.pagination.pages ||
      page ===
        this.pagination.page ||
      this.isLoading
    ) {

      return;
    }


    this.pagination.page =
      page;


    this.loadQuotations();
  }


  getPageNumbers():
    number[] {

    const totalPages =
      this.pagination.pages;


    const currentPage =
      this.pagination.page;


    const maxVisible =
      5;


    let start =
      Math.max(
        1,
        currentPage -
        Math.floor(
          maxVisible /
          2
        )
      );


    let end =
      Math.min(
        totalPages,
        start +
        maxVisible -
        1
      );


    if (
      end -
      start +
      1 <
      maxVisible
    ) {

      start =
        Math.max(
          1,
          end -
          maxVisible +
          1
        );
    }


    const pages:
      number[] = [];


    for (
      let page =
        start;
      page <=
        end;
      page++
    ) {

      pages.push(
        page
      );
    }


    return pages;
  }


  /* ============================================================
     VENDOR DISPLAY
  ============================================================ */

  getVendorName(
    quotation:
      PurchaseQuotation
  ):
    string {

    const vendor =
      quotation.vendor;


    if (
      !vendor
    ) {

      return 'Vendor';
    }


    if (
      typeof vendor ===
      'string'
    ) {

      return 'Vendor';
    }


    return (
      vendor.name ||
      vendor.companyName ||
      'Vendor'
    );
  }


  getVendorCode(
    quotation:
      PurchaseQuotation
  ):
    string {

    const vendor =
      quotation.vendor as
        (
          PurchaseVendorOption & {
            vendorCode?: string;
          }
        ) |
        string;


    if (
      !vendor ||
      typeof vendor ===
      'string'
    ) {

      return '';
    }


    return (
      vendor.vendorCode ||
      ''
    );
  }


  /* ============================================================
     PURCHASE REQUEST DISPLAY
  ============================================================ */

  getPurchaseRequestNumber(
    quotation:
      PurchaseQuotation
  ):
    string {
  
    const request =
      quotation.purchaseRequest;
  
  
    if (
      request &&
      typeof request !==
        'string'
    ) {
  
      return (
        request.prNumber ||
        'Linked PR'
      );
    }
  
  
    if (
      quotation.purchaseRequestId ||
      typeof request ===
        'string'
    ) {
  
      return 'Linked PR';
    }
  
  
    return '—';
  }


  private getPurchaseRequestId(
    quotation:
      PurchaseQuotation
  ):
    string {
  
    if (
      quotation.purchaseRequestId
    ) {
  
      return String(
        quotation.purchaseRequestId
      );
    }
  
  
    const request =
      quotation.purchaseRequest;
  
  
    if (
      !request
    ) {
  
      return '';
    }
  
  
    if (
      typeof request ===
        'string'
    ) {
  
      return request;
    }
  
  
    return (
      request._id ||
      ''
    );
  }


  /* ============================================================
     ITEM DISPLAY
  ============================================================ */

  getPrimaryItemName(
    quotation:
      PurchaseQuotation
  ):
    string {

    if (
      !Array.isArray(
        quotation.items
      ) ||
      quotation.items.length ===
        0
    ) {

      return '—';
    }


    return (
      quotation.items[0]
        ?.itemName ||
      '—'
    );
  }


  getItemSummary(
    quotation:
      PurchaseQuotation
  ):
    string {

    if (
      !Array.isArray(
        quotation.items
      ) ||
      quotation.items.length ===
        0
    ) {

      return '';
    }


    const firstItem =
      quotation.items[0];


    const firstSummary =
      `${firstItem.quantity} ${firstItem.unit}`;


    if (
      quotation.items.length ===
      1
    ) {

      return firstSummary;
    }


    return `${firstSummary} +${quotation.items.length - 1} more`;
  }


  /* ============================================================
     STATUS
  ============================================================ */

  getStatusLabel(
    status:
      PurchaseQuotationStatus
  ):
    string {

    return (
      this.statusOptions.find(
        option =>
          option.value ===
          status
      )?.label ||
      status
    );
  }


  getStatusClass(
    status:
      PurchaseQuotationStatus
  ):
    string {

    return `status-badge--${status}`;
  }


  /* ============================================================
     ACTION HELPERS
  ============================================================ */

  isActionLoading(
    quotation:
      PurchaseQuotation
  ):
    boolean {

    return (
      this.actionQuotationId ===
      quotation._id
    );
  }


  isSelecting(
    quotation:
      PurchaseQuotation
  ):
    boolean {

    return (
      this.actionQuotationId ===
        quotation._id &&
      this.actionType ===
        'select'
    );
  }


  isRejecting(
    quotation:
      PurchaseQuotation
  ):
    boolean {

    return (
      this.actionQuotationId ===
        quotation._id &&
      this.actionType ===
        'reject'
    );
  }


  /* ============================================================
     FORMAT MONEY
  ============================================================ */

  formatMoney(
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
      amount
    );
  }


  /* ============================================================
     DATE
  ============================================================ */

  formatDate(
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


  /* ============================================================
     VALIDITY
  ============================================================ */

  isExpired(
    quotation:
      PurchaseQuotation
  ):
    boolean {

    if (
      !quotation.validUntil
    ) {

      return false;
    }


    const validUntil =
      new Date(
        quotation.validUntil
      );


    if (
      Number.isNaN(
        validUntil.getTime()
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


    validUntil.setHours(
      0,
      0,
      0,
      0
    );


    return (
      validUntil <
        today &&
      quotation.status !==
        'selected'
    );
  }


  /* ============================================================
     TRACK BY
  ============================================================ */

  trackByQuotationId(
    _index:
      number,
    quotation:
      PurchaseQuotation
  ):
    string {

    return quotation._id;
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
