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
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
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
  PurchasePagination,
  ReceiveVendorEnquiryPayload,
  VendorEnquiry,
  VendorEnquirySource,
  VendorEnquiryStatus,
  VendorEnquiryStatusCounts,
  VENDOR_ENQUIRY_SOURCE_OPTIONS,
  VENDOR_ENQUIRY_STATUS_OPTIONS
} from '../../models/purchase.models';

import {
  VendorEnquiryService
} from '../../services/vendor-enquiry.service';


@Component({
  selector: 'app-vendor-enquiries',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl:
    './vendor-enquiries.component.html',

  styleUrl:
    './vendor-enquiries.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class VendorEnquiriesComponent
  implements OnInit {

  /* ============================================================
     DEPENDENCIES
  ============================================================ */

  private readonly fb =
    inject(FormBuilder);

  private readonly service =
    inject(VendorEnquiryService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private readonly destroyRef =
    inject(DestroyRef);


  /* ============================================================
     DISPLAY OPTIONS
  ============================================================ */

  readonly sourceOptions =
    VENDOR_ENQUIRY_SOURCE_OPTIONS;

  readonly statusOptions =
    VENDOR_ENQUIRY_STATUS_OPTIONS;


  /* ============================================================
     LIST STATE
  ============================================================ */

  enquiries: VendorEnquiry[] = [];

  pagination: PurchasePagination = {
    total: 0,
    page: 1,
    limit: 25,
    pages: 1
  };


  statusCounts:
    VendorEnquiryStatusCounts = {
      total: 0,
      draft: 0,
      requested: 0,
      received: 0,
      closed: 0,
      cancelled: 0
    };


  isLoading = false;

  isCountsLoading = false;

  errorMessage = '';

  successMessage = '';


  /* ============================================================
     ACTION STATE
  ============================================================ */

  actionEnquiryId:
    string |
    null = null;

  actionType:
    | 'request'
    | 'receive'
    | 'close'
    | 'cancel'
    | null = null;


  /* ============================================================
     RECEIVE QUOTATION PANEL
  ============================================================ */

  receivePanelOpen =
    false;

  selectedEnquiry:
    VendorEnquiry |
    null = null;


  readonly receiveForm =
    this.fb.nonNullable.group({

      quotedPrice: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      taxPercent: [
        0,
        [
          Validators.min(0),
          Validators.max(100)
        ]
      ],

      deliveryTime: [
        ''
      ],

      paymentTerms: [
        ''
      ],

      validUntil: [
        ''
      ],

      remarks: [
        ''
      ]

    });


  /* ============================================================
     FILTER FORM
  ============================================================ */

  readonly filterForm =
    this.fb.nonNullable.group({

      search: [
        ''
      ],

      status: [
        '' as
          VendorEnquiryStatus |
          ''
      ],

      source: [
        '' as
          VendorEnquirySource |
          ''
      ],

      fromDate: [
        ''
      ],

      toDate: [
        ''
      ],

      limit: [
        25
      ]

    });


  /* ============================================================
     LIFECYCLE
  ============================================================ */

  ngOnInit():
    void {

    this.setupFilters();

    this.loadVendorEnquiries();

    this.loadStatusCounts();
  }


  /* ============================================================
     FILTERS
  ============================================================ */

  private setupFilters():
    void {

    this.filterForm
      .valueChanges
      .pipe(
        debounceTime(350),

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

          this.loadVendorEnquiries();
        }
      );
  }


  clearFilters():
    void {

    this.filterForm.reset({
      search: '',
      status: '',
      source: '',
      fromDate: '',
      toDate: '',
      limit: 25
    });

    this.pagination.page =
      1;
  }


  refresh():
    void {

    this.clearMessages();

    this.loadVendorEnquiries();

    this.loadStatusCounts();
  }


  /* ============================================================
     LOAD LIST
  ============================================================ */

  loadVendorEnquiries():
    void {

    if (
      this.isLoading
    ) {
      return;
    }


    const filters =
      this.filterForm
        .getRawValue();


    this.isLoading =
      true;

    this.errorMessage =
      '';

    this.cdr.markForCheck();


    this.service
      .getVendorEnquiries({

        search:
          filters.search,

        status:
          filters.status,

        source:
          filters.source,

        fromDate:
          filters.fromDate,

        toDate:
          filters.toDate,

        page:
          this.pagination.page,

        limit:
          Number(
            filters.limit
          ) || 25,

        sortBy:
          'createdAt',

        sortOrder:
          'desc'

      })
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

            this.enquiries =
              Array.isArray(
                response?.rows
              )
                ? response.rows
                : [];


            this.pagination =
              response?.pagination ||
              {
                total: 0,
                page: 1,
                limit: 25,
                pages: 1
              };


            this.cdr.markForCheck();
          },

        error:
          error => {

            this.enquiries =
              [];

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to load vendor enquiries.'
              );

            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     STATUS COUNTS
  ============================================================ */

  loadStatusCounts():
    void {

    this.isCountsLoading =
      true;


    this.service
      .getStatusCounts()
      .pipe(
        finalize(
          () => {

            this.isCountsLoading =
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
          counts => {

            this.statusCounts = {
              total:
                Number(
                  counts?.total ||
                  0
                ),

              draft:
                Number(
                  counts?.draft ||
                  0
                ),

              requested:
                Number(
                  counts?.requested ||
                  0
                ),

              received:
                Number(
                  counts?.received ||
                  0
                ),

              closed:
                Number(
                  counts?.closed ||
                  0
                ),

              cancelled:
                Number(
                  counts?.cancelled ||
                  0
                )
            };


            this.cdr.markForCheck();
          },

        error:
          () => {

            this.statusCounts = {
              total: 0,
              draft: 0,
              requested: 0,
              received: 0,
              closed: 0,
              cancelled: 0
            };

            this.cdr.markForCheck();
          }

      });
  }


  /* ============================================================
     SEND RFQ
  ============================================================ */

  sendRfq(
    enquiry: VendorEnquiry
  ):
    void {

    if (
      enquiry.status !==
      'draft' ||
      this.isActionLoading(
        enquiry
      )
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Send RFQ ${enquiry.rfqNumber || enquiry.enquiryNumber} to ${enquiry.vendorName}?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    this.startAction(
      enquiry,
      'request'
    );


    this.service
      .requestVendorEnquiry(
        enquiry._id
      )
      .pipe(
        finalize(
          () =>
            this.finishAction()
        ),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          () => {

            this.successMessage =
              'RFQ sent successfully.';

            this.loadVendorEnquiries();

            this.loadStatusCounts();
          },

        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to send RFQ.'
              );
          }

      });
  }


  /* ============================================================
     RECEIVE QUOTATION
  ============================================================ */

  openReceivePanel(
    enquiry: VendorEnquiry
  ):
    void {

    if (
      enquiry.status !==
      'requested'
    ) {
      return;
    }


    this.clearMessages();


    this.selectedEnquiry =
      enquiry;


    this.receiveForm.reset({

      quotedPrice:
        enquiry.quotedPrice ??
        0,

      taxPercent:
        enquiry.taxPercent ??
        0,

      deliveryTime:
        enquiry.deliveryTime ||
        '',

      paymentTerms:
        enquiry.paymentTerms ||
        '',

      validUntil:
        this.toDateInputValue(
          enquiry.validUntil
        ),

      remarks:
        enquiry.remarks ||
        ''

    });


    this.receivePanelOpen =
      true;

    this.cdr.markForCheck();
  }


  closeReceivePanel():
    void {

    if (
      this.actionType ===
      'receive'
    ) {
      return;
    }


    this.receivePanelOpen =
      false;

    this.selectedEnquiry =
      null;

    this.receiveForm.reset({
      quotedPrice: 0,
      taxPercent: 0,
      deliveryTime: '',
      paymentTerms: '',
      validUntil: '',
      remarks: ''
    });

    this.cdr.markForCheck();
  }


  submitReceivedQuotation():
    void {

    const enquiry =
      this.selectedEnquiry;


    if (
      !enquiry ||
      enquiry.status !==
      'requested'
    ) {
      return;
    }


    if (
      this.receiveForm.invalid
    ) {

      this.receiveForm
        .markAllAsTouched();

      return;
    }


    const value =
      this.receiveForm
        .getRawValue();


    const payload:
      ReceiveVendorEnquiryPayload = {

        quotedPrice:
          Number(
            value.quotedPrice
          ),

        taxPercent:
          value.taxPercent ===
            null ||
          value.taxPercent ===
            undefined
            ? null
            : Number(
                value.taxPercent
              ),

        deliveryTime:
          value.deliveryTime
            .trim(),

        paymentTerms:
          value.paymentTerms
            .trim(),

        validUntil:
          value.validUntil ||
          null,

        remarks:
          value.remarks
            .trim()

      };


    this.startAction(
      enquiry,
      'receive'
    );


    this.service
      .receiveVendorEnquiry(
        enquiry._id,
        payload
      )
      .pipe(
        finalize(
          () =>
            this.finishAction()
        ),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          () => {

            this.successMessage =
              'Vendor quotation recorded successfully.';

            this.receivePanelOpen =
              false;

            this.selectedEnquiry =
              null;

            this.loadVendorEnquiries();

            this.loadStatusCounts();
          },

        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to record vendor quotation.'
              );
          }

      });
  }


  /* ============================================================
     CLOSE ENQUIRY
  ============================================================ */

  closeEnquiry(
    enquiry: VendorEnquiry
  ):
    void {

    if (
      enquiry.status !==
      'received' ||
      this.isActionLoading(
        enquiry
      )
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Close enquiry ${enquiry.enquiryNumber}?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    this.updateStatus(
      enquiry,
      'closed',
      'close'
    );
  }


  /* ============================================================
     CANCEL ENQUIRY
  ============================================================ */

  cancelEnquiry(
    enquiry: VendorEnquiry
  ):
    void {

    if (
      ![
        'draft',
        'requested',
        'received'
      ].includes(
        enquiry.status
      ) ||
      this.isActionLoading(
        enquiry
      )
    ) {
      return;
    }


    const reason =
      window.prompt(
        'Enter cancellation reason:'
      )
        ?.trim();


    if (
      !reason
    ) {
      return;
    }


    this.updateStatus(
      enquiry,
      'cancelled',
      'cancel',
      reason
    );
  }


  /* ============================================================
     COMMON STATUS UPDATE
  ============================================================ */

  private updateStatus(
    enquiry: VendorEnquiry,
    status: VendorEnquiryStatus,
    action:
      'close' |
      'cancel',
    remarks?: string
  ):
    void {

    this.startAction(
      enquiry,
      action
    );


    this.service
      .updateVendorEnquiryStatus(
        enquiry._id,
        status,
        remarks
      )
      .pipe(
        finalize(
          () =>
            this.finishAction()
        ),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          () => {

            this.successMessage =
              status ===
              'closed'
                ? 'Vendor enquiry closed successfully.'
                : 'Vendor enquiry cancelled successfully.';


            this.loadVendorEnquiries();

            this.loadStatusCounts();
          },

        error:
          error => {

            this.errorMessage =
              this.getErrorMessage(
                error,
                'Unable to update vendor enquiry.'
              );
          }

      });
  }


  /* ============================================================
     PAGINATION
  ============================================================ */

  goToPage(
    page: number
  ):
    void {

    if (
      page <
      1 ||
      page >
      this.pagination.pages ||
      page ===
      this.pagination.page
    ) {
      return;
    }


    this.pagination.page =
      page;

    this.loadVendorEnquiries();
  }


  previousPage():
    void {

    this.goToPage(
      this.pagination.page -
      1
    );
  }


  nextPage():
    void {

    this.goToPage(
      this.pagination.page +
      1
    );
  }


  getPageNumbers():
    number[] {

    const total =
      this.pagination.pages;


    if (
      total <=
      1
    ) {
      return [1];
    }


    const current =
      this.pagination.page;


    const start =
      Math.max(
        1,
        current - 2
      );


    const end =
      Math.min(
        total,
        start + 4
      );


    const adjustedStart =
      Math.max(
        1,
        end - 4
      );


    return Array.from(
      {
        length:
          end -
          adjustedStart +
          1
      },
      (
        _,
        index
      ) =>
        adjustedStart +
        index
    );
  }


  /* ============================================================
     DISPLAY HELPERS
  ============================================================ */

  getDisplaySource(
    enquiry: VendorEnquiry
  ):
    string {

    if (
      enquiry.source ===
      'other'
    ) {

      return enquiry.otherSource
        ?.trim() ||
        'Other';
    }


    const option =
      this.sourceOptions
        .find(
          item =>
            item.value ===
            enquiry.source
        );


    return option?.label ||
      enquiry.source;
  }


  getStatusLabel(
    status: VendorEnquiryStatus
  ):
    string {

    const option =
      this.statusOptions
        .find(
          item =>
            item.value ===
            status
        );


    return option?.label ||
      status;
  }


  getStatusClass(
    status: VendorEnquiryStatus
  ):
    string {

    return `status-badge--${status.replace(
      /_/g,
      '-'
    )}`;
  }


  formatMoney(
    value:
      number |
      null |
      undefined
  ):
    string {

    if (
      value ===
        null ||
      value ===
        undefined ||
      Number.isNaN(
        Number(
          value
        )
      )
    ) {

      return '—';
    }


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
      Number(
        value
      )
    );
  }


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


  trackByEnquiryId(
    _index: number,
    enquiry: VendorEnquiry
  ):
    string {

    return enquiry._id;
  }


  /* ============================================================
     ACTION HELPERS
  ============================================================ */

  isActionLoading(
    enquiry: VendorEnquiry
  ):
    boolean {

    return (
      this.actionEnquiryId ===
      enquiry._id
    );
  }


  isSendingRfq(
    enquiry: VendorEnquiry
  ):
    boolean {

    return (
      this.isActionLoading(
        enquiry
      ) &&
      this.actionType ===
      'request'
    );
  }


  isReceivingQuotation(
    enquiry: VendorEnquiry
  ):
    boolean {

    return (
      this.isActionLoading(
        enquiry
      ) &&
      this.actionType ===
      'receive'
    );
  }


  isClosing(
    enquiry: VendorEnquiry
  ):
    boolean {

    return (
      this.isActionLoading(
        enquiry
      ) &&
      this.actionType ===
      'close'
    );
  }


  isCancelling(
    enquiry: VendorEnquiry
  ):
    boolean {

    return (
      this.isActionLoading(
        enquiry
      ) &&
      this.actionType ===
      'cancel'
    );
  }


  private startAction(
    enquiry: VendorEnquiry,
    action:
      | 'request'
      | 'receive'
      | 'close'
      | 'cancel'
  ):
    void {

    this.clearMessages();

    this.actionEnquiryId =
      enquiry._id;

    this.actionType =
      action;

    this.cdr.markForCheck();
  }


  private finishAction():
    void {

    this.actionEnquiryId =
      null;

    this.actionType =
      null;

    this.cdr.markForCheck();
  }


  /* ============================================================
     MESSAGE HELPERS
  ============================================================ */

  clearMessages():
    void {

    this.errorMessage =
      '';

    this.successMessage =
      '';
  }


  private getErrorMessage(
    error: any,
    fallback: string
  ):
    string {

    return (
      error?.error?.message ||
      error?.message ||
      fallback
    );
  }


  /* ============================================================
     DATE HELPER
  ============================================================ */

  private toDateInputValue(
    value:
      string |
      null |
      undefined
  ):
    string {

    if (
      !value
    ) {
      return '';
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
      return '';
    }


    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() +
        1
      ).padStart(
        2,
        '0'
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );


    return `${year}-${month}-${day}`;
  }

}