import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    computed,
    inject,
    signal
  } from '@angular/core';
  
  import {
    CommonModule
  } from '@angular/common';

  import {
    Router
  } from '@angular/router';
  
  import {
    FormBuilder,
    ReactiveFormsModule,
    Validators
  } from '@angular/forms';
  
  import {
    finalize
  } from 'rxjs/operators';
  import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
  import { DepartmentInvoiceRealtimeService } from '../../../../core/services/department-invoice-realtime.service';
  
  import {
    DepartmentInvoice,
    DepartmentInvoiceDocument,
    DepartmentInvoicePayment,
    DepartmentInvoiceSourceDepartment,
    DepartmentInvoiceSourceModule,
    DepartmentInvoiceStatus
  } from '../../models/accounts.models';
  
  import {
    DepartmentInvoiceService
  } from '../../services/department-invoice.service';
  
  
  @Component({
    selector:
      'app-department-invoices',
  
    standalone:
      true,
  
    imports: [
      CommonModule,
      ReactiveFormsModule
    ],
  
    templateUrl:
      './department-invoices.component.html',
  
    styleUrl:
      './department-invoices.component.scss',
  
    changeDetection:
      ChangeDetectionStrategy.OnPush
  })
  export class DepartmentInvoicesComponent
  implements OnInit {
  
    private readonly fb =
      inject(FormBuilder);
    private readonly router =
      inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly realtime = inject(DepartmentInvoiceRealtimeService);
  
    readonly departmentInvoiceService =
      inject(DepartmentInvoiceService);
  
  
    /* =========================================================
       DATA
    ========================================================= */
  
    readonly invoices =
      signal<DepartmentInvoice[]>([]);
  
    readonly selectedInvoice =
      signal<DepartmentInvoice | null>(
        null
      );
  
  
    /* =========================================================
       LOADING / ACTION STATE
    ========================================================= */
  
    readonly loading =
      signal(false);
  
    readonly actionLoading =
      signal(false);
  
    readonly selectedAction =
      signal<
        'verify' |
        'reject' |
        'payment' |
        'receipt' |
        null
      >(null);
  
  
    readonly error =
      signal('');
  
    readonly message =
      signal('');
  
      /* =========================================================
      SETTLEMENT SUCCESS ANIMATION
   ========================================================= */
   
   readonly settlementSuccessVisible =
     signal(false);
   
   readonly settlementSuccessType =
     signal<
       'payment' |
       'receipt'
     >('payment');
   
   readonly settlementSuccessAmount =
     signal(0);
   
   readonly settlementSuccessCurrency =
     signal('INR');
   
   readonly settlementSuccessInvoiceNumber =
     signal('');
   
   private settlementSuccessTimer:
     ReturnType<typeof setTimeout> |
     null =
       null;
    /* =========================================================
       FILTERS
    ========================================================= */
  
    readonly search =
      signal('');
  
    readonly statusFilter =
      signal<
        DepartmentInvoiceStatus |
        ''
      >('');
  
    readonly departmentFilter =
      signal<
        DepartmentInvoiceSourceDepartment |
        ''
      >('');
  
    readonly moduleFilter =
      signal<
        DepartmentInvoiceSourceModule |
        ''
      >('');
  
  
    /* =========================================================
       PAGINATION
    ========================================================= */
  
    readonly page =
      signal(1);
  
    readonly limit =
      signal(20);
  
    readonly total =
      signal(0);
  
    readonly pages =
      signal(1);
  
  
    /* =========================================================
       FORMS
    ========================================================= */
  
    readonly verifyForm =
      this.fb.group({
  
        remarks: [
          '',
          [
            Validators.maxLength(
              1500
            )
          ]
        ]
  
      });
  
  
    readonly rejectForm =
      this.fb.group({
  
        reason: [
          '',
          [
            Validators.required,
            Validators.maxLength(
              1500
            )
          ]
        ]
  
      });
  
  
    readonly settlementForm =
      this.fb.group({
  
        amount: [
          0,
          [
            Validators.required,
            Validators.min(
              0.01
            )
          ]
        ],
  
        paymentDate: [
          this.today(),
          Validators.required
        ],
  
        paymentMode: [
          ''
        ],
  
        /*
         * Global CRM "Other" dropdown rule:
         * When paymentMode is "Other", this field
         * stores the user-entered custom payment mode.
         */
        paymentModeOther: [
          '',
          [
            Validators.maxLength(
              100
            )
          ]
        ],
  
        paymentReference: [
          ''
        ],
  
        remarks: [
          ''
        ]
  
      });
  
  
    /* =========================================================
       SUMMARY COUNTERS
  
       These operate on the currently loaded result set.
       Dashboard-wide totals can be added later separately.
    ========================================================= */
  
    readonly sentCount =
      computed(
        () =>
          this.invoices()
            .filter(
              invoice =>
                invoice.status ===
                  'sent'
            )
            .length
      );
  
  
    readonly verifiedCount =
      computed(
        () =>
          this.invoices()
            .filter(
              invoice =>
                invoice.status ===
                  'verified'
            )
            .length
      );
  
  
    readonly partialCount =
      computed(
        () =>
          this.invoices()
            .filter(
              invoice =>
                invoice.status ===
                  'partially_paid'
            )
            .length
      );
  
  
    readonly paidCount =
      computed(
        () =>
          this.invoices()
            .filter(
              invoice =>
                invoice.status ===
                  'paid'
            )
            .length
      );
  
  
    readonly purchaseCount =
      computed(
        () =>
          this.invoices()
            .filter(
              invoice =>
                invoice.sourceDepartment ===
                  'purchase'
            )
            .length
      );
  
  
    readonly logisticsCount =
      computed(
        () =>
          this.invoices()
            .filter(
              invoice =>
                invoice.sourceDepartment ===
                  'logistics'
            )
            .length
      );
  
  
    /* =========================================================
       INIT
    ========================================================= */
  
    ngOnInit(): void {
  
      this.loadInvoices();
      this.realtime.connect();
      this.realtime.updates$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.loadInvoices());
    }
  
  
    /* =========================================================
       LOAD LIST
    ========================================================= */
  
    loadInvoices(): void {
  
      this.loading.set(true);
  
      this.error.set('');
  
      this.departmentInvoiceService
        .getDepartmentInvoices({
  
          search:
            this.search()
              .trim() ||
            undefined,
  
          status:
            this.statusFilter() ||
            undefined,
  
          sourceDepartment:
            this.departmentFilter() ||
            undefined,
  
          sourceModule:
            this.moduleFilter() ||
            undefined,
  
          page:
            this.page(),
  
          limit:
            this.limit()
  
        })
        .pipe(
          finalize(
            () =>
              this.loading.set(
                false
              )
          )
        )
        .subscribe({
  
          next: (
            result
          ) => {
  
            this.invoices.set(
              Array.isArray(
                result?.rows
              )
                ? result.rows
                : []
            );
  
            this.total.set(
              Number(
                result?.pagination
                  ?.total ||
                0
              )
            );
  
            this.page.set(
              Number(
                result?.pagination
                  ?.page ||
                1
              )
            );
  
            this.limit.set(
              Number(
                result?.pagination
                  ?.limit ||
                20
              )
            );
  
            this.pages.set(
              Math.max(
                Number(
                  result?.pagination
                    ?.pages ||
                  1
                ),
                1
              )
            );
          },
  
          error: (
            err
          ) => {
  
            this.invoices.set([]);
  
            this.total.set(0);
  
            this.pages.set(1);
  
            this.error.set(
              this.extractErrorMessage(
                err,
                'Unable to load incoming invoices.'
              )
            );
          }
  
        });
    }
  
  
    /* =========================================================
       FILTER EVENTS
    ========================================================= */
  
    onSearchChange(
      value: string
    ): void {
  
      this.search.set(
        value
      );
    }
  
  
    onStatusChange(
      value: string
    ): void {
  
      this.statusFilter.set(
        value as
          DepartmentInvoiceStatus |
          ''
      );
    }
  
  
    onDepartmentChange(
      value: string
    ): void {
  
      this.departmentFilter.set(
        value as
          DepartmentInvoiceSourceDepartment |
          ''
      );
    }
  
  
    onModuleChange(
      value: string
    ): void {
  
      this.moduleFilter.set(
        value as
          DepartmentInvoiceSourceModule |
          ''
      );
    }
  
  
    applyFilters(): void {
  
      this.page.set(1);
  
      this.loadInvoices();
    }
  
  
    resetFilters(): void {
  
      this.search.set('');
  
      this.statusFilter.set('');
  
      this.departmentFilter.set('');
  
      this.moduleFilter.set('');
  
      this.page.set(1);
  
      this.loadInvoices();
    }
  
  
    /* =========================================================
       PAGINATION
    ========================================================= */
  
    previousPage(): void {
  
      if (
        this.page() <=
        1
      ) {
        return;
      }
  
      this.page.update(
        value =>
          value -
          1
      );
  
      this.loadInvoices();
    }
  
  
    nextPage(): void {
  
      if (
        this.page() >=
        this.pages()
      ) {
        return;
      }
  
      this.page.update(
        value =>
          value +
          1
      );
  
      this.loadInvoices();
    }
  
  
    /* =========================================================
       OPEN DETAILS
    ========================================================= */
  
    openDetails(
      invoice: DepartmentInvoice
    ): void {
  
      this.error.set('');
  
      this.message.set('');
  
      this.selectedInvoice.set(
        invoice
      );
  
      this.selectedAction.set(
        null
      );
    }
  
  
    refreshSelectedInvoice(): void {
  
      const invoice =
        this.selectedInvoice();
  
      if (
        !invoice?._id
      ) {
        return;
      }
  
  
      this.actionLoading.set(
        true
      );
  
  
      this.departmentInvoiceService
        .getDepartmentInvoice(
          invoice._id
        )
        .pipe(
          finalize(
            () =>
              this.actionLoading.set(
                false
              )
          )
        )
        .subscribe({
  
          next: (
            updated
          ) => {
  
            this.selectedInvoice.set(
              updated
            );
  
            this.replaceInvoiceInList(
              updated
            );
          },
  
          error: (
            err
          ) => {
  
            this.error.set(
              this.extractErrorMessage(
                err,
                'Unable to refresh invoice details.'
              )
            );
          }
  
        });
    }
  
  
    closeDetails(): void {
  
      if (
        this.actionLoading()
      ) {
        return;
      }
  
      this.selectedInvoice.set(
        null
      );
  
      this.selectedAction.set(
        null
      );
  
      this.verifyForm.reset({
        remarks:
          ''
      });
  
      this.rejectForm.reset({
        reason:
          ''
      });
  
      this.resetSettlementForm();
    }
  
  
    /* =========================================================
       VERIFY
    ========================================================= */
  
    startVerify(
      invoice: DepartmentInvoice
    ): void {
  
      if (
        !this.departmentInvoiceService
          .canVerify(
            invoice
          )
      ) {
        return;
      }
  
      this.selectedInvoice.set(
        invoice
      );
  
      this.verifyForm.reset({
        remarks:
          invoice.accountsRemarks ||
          ''
      });
  
      this.selectedAction.set(
        'verify'
      );
    }
  
  
    submitVerify(): void {
  
      const invoice =
        this.selectedInvoice();
  
      if (
        !invoice?._id ||
        this.actionLoading()
      ) {
        return;
      }
  
  
      if (
        this.verifyForm.invalid
      ) {
  
        this.verifyForm
          .markAllAsTouched();
  
        return;
      }
  
  
      this.actionLoading.set(true);
  
      this.error.set('');
  
      this.message.set('');
  
  
      this.departmentInvoiceService
        .verifyDepartmentInvoice(
          invoice._id,
          {
            remarks:
              String(
                this.verifyForm
                  .controls
                  .remarks
                  .value ||
                ''
              )
                .trim()
          }
        )
        .pipe(
          finalize(
            () =>
              this.actionLoading.set(
                false
              )
          )
        )
        .subscribe({
  
          next: (
            updated
          ) => {
  
            this.selectedInvoice.set(
              updated
            );
  
            this.replaceInvoiceInList(
              updated
            );
  
            this.selectedAction.set(
              null
            );
  
            this.message.set(
              'Invoice verified successfully.'
            );
          },
  
          error: (
            err
          ) => {
  
            this.error.set(
              this.extractErrorMessage(
                err,
                'Unable to verify invoice.'
              )
            );
          }
  
        });
    }
  
  
    /* =========================================================
       REJECT
    ========================================================= */
  
    startReject(
      invoice: DepartmentInvoice
    ): void {
  
      if (
        !this.departmentInvoiceService
          .canReject(
            invoice
          )
      ) {
        return;
      }
  
      this.selectedInvoice.set(
        invoice
      );
  
      this.rejectForm.reset({
        reason:
          ''
      });
  
      this.selectedAction.set(
        'reject'
      );
    }
  
  
    submitReject(): void {
  
      const invoice =
        this.selectedInvoice();
  
      if (
        !invoice?._id ||
        this.actionLoading()
      ) {
        return;
      }
  
  
      if (
        this.rejectForm.invalid
      ) {
  
        this.rejectForm
          .markAllAsTouched();
  
        return;
      }
  
  
      const reason =
        String(
          this.rejectForm
            .controls
            .reason
            .value ||
          ''
        )
          .trim();
  
  
      if (
        !reason
      ) {
        return;
      }
  
  
      this.actionLoading.set(true);
  
      this.error.set('');
  
      this.message.set('');
  
  
      this.departmentInvoiceService
        .rejectDepartmentInvoice(
          invoice._id,
          {
            reason
          }
        )
        .pipe(
          finalize(
            () =>
              this.actionLoading.set(
                false
              )
          )
        )
        .subscribe({
  
          next: (
            updated
          ) => {
  
            this.selectedInvoice.set(
              updated
            );
  
            this.replaceInvoiceInList(
              updated
            );
  
            this.selectedAction.set(
              null
            );
  
            this.message.set(
              'Invoice rejected.'
            );
          },
  
          error: (
            err
          ) => {
  
            this.error.set(
              this.extractErrorMessage(
                err,
                'Unable to reject invoice.'
              )
            );
          }
  
        });
    }
  
  
    /* =========================================================
       START SETTLEMENT
  
       Purchase Invoice:
       no direct payment from DepartmentInvoice.
  
       Logistics Vendor Payment:
       Record Payment.
  
       Logistics Invoice:
       Record Receipt.
    ========================================================= */
  
    startSettlement(
      invoice: DepartmentInvoice
    ): void {
  
      if (
        !this.departmentInvoiceService
          .canRecordSettlement(
            invoice
          )
      ) {
        return;
      }
  
  
      this.selectedInvoice.set(
        invoice
      );
  
  
      this.resetSettlementForm();
  
  
      this.settlementForm
        .controls
        .amount
        .setValue(
          Number(
            invoice.remainingAmount ||
            0
          )
        );
  
  
      if (
        invoice.sourceModule ===
        'logistics_invoice'
      ) {
  
        this.selectedAction.set(
          'receipt'
        );
  
      } else {
  
        this.selectedAction.set(
          'payment'
        );
      }
    }
  
  
    /* =========================================================
       PAYMENT MODE
    ========================================================= */
  
    onPaymentModeChange(): void {
  
      const paymentMode =
        String(
          this.settlementForm
            .controls
            .paymentMode
            .value ||
          ''
        )
          .trim();
  
  
      const otherControl =
        this.settlementForm
          .controls
          .paymentModeOther;
  
  
      if (
        paymentMode ===
        'Other'
      ) {
  
        otherControl.setValidators([
          Validators.required,
          Validators.maxLength(
            100
          )
        ]);
  
      } else {
  
        otherControl.clearValidators();
  
        otherControl.setValidators([
          Validators.maxLength(
            100
          )
        ]);
  
        otherControl.setValue(
          ''
        );
      }
  
  
      otherControl
        .updateValueAndValidity({
          emitEvent:
            false
        });
    }
  
  
    isOtherPaymentMode(): boolean {
  
      return (
        String(
          this.settlementForm
            .controls
            .paymentMode
            .value ||
          ''
        )
          .trim() ===
        'Other'
      );
    }
  
  
    /* =========================================================
       SUBMIT SETTLEMENT
    ========================================================= */
  
    submitSettlement(): void {
  
      const invoice =
        this.selectedInvoice();
  
      if (
        !invoice?._id ||
        this.actionLoading()
      ) {
        return;
      }
  
  
      if (
        invoice.sourceModule ===
        'purchase_invoice'
      ) {
  
        this.error.set(
          'Purchase invoices must be settled through the Payment Voucher allocation flow.'
        );
  
        return;
      }
  
  
      this.onPaymentModeChange();
  
  
      if (
        this.settlementForm.invalid
      ) {
  
        this.settlementForm
          .markAllAsTouched();
  
        return;
      }
  
  
      const amount =
        Number(
          this.settlementForm
            .controls
            .amount
            .value ||
          0
        );
  
  
      const remainingAmount =
        Number(
          invoice.remainingAmount ||
          0
        );
  
  
      if (
        amount <=
        0
      ) {
  
        this.error.set(
          'Settlement amount must be greater than zero.'
        );
  
        return;
      }
  
  
      if (
        amount >
        remainingAmount
      ) {
  
        this.error.set(
          `Settlement amount cannot exceed the remaining amount of ${this.formatCurrency(
            remainingAmount,
            invoice.currency
          )}.`
        );
  
        return;
      }
  
  
      const selectedPaymentMode =
        String(
          this.settlementForm
            .controls
            .paymentMode
            .value ||
          ''
        )
          .trim();
  
  
      const customPaymentMode =
        String(
          this.settlementForm
            .controls
            .paymentModeOther
            .value ||
          ''
        )
          .trim();
  
  
      if (
        selectedPaymentMode ===
          'Other' &&
        !customPaymentMode
      ) {
  
        this.settlementForm
          .controls
          .paymentModeOther
          .markAsTouched();
  
        this.error.set(
          'Please enter the payment mode.'
        );
  
        return;
      }
  
  
      const paymentMode =
        selectedPaymentMode ===
        'Other'
  
          ? customPaymentMode
  
          : selectedPaymentMode;
  
  
      const payload = {
  
        amount,
  
        paymentDate:
          String(
            this.settlementForm
              .controls
              .paymentDate
              .value ||
            ''
          ),
  
        paymentMode,
  
        paymentReference:
          String(
            this.settlementForm
              .controls
              .paymentReference
              .value ||
            ''
          )
            .trim(),
  
        remarks:
          String(
            this.settlementForm
              .controls
              .remarks
              .value ||
            ''
          )
            .trim()
  
      };
  
  
      this.actionLoading.set(true);
  
      this.error.set('');
  
      this.message.set('');
  
  
      const request =
        invoice.sourceModule ===
        'logistics_invoice'
  
          ? this.departmentInvoiceService
              .recordCustomerReceipt(
                invoice._id,
                payload
              )
  
          : this.departmentInvoiceService
              .recordVendorPayment(
                invoice._id,
                payload
              );
  
  
      request
        .pipe(
          finalize(
            () =>
              this.actionLoading.set(
                false
              )
          )
        )
        .subscribe({
  
            next: (
                updated
              ) => {
              
                const successType:
                  'payment' |
                  'receipt' =
              
                    invoice.sourceModule ===
                    'logistics_invoice'
              
                      ? 'receipt'
              
                      : 'payment';
              
              
                this.selectedInvoice.set(
                  updated
                );
              
              
                this.replaceInvoiceInList(
                  updated
                );
              
              
                this.selectedAction.set(
                  null
                );
              
              
                this.message.set(
              
                  successType ===
                  'receipt'
              
                    ? 'Receipt recorded successfully.'
              
                    : 'Payment recorded successfully.'
                );
              
              
                this.showSettlementSuccess({
                  type:
                    successType,
              
                  amount,
              
                  currency:
                    invoice.currency ||
                    'INR',
              
                  invoiceNumber:
                    invoice.invoiceNumber ||
                    ''
                });
              
              
                this.resetSettlementForm();
              },
  
          error: (
            err
          ) => {
  
            this.error.set(
              this.extractErrorMessage(
                err,
  
                invoice.sourceModule ===
                'logistics_invoice'
  
                  ? 'Unable to record receipt.'
  
                  : 'Unable to record payment.'
              )
            );
          }
  
        });
    }
  
  
    /* =========================================================
       CANCEL ACTION
    ========================================================= */
  
    cancelAction(): void {
  
      if (
        this.actionLoading()
      ) {
        return;
      }
  
      this.selectedAction.set(
        null
      );
  
      this.error.set('');
  
      this.resetSettlementForm();
    }
  
  
    /* =========================================================
       PERMISSION / ACTION HELPERS
    ========================================================= */
  
    canVerify(
      invoice: DepartmentInvoice
    ): boolean {
  
      return this.departmentInvoiceService
        .canVerify(
          invoice
        );
    }
  
  
    canReject(
      invoice: DepartmentInvoice
    ): boolean {
  
      return this.departmentInvoiceService
        .canReject(
          invoice
        );
    }
  
  
    canSettle(
      invoice: DepartmentInvoice
    ): boolean {
  
      return this.departmentInvoiceService
        .canRecordSettlement(
          invoice
        );
    }
  
  
    isPurchaseInvoice(
      invoice: DepartmentInvoice
    ): boolean {
  
      return (
        invoice.sourceModule ===
        'purchase_invoice'
      );
    }
    /* =========================================================
    PURCHASE PAYMENT VOUCHER NAVIGATION
 ========================================================= */
 
 canCreatePurchasePaymentVoucher(
   invoice: DepartmentInvoice
 ): boolean {
 
   return (
     invoice.sourceModule ===
       'purchase_invoice' &&
     (
       invoice.status ===
         'verified' ||
       invoice.status ===
         'partially_paid'
     ) &&
     invoice.companyAdminApprovalStatus ===
       'approved' &&
     Number(
       invoice.remainingAmount ||
       0
     ) >
       0
   );
 }
 
 
 openPurchasePaymentVoucher(
   invoice: DepartmentInvoice
 ): void {
 
   if (
     !this.canCreatePurchasePaymentVoucher(
       invoice
     )
   ) {
     return;
   }
 
 
   const purchaseInvoiceId =
     String(
       invoice.sourceRecordId ||
       ''
     )
       .trim();
 
 
   if (
     !purchaseInvoiceId
   ) {
 
     this.error.set(
       'Purchase Invoice reference is unavailable.'
     );
 
     return;
   }
 
 
   this.closeDetails();
 
 
   void this.router.navigate(
     [
       '/accounts/payments'
     ],
     {
       queryParams: {
 
         purchaseInvoiceId,
 
         departmentInvoiceId:
           invoice._id,
 
         invoiceNumber:
           invoice.invoiceNumber ||
           undefined
 
       }
     }
   );
 }
  
    isVendorPayment(
      invoice: DepartmentInvoice
    ): boolean {
  
      return (
        invoice.sourceModule ===
        'logistics_vendor_payment'
      );
    }
  
  
    isLogisticsInvoice(
      invoice: DepartmentInvoice
    ): boolean {
  
      return (
        invoice.sourceModule ===
        'logistics_invoice'
      );
    }
  
  
    /* =========================================================
       LABELS
    ========================================================= */
  
    departmentLabel(
      department:
        DepartmentInvoiceSourceDepartment
    ): string {
  
      switch (
        department
      ) {
  
        case 'purchase':
          return 'Purchase';
  
        case 'logistics':
          return 'Logistics';
  
        default:
          return department;
      }
    }
  
  
    sourceModuleLabel(
      sourceModule:
        DepartmentInvoiceSourceModule
    ): string {
  
      switch (
        sourceModule
      ) {
  
        case 'purchase_invoice':
          return 'Purchase Invoice';
  
        case 'logistics_vendor_payment':
          return 'Logistics Vendor Payment';
  
        case 'logistics_invoice':
          return 'Logistics Invoice';
  
        default:
          return sourceModule;
      }
    }
  
  
    statusLabel(
      status:
        DepartmentInvoiceStatus
    ): string {
  
      switch (
        status
      ) {
  
        case 'sent':
          return 'Sent';
  
        case 'under_review':
          return 'Under Review';
  
        case 'verified':
          return 'Verified';
  
        case 'partially_paid':
          return 'Partially Paid';
  
        case 'paid':
          return 'Paid';
  
        case 'rejected':
          return 'Rejected';
  
        default:
          return status;
      }
    }
  
  
    statusClass(
      status:
        DepartmentInvoiceStatus
    ): string {
  
      return `status-${status}`;
    }
  
  
    settlementActionLabel(
      invoice: DepartmentInvoice
    ): string {
  
      if (
        invoice.sourceModule ===
        'logistics_invoice'
      ) {
        return 'Record Receipt';
      }
  
      if (
        invoice.sourceModule ===
        'logistics_vendor_payment'
      ) {
        return 'Record Payment';
      }
  
      return 'Payment Voucher';
    }
  
  
    settlementTitle(): string {
  
      const invoice =
        this.selectedInvoice();
  
      if (
        !invoice
      ) {
        return 'Settlement';
      }
  
      return (
        invoice.sourceModule ===
        'logistics_invoice'
      )
        ? 'Record Receipt'
        : 'Record Payment';
    }
  
  
    settlementAmountLabel(): string {
  
      const invoice =
        this.selectedInvoice();
  
      if (
        invoice?.sourceModule ===
        'logistics_invoice'
      ) {
        return 'Receipt Amount';
      }
  
      return 'Payment Amount';
    }
  
  
    /* =========================================================
       PAYMENT HISTORY
    ========================================================= */
  
    paymentHistory(
      invoice:
        DepartmentInvoice
    ): DepartmentInvoicePayment[] {
  
      return Array.isArray(
        invoice.payments
      )
        ? invoice.payments
        : [];
    }
  
  
    /* =========================================================
       DOCUMENTS
    ========================================================= */
  
    documents(
      invoice:
        DepartmentInvoice
    ): DepartmentInvoiceDocument[] {
  
      return Array.isArray(
        invoice.documents
      )
        ? invoice.documents
        : [];
    }
  
  
    /* =========================================================
       VIEW DOCUMENT
  
       Uses authenticated Accounts endpoint.
  
       The preview window is opened before the HTTP request so
       browsers do not block it as a popup.
    ========================================================= */
  
    viewDocument(
      invoice: DepartmentInvoice,
      document: DepartmentInvoiceDocument,
      index: number
    ): void {
  
      if (
        !invoice?._id
      ) {
        return;
      }
  
  
      const previewWindow =
        window.open(
          '',
          '_blank'
        );
  
  
      this.error.set('');
      this.message.set('');
  
  
      this.departmentInvoiceService
        .getDocumentBlob(
          invoice._id,
          index
        )
        .subscribe({
  
          next: (
            blob
          ) => {
  
            const blobUrl =
              URL.createObjectURL(
                blob
              );
  
  
            if (
              previewWindow
            ) {
  
              previewWindow.location.href =
                blobUrl;
  
            } else {
  
              window.open(
                blobUrl,
                '_blank'
              );
            }
  
  
            window.setTimeout(
              () =>
                URL.revokeObjectURL(
                  blobUrl
                ),
              60_000
            );
          },
  
          error: (
            err
          ) => {
  
            if (
              previewWindow &&
              !previewWindow.closed
            ) {
  
              previewWindow.close();
            }
  
  
            this.error.set(
              this.extractErrorMessage(
                err,
                `Unable to open ${this.documentLabel(
                  document,
                  index
                )}.`
              )
            );
          }
  
        });
    }
  
  
    /* =========================================================
       DOWNLOAD DOCUMENT
  
       Uses the same authenticated Blob endpoint as View.
    ========================================================= */
  
    downloadDocument(
      invoice: DepartmentInvoice,
      document: DepartmentInvoiceDocument,
      index: number
    ): void {
  
      if (
        !invoice?._id
      ) {
        return;
      }
  
  
      this.error.set('');
      this.message.set('');
  
  
      this.departmentInvoiceService
        .getDocumentBlob(
          invoice._id,
          index
        )
        .subscribe({
  
          next: (
            blob
          ) => {
  
            const blobUrl =
              URL.createObjectURL(
                blob
              );
  
  
            const anchor =
              window.document
                .createElement(
                  'a'
                );
  
  
            anchor.href =
              blobUrl;
  
            anchor.download =
              this.documentFileName(
                document,
                index
              );
  
            anchor.style.display =
              'none';
  
  
            window.document.body
              .appendChild(
                anchor
              );
  
  
            anchor.click();
  
            anchor.remove();
  
  
            window.setTimeout(
              () =>
                URL.revokeObjectURL(
                  blobUrl
                ),
              1000
            );
          },
  
          error: (
            err
          ) => {
  
            this.error.set(
              this.extractErrorMessage(
                err,
                `Unable to download ${this.documentLabel(
                  document,
                  index
                )}.`
              )
            );
          }
  
        });
    }
  
  
    documentFileName(
      document: DepartmentInvoiceDocument,
      index: number
    ): string {
  
      const fileName =
        String(
          document.fileName ||
          ''
        )
          .trim();
  
  
      if (
        fileName
      ) {
        return fileName;
      }
  
  
      const label =
        String(
          document.label ||
          `Document ${index + 1}`
        )
          .trim()
          .replace(
            /[\\/:*?"<>|]+/g,
            '_'
          );
  
  
      return (
        label ||
        `Document-${index + 1}`
      );
    }
  
  
    documentLabel(
      document:
        DepartmentInvoiceDocument,
      index:
        number
    ): string {
  
      return (
        document.label ||
        document.fileName ||
        `Document ${index + 1}`
      );
    }
  
  
    /* =========================================================
       FORMATTERS
    ========================================================= */
  
    formatCurrency(
      value:
        number |
        string |
        null |
        undefined,
      currency:
        string |
        undefined =
          'INR'
    ): string {
  
      const amount =
        Number(
          value ||
          0
        );
  
  
      try {
  
        return new Intl
          .NumberFormat(
            'en-IN',
            {
              style:
                'currency',
  
              currency:
                currency ||
                'INR',
  
              maximumFractionDigits:
                2
            }
          )
          .format(
            amount
          );
  
      } catch {
  
        return `${currency || 'INR'} ${amount.toFixed(2)}`;
      }
    }
  
  
    formatDate(
      value:
        string |
        null |
        undefined
    ): string {
  
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
          'en-IN',
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
  
  
    formatDateTime(
      value:
        string |
        null |
        undefined
    ): string {
  
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
          'en-IN',
          {
            day:
              '2-digit',
  
            month:
              'short',
  
            year:
              'numeric',
  
            hour:
              '2-digit',
  
            minute:
              '2-digit'
          }
        )
        .format(
          date
        );
    }
  
    /* =========================================================
   SETTLEMENT SUCCESS ANIMATION
========================================================= */

private showSettlementSuccess({
  type,
  amount,
  currency,
  invoiceNumber
}: {
  type:
    'payment' |
    'receipt';

  amount:
    number;

  currency:
    string;

  invoiceNumber:
    string;
}): void {

  if (
    this.settlementSuccessTimer
  ) {

    clearTimeout(
      this.settlementSuccessTimer
    );
  }


  this.settlementSuccessType.set(
    type
  );

  this.settlementSuccessAmount.set(
    Number(
      amount ||
      0
    )
  );

  this.settlementSuccessCurrency.set(
    currency ||
    'INR'
  );

  this.settlementSuccessInvoiceNumber.set(
    invoiceNumber
  );


  this.settlementSuccessVisible.set(
    true
  );


  this.settlementSuccessTimer =
    setTimeout(
      () => {

        this.settlementSuccessVisible.set(
          false
        );

        this.settlementSuccessTimer =
          null;

      },
      1800
    );
}
  
    /* =========================================================
       PRIVATE HELPERS
    ========================================================= */
  
    private replaceInvoiceInList(
      updated:
        DepartmentInvoice
    ): void {
  
      this.invoices.update(
        rows =>
          rows.map(
            invoice =>
              invoice._id ===
              updated._id
  
                ? updated
  
                : invoice
          )
      );
    }
  
  
    private resetSettlementForm(): void {
  
      const otherControl =
        this.settlementForm
          .controls
          .paymentModeOther;
  
  
      otherControl.clearValidators();
  
      otherControl.setValidators([
        Validators.maxLength(
          100
        )
      ]);
  
  
      this.settlementForm.reset({
  
        amount:
          0,
  
        paymentDate:
          this.today(),
  
        paymentMode:
          '',
  
        paymentModeOther:
          '',
  
        paymentReference:
          '',
  
        remarks:
          ''
  
      });
  
  
      otherControl
        .updateValueAndValidity({
          emitEvent:
            false
        });
    }
  
  
    private today(): string {
  
      const date =
        new Date();
  
      const year =
        date.getFullYear();
  
      const month =
        String(
          date.getMonth() +
          1
        )
          .padStart(
            2,
            '0'
          );
  
      const day =
        String(
          date.getDate()
        )
          .padStart(
            2,
            '0'
          );
  
  
      return `${year}-${month}-${day}`;
    }
  
  
    private extractErrorMessage(
      error:
        unknown,
      fallback:
        string
    ): string {
  
      const source =
        error as {
          error?: {
            message?: string;
            error?: string;
          };
          message?: string;
        };
  
  
      return (
        source?.error?.message ||
        source?.error?.error ||
        source?.message ||
        fallback
      );
    }
  
  }
