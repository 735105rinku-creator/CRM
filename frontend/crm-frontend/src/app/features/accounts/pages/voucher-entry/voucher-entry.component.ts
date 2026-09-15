import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  inject,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute
} from '@angular/router';

import {
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  ChartOfAccount,
  CreateVoucherPayload,
  PurchasePaymentAllocationOption,
  PurchasePaymentContext,
  Voucher,
  VoucherAttachment,
  VoucherLinePayload,
  VoucherQuery,
  VoucherStatus
} from '../../models/accounts.models';

import {
  ChartOfAccountsService
} from '../../services/chart-of-accounts.service';

import {
  VoucherService
} from '../../services/voucher.service';

import {
  apiUrl
} from '../../../../core/config/api.config';


type SupportedVoucherType =
  | 'journal'
  | 'payment'
  | 'receipt'
  | 'contra'
  | 'credit_note'
  | 'debit_note';


@Component({
  selector: 'app-voucher-entry',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './voucher-entry.component.html',

  styleUrl:
    './voucher-entry.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class VoucherEntryComponent {

  /* =========================================================
     INPUTS
  ========================================================= */

  @Input()
  embeddedVoucherType?: SupportedVoucherType;

  @Input()
  embeddedTitle?: string;


  /* =========================================================
     DEPENDENCIES
  ========================================================= */

  private readonly fb =
    inject(FormBuilder);

  private readonly route =
    inject(ActivatedRoute);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly voucherService =
    inject(VoucherService);

  private readonly chartOfAccountsService =
    inject(ChartOfAccountsService);


  /* =========================================================
     PAGE STATE
  ========================================================= */

  readonly voucherType =
    signal<SupportedVoucherType>(
      'journal'
    );

  readonly title =
    signal(
      'Journal Vouchers'
    );

  readonly vouchers =
    signal<Voucher[]>([]);

  readonly accounts =
    signal<ChartOfAccount[]>([]);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

  readonly uploadingVoucherId =
    signal<string | null>(
      null
    );

  readonly errorMessage =
    signal('');

  readonly message =
    signal('');

  readonly formOpen =
    signal(false);

  readonly editingVoucherId =
    signal<string | null>(
      null
    );


  /* =========================================================
     FILTERS
  ========================================================= */

  readonly search =
    signal('');

  readonly statusFilter =
    signal<VoucherStatus | ''>(
      ''
    );

  readonly fromDate =
    signal('');

  readonly toDate =
    signal('');


  /* =========================================================
     PURCHASE PAYMENT ALLOCATION
  ========================================================= */

  readonly allocationOpen =
    signal(false);

  readonly allocationVoucher =
    signal<Voucher | null>(
      null
    );

  readonly allocationOptions =
    signal<
      PurchasePaymentAllocationOption[]
    >([]);

  allocationAmounts:
    Record<string, number> = {};


  /* =========================================================
     PURCHASE PAYMENT TARGET

     These values exist only when Accounts / Payments is opened
     from an Incoming Purchase Invoice.

     Query example:

     /accounts/payments
       ?purchaseInvoiceId=...
       &departmentInvoiceId=...
       &invoiceNumber=GF/INV/2026/145
  ========================================================= */

  readonly targetPurchaseInvoiceId =
    signal<string | null>(
      null
    );

  readonly targetPurchaseInvoiceNumber =
    signal('');

  readonly targetDepartmentInvoiceId =
    signal('');

  readonly purchasePaymentEntryMode =
    signal(false);


  /* =========================================================
     TRUSTED PURCHASE PAYMENT CONTEXT

     Loaded from the backend before creating a Payment Voucher.

     The frontend does NOT guess:
       - Vendor/AP account
       - outstanding amount
       - Company Admin approval
  ========================================================= */

  readonly purchasePaymentContext =
    signal<PurchasePaymentContext | null>(
      null
    );

  readonly purchaseContextLoading =
    signal(false);


  /* =========================================================
     SIMPLIFIED PURCHASE PAYMENT FORM

     Only used when creating a NEW Payment Voucher from an
     Incoming Purchase Invoice.

     Existing generic Voucher editing remains unchanged.
  ========================================================= */

  readonly purchasePaymentForm =
    this.fb.group({

      paymentAmount: [
        0,
        [
          Validators.required,
          Validators.min(
            0.01
          )
        ]
      ],

      payFromAccountId: [
        '',
        Validators.required
      ]

    });


  /* =========================================================
     GENERIC VOUCHER FORM
  ========================================================= */

  readonly voucherForm =
    this.fb.group({

      voucherDate: [
        this.today(),
        Validators.required
      ],

      referenceNo: [
        ''
      ],

      referenceDate: [
        ''
      ],

      narration: [
        ''
      ],

      lines:
        this.fb.array([
          this.createLine(),
          this.createLine()
        ])

    });


  /* =========================================================
     LIFECYCLE
  ========================================================= */

  constructor() {}


  ngOnInit(): void {

    this.readRouteConfiguration();

    this.readPurchasePaymentTarget();

    this.loadReferenceData();

    this.loadVouchers();


    /*
     * Incoming Invoices
     *   ->
     * Verified Purchase Invoice
     *   ->
     * Company Admin approved
     *   ->
     * Create Payment Voucher
     *
     * Open the payment form immediately.
     *
     * The trusted backend context is loaded by openNewVoucher().
     */
    if (
      this.purchasePaymentEntryMode()
    ) {

      this.openNewVoucher();

    }

  }


  /* =========================================================
     FORM ACCESSORS
  ========================================================= */

  get lines(): FormArray {

    return this.voucherForm
      .controls
      .lines;

  }


  /* =========================================================
     PURCHASE PAYMENT DISPLAY STATE
  ========================================================= */

  isSimplifiedPurchasePaymentForm():
    boolean {

    return (
      this.purchasePaymentEntryMode() &&
      !this.editingVoucherId()
    );

  }


  payFromAccounts():
    ChartOfAccount[] {

    return this.accounts()
      .filter(
        account =>

          account.status ===
            'active' &&

          (
            account.accountType ===
              'cash' ||

            account.accountType ===
              'bank'
          )
      )
      .sort(
        (
          first,
          second
        ) => {

          if (
            first.accountType !==
            second.accountType
          ) {

            return first.accountType ===
              'bank'
              ? -1
              : 1;

          }


          return String(
            first.accountName ||
            ''
          )
            .localeCompare(
              String(
                second.accountName ||
                ''
              )
            );

        }
      );

  }


  selectedPayFromAccount():
    ChartOfAccount | null {

    const accountId =
      String(
        this.purchasePaymentForm
          .controls
          .payFromAccountId
          .value ||
        ''
      )
        .trim();


    if (
      !accountId
    ) {

      return null;

    }


    return (
      this.payFromAccounts()
        .find(
          account =>
            String(
              account._id ||
              ''
            ) ===
            accountId
        ) ||
      null
    );

  }


  purchasePaymentAmount():
    number {

    return this.roundMoney(
      Number(
        this.purchasePaymentForm
          .controls
          .paymentAmount
          .value ||
        0
      )
    );

  }


  purchaseOutstandingAmount():
    number {

    return this.roundMoney(
      Number(
        this.purchasePaymentContext()
          ?.outstandingAmount ||
        0
      )
    );

  }


  purchaseRemainingAfterPayment():
    number {

    return this.roundMoney(
      Math.max(
        0,
        this.purchaseOutstandingAmount() -
        this.purchasePaymentAmount()
      )
    );

  }


  /* =========================================================
     REFERENCE DATA
  ========================================================= */

  loadReferenceData(): void {

    this.chartOfAccountsService
      .getActiveAccounts()
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: (accounts) => {

          this.accounts.set(
            accounts ?? []
          );

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to load Chart of Accounts.'
            )

          );

        }

      });

  }


  /* =========================================================
     PURCHASE PAYMENT CONTEXT
  ========================================================= */

  loadPurchasePaymentContext():
    void {

    const purchaseInvoiceId =
      this.targetPurchaseInvoiceId();


    if (
      !purchaseInvoiceId
    ) {

      return;

    }


    this.purchaseContextLoading.set(
      true
    );

    this.purchasePaymentContext.set(
      null
    );

    this.errorMessage.set('');


    this.voucherService
      .getPurchasePaymentContext(
        purchaseInvoiceId
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() => {

          this.purchaseContextLoading.set(
            false
          );

        })

      )
      .subscribe({

        next: (context) => {

          this.purchasePaymentContext.set(
            context
          );


          /*
           * Default to the full outstanding amount.
           *
           * Accountant can reduce this for a partial payment.
           */
          this.purchasePaymentForm
            .controls
            .paymentAmount
            .setValue(
              this.roundMoney(
                Number(
                  context.outstandingAmount ||
                  0
                )
              )
            );


          /*
           * Use the trusted invoice number from the backend
           * whenever available.
           */
          if (
            context.vendorInvoiceNumber
          ) {

            this.targetPurchaseInvoiceNumber.set(
              context.vendorInvoiceNumber
            );

          }


          this.voucherForm.patchValue({

            referenceNo:
              context.vendorInvoiceNumber ||
              this.targetPurchaseInvoiceNumber(),

            referenceDate:
              this.toDateInput(
                context.invoiceDate
              ),

            narration:
              context.vendorInvoiceNumber

                ? `Payment against Purchase Invoice ${context.vendorInvoiceNumber}`

                : 'Payment against verified Purchase Invoice'

          });

        },

        error: (error) => {

          this.purchasePaymentContext.set(
            null
          );


          this.purchasePaymentForm.reset({

            paymentAmount:
              0,

            payFromAccountId:
              ''

          });


          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to load Purchase payment context.'
            )

          );

        }

      });

  }


  /* =========================================================
     LIST VOUCHERS
  ========================================================= */

  loadVouchers(): void {

    const query:
      VoucherQuery = {

        voucherType:
          this.voucherType(),

        sortBy:
          'voucherDate',

        sortOrder:
          'desc'

      };


    const search =
      this.search()
        .trim();

    if (search) {

      query.search =
        search;

    }


    const status =
      this.statusFilter();

    if (status) {

      query.status =
        status;

    }


    const from =
      this.fromDate();

    if (from) {

      query.from =
        from;

    }


    const to =
      this.toDate();

    if (to) {

      query.to =
        to;

    }


    this.loading.set(true);

    this.errorMessage.set('');


    this.voucherService
      .getVouchers(
        query
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() => {

          this.loading.set(false);

        })

      )
      .subscribe({

        next: (vouchers) => {

          this.vouchers.set(
            vouchers ?? []
          );

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              `Unable to load ${this.title()}.`
            )

          );

        }

      });

  }


  applyFilters(): void {

    this.loadVouchers();

  }


  resetFilters(): void {

    this.search.set('');

    this.statusFilter.set('');

    this.fromDate.set('');

    this.toDate.set('');

    this.loadVouchers();

  }


  /* =========================================================
     NEW VOUCHER
  ========================================================= */

  openNewVoucher(): void {

    this.editingVoucherId.set(
      null
    );


    const purchaseInvoiceNumber =
      this.targetPurchaseInvoiceNumber();


    this.voucherForm.reset({

      voucherDate:
        this.today(),

      referenceNo:
        this.purchasePaymentEntryMode()

          ? purchaseInvoiceNumber

          : '',

      referenceDate:
        '',

      narration:
        this.purchasePaymentEntryMode()

          ? (
              purchaseInvoiceNumber

                ? `Payment against Purchase Invoice ${purchaseInvoiceNumber}`

                : 'Payment against verified Purchase Invoice'
            )

          : ''

    });


    this.resetLines();


    this.purchasePaymentForm.reset({

      paymentAmount:
        0,

      payFromAccountId:
        ''

    });


    this.errorMessage.set('');

    this.message.set('');

    this.formOpen.set(true);


    if (
      this.purchasePaymentEntryMode()
    ) {

      this.loadPurchasePaymentContext();

    }

  }


  /* =========================================================
     EDIT VOUCHER

     Existing draft Voucher editing intentionally continues
     through the generic accounting-lines form even when the
     page itself was originally opened from a Purchase Invoice.
  ========================================================= */

  editVoucher(
    voucher: Voucher
  ): void {

    if (
      voucher.status !==
        'draft' ||
      !voucher._id
    ) {

      return;

    }


    this.editingVoucherId.set(
      voucher._id
    );


    this.voucherForm.patchValue({

      voucherDate:
        this.toDateInput(
          voucher.voucherDate
        ),

      referenceNo:
        voucher.referenceNo ??
        '',

      referenceDate:
        this.toDateInput(
          voucher.referenceDate
        ),

      narration:
        voucher.narration ??
        ''

    });


    this.lines.clear();


    for (
      const line
      of voucher.lines ?? []
    ) {

      this.lines.push(

        this.createLine({

          accountId:
            line.accountId ??
            '',

          description:
            line.description ??
            '',

          debit:
            Number(
              line.debit ??
              0
            ),

          credit:
            Number(
              line.credit ??
              0
            )

        })

      );

    }


    while (
      this.lines.length <
      2
    ) {

      this.lines.push(
        this.createLine()
      );

    }


    this.errorMessage.set('');

    this.message.set('');

    this.formOpen.set(true);

  }


  closeForm(): void {

    if (
      this.saving()
    ) {

      return;

    }


    this.formOpen.set(false);

    this.editingVoucherId.set(
      null
    );

  }


  /* =========================================================
     GENERIC ACCOUNTING LINES
  ========================================================= */

  addLine(): void {

    this.lines.push(
      this.createLine()
    );

  }


  removeLine(
    index: number
  ): void {

    if (
      this.lines.length <=
      2
    ) {

      return;

    }


    this.lines.removeAt(
      index
    );

  }


  onDebitInput(
    index: number
  ): void {

    const line =
      this.lines.at(
        index
      );

    const debit =
      Number(
        line
          .get('debit')
          ?.value ||
        0
      );


    if (
      debit >
      0
    ) {

      line
        .get('credit')
        ?.setValue(
          0,
          {
            emitEvent:
              false
          }
        );

    }

  }


  onCreditInput(
    index: number
  ): void {

    const line =
      this.lines.at(
        index
      );

    const credit =
      Number(
        line
          .get('credit')
          ?.value ||
        0
      );


    if (
      credit >
      0
    ) {

      line
        .get('debit')
        ?.setValue(
          0,
          {
            emitEvent:
              false
          }
        );

    }

  }


  /* =========================================================
     TOTALS
  ========================================================= */

  totalDebit(): number {

    return this.roundMoney(

      this.lines.controls
        .reduce(
          (
            total,
            control
          ) =>
            total +
            Number(
              control
                .get('debit')
                ?.value ||
              0
            ),
          0
        )

    );

  }


  totalCredit(): number {

    return this.roundMoney(

      this.lines.controls
        .reduce(
          (
            total,
            control
          ) =>
            total +
            Number(
              control
                .get('credit')
                ?.value ||
              0
            ),
          0
        )

    );

  }


  balanced(): boolean {

    const debit =
      this.totalDebit();

    const credit =
      this.totalCredit();


    return (
      debit >
        0 &&
      debit ===
        credit
    );

  }


  /* =========================================================
     SAVE DRAFT
  ========================================================= */

  saveDraft(): void {

    this.errorMessage.set('');

    this.message.set('');


    /*
     * Simplified Purchase payment creation.
     *
     * Editing an existing draft intentionally uses the generic
     * Voucher form below.
     */
    if (
      this.isSimplifiedPurchasePaymentForm()
    ) {

      this.savePurchasePaymentDraft();

      return;

    }


    this.saveGenericDraft();

  }


  /* =========================================================
     SAVE GENERIC DRAFT
  ========================================================= */

  private saveGenericDraft():
    void {

    if (
      this.voucherForm.invalid
    ) {

      this.voucherForm
        .markAllAsTouched();


      this.errorMessage.set(
        'Voucher Date is required.'
      );

      return;

    }


    const payload =
      this.buildGenericPayload();


    if (
      payload.lines.length <
      2
    ) {

      this.errorMessage.set(
        'At least two valid accounting lines are required.'
      );

      return;

    }


    if (
      !this.balanced()
    ) {

      this.errorMessage.set(
        'Total Debit and Total Credit must be equal and greater than zero.'
      );

      return;

    }


    this.saving.set(true);


    const editingId =
      this.editingVoucherId();


    const request$ =
      editingId

        ? this.voucherService
            .updateVoucher(
              editingId,
              payload
            )

        : this.voucherService
            .createVoucher(
              payload
            );


    request$
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() => {

          this.saving.set(false);

        })

      )
      .subscribe({

        next: (
          savedVoucher:
            Voucher
        ) => {

          this.message.set(

            editingId

              ? 'Draft voucher updated successfully.'

              : 'Draft voucher created successfully.'

          );


          this.formOpen.set(false);

          this.editingVoucherId.set(
            null
          );


          this.loadVouchers();

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to save draft voucher.'
            )

          );

        }

      });

  }


  /* =========================================================
     SAVE PURCHASE PAYMENT DRAFT

     Simplified UI:
       Invoice
       Vendor
       Outstanding
       Payment Amount
       Pay From
       Payable Account (automatic)
       Narration (automatic)

     Accounting created behind the scenes:

       Vendor/AP        DR paymentAmount
       Bank/Cash        CR paymentAmount

     partyAccountId is always the trusted Vendor/AP account
     returned by the backend Purchase payment context.
  ========================================================= */

  private savePurchasePaymentDraft():
    void {

    const context =
      this.purchasePaymentContext();


    if (
      this.purchaseContextLoading()
    ) {

      this.errorMessage.set(
        'Purchase payment details are still loading.'
      );

      return;

    }


    if (
      !context
    ) {

      this.errorMessage.set(
        'Purchase payment context is unavailable. Please reload the payment details.'
      );

      return;

    }


    if (
      context.companyAdminApprovalStatus !==
        'approved'
    ) {

      this.errorMessage.set(
        'Company Admin approval is required before creating this Purchase payment.'
      );

      return;

    }


    if (
      this.voucherForm.controls
        .voucherDate.invalid
    ) {

      this.voucherForm.controls
        .voucherDate
        .markAsTouched();


      this.errorMessage.set(
        'Payment Date is required.'
      );

      return;

    }


    if (
      this.purchasePaymentForm.invalid
    ) {

      this.purchasePaymentForm
        .markAllAsTouched();


      this.errorMessage.set(
        'Enter a valid Payment Amount and select the Bank/Cash account to pay from.'
      );

      return;

    }


    const amount =
      this.purchasePaymentAmount();


    const outstanding =
      this.purchaseOutstandingAmount();


    if (
      amount <=
      0
    ) {

      this.errorMessage.set(
        'Payment Amount must be greater than zero.'
      );

      return;

    }


    if (
      amount >
      outstanding
    ) {

      this.errorMessage.set(
        `Payment Amount cannot exceed the outstanding amount of ₹${outstanding.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}.`
      );

      return;

    }


    const payFrom =
      this.selectedPayFromAccount();


    if (
      !payFrom?._id ||
      ![
        'cash',
        'bank'
      ].includes(
        payFrom.accountType
      )
    ) {

      this.errorMessage.set(
        'Select a valid active Bank or Cash account.'
      );

      return;

    }


    if (
      !context.partyAccountId
    ) {

      this.errorMessage.set(
        'Vendor payable account is missing from the Purchase Voucher.'
      );

      return;

    }


    const invoiceNumber =
      context.vendorInvoiceNumber ||
      this.targetPurchaseInvoiceNumber();


    const narration =
      invoiceNumber

        ? `Payment against Purchase Invoice ${invoiceNumber}`

        : 'Payment against verified Purchase Invoice';


    const payload:
      CreateVoucherPayload = {

        voucherType:
          'payment',

        voucherDate:
          String(
            this.voucherForm
              .controls
              .voucherDate
              .value ||
            ''
          ),

        referenceNo:
          invoiceNumber,

        referenceDate:
          context.invoiceDate
            ? this.toDateInput(
                context.invoiceDate
              )
            : null,

        narration,

        partyAccountId:
          context.partyAccountId,

        lines: [

          {
            accountId:
              context.partyAccountId,

            description:
              invoiceNumber
                ? `Vendor payable against ${invoiceNumber}`
                : 'Vendor payable',

            debit:
              amount,

            credit:
              0
          },

          {
            accountId:
              payFrom._id,

            description:
              invoiceNumber
                ? `Payment against ${invoiceNumber}`
                : 'Purchase invoice payment',

            debit:
              0,

            credit:
              amount
          }

        ]

      };


    this.saving.set(true);


    this.voucherService
      .createVoucher(
        payload
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: (
          savedVoucher:
            Voucher
        ) => {

          if (
            !savedVoucher?._id
          ) {

            this.saving.set(
              false
            );


            this.errorMessage.set(
              'Payment Voucher was created but its ID was not returned.'
            );

            this.loadVouchers();

            return;

          }


          /*
           * Continue automatically into the Purchase allocation.
           *
           * The backend allocation endpoint re-validates:
           *   - Payment Voucher
           *   - payable account
           *   - Purchase Invoice
           *   - outstanding
           *   - Accounts status
           *   - Company Admin approval
           */
          this.createTargetPurchaseAllocation(
            savedVoucher,
            context,
            amount
          );

        },

        error: (error) => {

          this.saving.set(
            false
          );


          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to create Purchase Payment Voucher.'
            )

          );

        }

      });

  }


  /* =========================================================
     AUTO CREATE TARGET PURCHASE ALLOCATION

     This removes the unnecessary second allocation form when
     payment was started from a specific Incoming Invoice.

     Normal manually-created Payment Vouchers can still use the
     existing allocation modal.
  ========================================================= */

  private createTargetPurchaseAllocation(
    savedVoucher: Voucher,
    context: PurchasePaymentContext,
    amount: number
  ): void {

    if (
      !savedVoucher._id
    ) {

      this.saving.set(
        false
      );

      return;

    }


    this.voucherService
      .createPurchaseAllocations(
        savedVoucher._id,
        [
          {
            purchaseInvoiceId:
              context.purchaseInvoiceId,

            allocatedAmount:
              amount
          }
        ]
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() => {

          this.saving.set(
            false
          );

        })

      )
      .subscribe({

        next: () => {

          this.formOpen.set(
            false
          );

          this.editingVoucherId.set(
            null
          );


          this.message.set(
            'Payment Voucher draft and Purchase Invoice allocation created successfully. Upload supporting proof, then post the voucher to complete the payment.'
          );


          this.loadVouchers();

        },

        error: (error) => {

          /*
           * Important:
           *
           * The Payment Voucher draft already exists at this
           * point. We therefore do not pretend the whole
           * operation failed or create another draft
           * automatically.
           *
           * The accountant can use the existing draft and its
           * "Allocate Purchase Invoices" action to retry.
           */
          this.formOpen.set(
            false
          );

          this.editingVoucherId.set(
            null
          );


          this.errorMessage.set(

            this.extractError(
              error,
              'Payment Voucher draft was created, but the Purchase Invoice allocation could not be recorded. Use "Allocate Purchase Invoices" on the draft voucher to complete the allocation.'
            )

          );


          this.loadVouchers();

        }

      });

  }


  /* =========================================================
     POST VOUCHER
  ========================================================= */

  postVoucher(
    voucher: Voucher
  ): void {

    if (
      voucher.status !==
        'draft' ||
      !voucher._id
    ) {

      return;

    }


    if (
      this.voucherType() ===
        'payment' &&
      !(
        voucher.attachments
          ?.length
      )
    ) {

      this.errorMessage.set(
        'Payment Voucher requires supporting proof before posting.'
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Post voucher ${voucher.voucherNumber}? Posted vouchers cannot be edited.`
      );


    if (
      !confirmed
    ) {

      return;

    }


    this.errorMessage.set('');

    this.message.set('');


    this.voucherService
      .postVoucher(
        voucher._id
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: () => {

          this.message.set(
            'Voucher posted successfully.'
          );

          this.loadVouchers();

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to post voucher.'
            )

          );

        }

      });

  }


  /* =========================================================
     VOID VOUCHER
  ========================================================= */

  voidVoucher(
    voucher: Voucher
  ): void {

    if (
      voucher.status !==
        'posted' ||
      !voucher._id
    ) {

      return;

    }


    const reason =
      window.prompt(
        `Reason for voiding ${voucher.voucherNumber}:`
      )
        ?.trim();


    if (
      !reason
    ) {

      return;

    }


    this.errorMessage.set('');

    this.message.set('');


    this.voucherService
      .voidVoucher(
        voucher._id,
        {
          reason
        }
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: () => {

          this.message.set(
            'Voucher voided successfully.'
          );

          this.loadVouchers();

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to void voucher.'
            )

          );

        }

      });

  }


  /* =========================================================
     MANUAL PURCHASE PAYMENT ALLOCATION

     This existing workflow remains available for normal
     Payment Vouchers.

     Payment Voucher
       ->
     PaymentAllocation
       ->
     Posted Voucher
       ->
     Purchase Invoice settlement
  ========================================================= */

  openAllocations(
    voucher: Voucher
  ): void {

    if (
      this.voucherType() !==
        'payment' ||
      voucher.status !==
        'draft' ||
      !voucher._id
    ) {

      return;

    }


    this.errorMessage.set('');

    this.message.set('');


    this.allocationVoucher.set(
      voucher
    );

    this.allocationOptions.set([]);

    this.allocationAmounts = {};

    this.allocationOpen.set(true);

    this.saving.set(true);


    this.voucherService
      .getPurchaseAllocationOptions(
        voucher._id
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() => {

          this.saving.set(false);

        })

      )
      .subscribe({

        next: (rows) => {

          const options =
            Array.isArray(
              rows
            )
              ? rows
              : [];


          this.allocationOptions.set(
            options
          );


          const targetId =
            this.targetPurchaseInvoiceId();


          if (
            !targetId
          ) {

            return;

          }


          const target =
            options.find(
              row =>
                String(
                  row.purchaseInvoiceId
                ) ===
                targetId
            );


          if (
            !target
          ) {

            /*
             * Do not show an error merely because the target
             * Purchase Invoice already has an allocation on
             * another draft/posted payment or is no longer
             * eligible. This remains a manual allocation modal.
             */
            return;

          }


          const voucherAmount =
            this.roundMoney(
              Number(
                voucher.totalDebit ||
                0
              )
            );


          const outstanding =
            this.roundMoney(
              Number(
                target.outstandingAmount ||
                0
              )
            );


          const suggestedAmount =
            this.roundMoney(
              Math.min(
                voucherAmount,
                outstanding
              )
            );


          if (
            suggestedAmount >
            0
          ) {

            this.allocationAmounts = {

              [target.purchaseInvoiceId]:
                suggestedAmount

            };

          }

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to load outstanding Purchase Invoices.'
            )

          );


          this.allocationOpen.set(
            false
          );

          this.allocationVoucher.set(
            null
          );

        }

      });

  }


  closeAllocations(): void {

    if (
      this.saving()
    ) {

      return;

    }


    this.allocationOpen.set(
      false
    );

    this.allocationVoucher.set(
      null
    );

    this.allocationOptions.set([]);

    this.allocationAmounts = {};

  }


  setAllocation(
    invoiceId: string,
    value: string
  ): void {

    const option =
      this.allocationOptions()
        .find(
          row =>
            row.purchaseInvoiceId ===
            invoiceId
        );


    if (
      !option
    ) {

      return;

    }


    const entered =
      this.roundMoney(
        Math.max(
          0,
          Number(
            value ||
            0
          )
        )
      );


    const outstanding =
      this.roundMoney(
        Number(
          option.outstandingAmount ||
          0
        )
      );


    this.allocationAmounts = {

      ...this.allocationAmounts,

      [invoiceId]:
        Math.min(
          entered,
          outstanding
        )

    };


    this.errorMessage.set('');

  }


  allocationTotal(): number {

    return this.roundMoney(

      Object.values(
        this.allocationAmounts
      )
        .reduce(
          (
            sum,
            value
          ) =>
            sum +
            Number(
              value ||
              0
            ),
          0
        )

    );

  }


  allocationVoucherAmount(): number {

    return this.roundMoney(
      Number(
        this.allocationVoucher()
          ?.totalDebit ||
        0
      )
    );

  }


  allocationRemainingAmount(): number {

    return this.roundMoney(
      Math.max(
        0,
        this.allocationVoucherAmount() -
        this.allocationTotal()
      )
    );

  }


  canSaveAllocations(): boolean {

    const total =
      this.allocationTotal();

    const voucherAmount =
      this.allocationVoucherAmount();


    return (
      !this.saving() &&

      this.allocationOptions()
        .length >
        0 &&

      total >
        0 &&

      total <=
        voucherAmount
    );

  }


  saveAllocations(): void {

    const voucher =
      this.allocationVoucher();


    if (
      !voucher?._id ||
      this.saving()
    ) {

      return;

    }


    const allocations =
      Object.entries(
        this.allocationAmounts
      )
        .filter(
          (
            [, amount]
          ) =>
            Number(
              amount
            ) >
            0
        )
        .map(
          (
            [
              purchaseInvoiceId,
              allocatedAmount
            ]
          ) => ({

            purchaseInvoiceId,

            allocatedAmount:
              this.roundMoney(
                Number(
                  allocatedAmount
                )
              )

          })
        );


    if (
      !allocations.length
    ) {

      this.errorMessage.set(
        'Enter at least one Purchase Invoice allocation.'
      );

      return;

    }


    const total =
      this.allocationTotal();

    const voucherAmount =
      this.allocationVoucherAmount();


    if (
      total <=
        0 ||
      total >
        voucherAmount
    ) {

      this.errorMessage.set(
        'Allocation total must be greater than zero and cannot exceed the Payment Voucher amount.'
      );

      return;

    }


    for (
      const allocation
      of allocations
    ) {

      const option =
        this.allocationOptions()
          .find(
            row =>
              row.purchaseInvoiceId ===
              allocation.purchaseInvoiceId
          );


      if (
        !option ||
        allocation.allocatedAmount >
          Number(
            option.outstandingAmount ||
            0
          )
      ) {

        this.errorMessage.set(
          'One or more Purchase Invoice allocations exceed the outstanding amount.'
        );

        return;

      }

    }


    this.errorMessage.set('');

    this.message.set('');

    this.saving.set(true);


    this.voucherService
      .createPurchaseAllocations(
        voucher._id,
        allocations
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() => {

          this.saving.set(false);

        })

      )
      .subscribe({

        next: () => {

          this.allocationOpen.set(
            false
          );

          this.allocationVoucher.set(
            null
          );

          this.allocationOptions.set([]);

          this.allocationAmounts = {};


          this.message.set(
            'Purchase Invoice allocations saved. Upload supporting proof and post the Payment Voucher for the payment to count against the Purchase Invoice.'
          );


          this.loadVouchers();

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to record Purchase Invoice payment allocations.'
            )

          );

        }

      });

  }


  /* =========================================================
     SUPPORTING PROOF
  ========================================================= */

  onVoucherProofSelected(
    voucher: Voucher,
    event: Event
  ): void {

    if (
      voucher.status !==
        'draft' ||
      !voucher._id
    ) {

      return;

    }


    const input =
      event.target as HTMLInputElement;


    const files:
      File[] =
        Array.from(
          input.files ??
          []
        );


    input.value =
      '';


    if (
      !files.length
    ) {

      return;

    }


    if (
      (
        voucher.attachments
          ?.length ??
        0
      ) +
        files.length >
      5
    ) {

      this.errorMessage.set(
        'A maximum of 5 supporting proof files is allowed per voucher.'
      );

      return;

    }


    const allowedMimeTypes =
      new Set<string>([
        'application/pdf',
        'image/jpeg',
        'image/png'
      ]);


    const allowedExtensions =
      new Set<string>([
        'pdf',
        'jpg',
        'jpeg',
        'png'
      ]);


    const hasInvalidFile =
      files.some(
        (
          file:
            File
        ) => {

          const extension =
            file.name
              .split('.')
              .pop()
              ?.toLowerCase() ??
            '';


          return (
            !allowedMimeTypes.has(
              file.type
            ) ||
            !allowedExtensions.has(
              extension
            )
          );

        }
      );


    if (
      hasInvalidFile
    ) {

      this.errorMessage.set(
        'Only PDF, JPG, JPEG and PNG files are allowed.'
      );

      return;

    }


    const hasOversizedFile =
      files.some(
        (
          file:
            File
        ) =>
          file.size >
          10 *
          1024 *
          1024
      );


    if (
      hasOversizedFile
    ) {

      this.errorMessage.set(
        'Each supporting proof file must be 10 MB or smaller.'
      );

      return;

    }


    this.errorMessage.set('');

    this.uploadingVoucherId.set(
      voucher._id
    );


    this.voucherService
      .uploadAttachments(
        voucher._id,
        files
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() => {

          this.uploadingVoucherId.set(
            null
          );

        })

      )
      .subscribe({

        next: () => {

          this.message.set(
            'Supporting proof uploaded successfully.'
          );

          this.loadVouchers();

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to upload supporting proof.'
            )

          );

        }

      });

  }


  removeVoucherProof(
    voucher: Voucher,
    attachment:
      VoucherAttachment
  ): void {

    if (
      voucher.status !==
        'draft' ||
      !voucher._id ||
      !attachment._id
    ) {

      return;

    }


    if (
      !window.confirm(
        `Remove supporting proof "${attachment.originalName}"?`
      )
    ) {

      return;

    }


    this.uploadingVoucherId.set(
      voucher._id
    );


    this.voucherService
      .removeAttachment(
        voucher._id,
        attachment._id
      )
      .pipe(

        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(() =>
          this.uploadingVoucherId.set(
            null
          )
        )

      )
      .subscribe({

        next: () => {

          this.message.set(
            'Supporting proof removed successfully.'
          );

          this.loadVouchers();

        },

        error: (error) => {

          this.errorMessage.set(

            this.extractError(
              error,
              'Unable to remove supporting proof.'
            )

          );

        }

      });

  }


  attachmentUrl(
    attachment:
      VoucherAttachment
  ): string {

    return apiUrl(
      attachment.fileUrl
    );

  }


  /* =========================================================
     DISPLAY HELPERS
  ========================================================= */

  accountLabel(
    accountId: string
  ): string {

    const account =
      this.accounts()
        .find(
          item =>
            item._id ===
            accountId
        );


    if (
      !account
    ) {

      return '—';

    }


    return [
      account.accountCode,
      account.accountName
    ]
      .filter(
        Boolean
      )
      .join(
        ' · '
      );

  }


  statusClass(
    status: VoucherStatus
  ): string {

    return `status-${status}`;

  }


  trackVoucher(
    index: number,
    voucher: Voucher
  ): string {

    return (
      voucher._id ||
      voucher.voucherNumber ||
      String(
        index
      )
    );

  }


  trackAccount(
    index: number,
    account: ChartOfAccount
  ): string {

    return (
      account._id ||
      account.accountCode ||
      String(
        index
      )
    );

  }


  /* =========================================================
     ROUTE CONFIGURATION
  ========================================================= */

  private readRouteConfiguration():
    void {

    const data =
      this.route.snapshot.data;


    const routeType =
      this.embeddedVoucherType ??
      data['voucherType'];


    if (
      this.isSupportedVoucherType(
        routeType
      )
    ) {

      this.voucherType.set(
        routeType
      );

    }


    const routeTitle =
      this.embeddedTitle ??
      data['title'];


    if (
      typeof routeTitle ===
        'string' &&
      routeTitle.trim()
    ) {

      this.title.set(
        routeTitle.trim()
      );

    }

  }


  /* =========================================================
     PURCHASE PAYMENT ROUTE TARGET
  ========================================================= */

  private readPurchasePaymentTarget():
    void {

    if (
      this.voucherType() !==
        'payment'
    ) {

      return;

    }


    const purchaseInvoiceId =
      String(
        this.route.snapshot
          .queryParamMap
          .get(
            'purchaseInvoiceId'
          ) ||
        ''
      )
        .trim();


    if (
      !purchaseInvoiceId
    ) {

      return;

    }


    const invoiceNumber =
      String(
        this.route.snapshot
          .queryParamMap
          .get(
            'invoiceNumber'
          ) ||
        ''
      )
        .trim();


    const departmentInvoiceId =
      String(
        this.route.snapshot
          .queryParamMap
          .get(
            'departmentInvoiceId'
          ) ||
        ''
      )
        .trim();


    this.targetPurchaseInvoiceId.set(
      purchaseInvoiceId
    );

    this.targetPurchaseInvoiceNumber.set(
      invoiceNumber
    );

    this.targetDepartmentInvoiceId.set(
      departmentInvoiceId
    );

    this.purchasePaymentEntryMode.set(
      true
    );

  }


  /* =========================================================
     GENERIC PAYLOAD
  ========================================================= */

  private buildGenericPayload():
    CreateVoucherPayload {

    const raw =
      this.voucherForm
        .getRawValue();


    const lines:
      VoucherLinePayload[] =
        raw.lines
          .map(
            line => ({

              accountId:
                String(
                  line.accountId ??
                  ''
                )
                  .trim(),

              description:
                String(
                  line.description ??
                  ''
                )
                  .trim(),

              debit:
                this.roundMoney(
                  Number(
                    line.debit ??
                    0
                  )
                ),

              credit:
                this.roundMoney(
                  Number(
                    line.credit ??
                    0
                  )
                )

            })
          )
          .filter(
            line =>
              Boolean(
                line.accountId
              ) &&
              (
                line.debit >
                  0 ||
                line.credit >
                  0
              )
          );


    return {

      voucherType:
        this.voucherType(),

      voucherDate:
        String(
          raw.voucherDate ??
          ''
        ),

      referenceNo:
        String(
          raw.referenceNo ??
          ''
        )
          .trim(),

      referenceDate:
        raw.referenceDate
          ? String(
              raw.referenceDate
            )
          : null,

      narration:
        String(
          raw.narration ??
          ''
        )
          .trim(),

      lines

    };

  }


  /* =========================================================
     LINE FACTORY
  ========================================================= */

  private createLine(
    value: {
      accountId?: string;
      description?: string;
      debit?: number;
      credit?: number;
    } = {}
  ) {

    return this.fb.group({

      accountId: [
        value.accountId ??
          '',
        Validators.required
      ],

      description: [
        value.description ??
          ''
      ],

      debit: [
        value.debit ??
          0,
        [
          Validators.min(
            0
          )
        ]
      ],

      credit: [
        value.credit ??
          0,
        [
          Validators.min(
            0
          )
        ]
      ]

    });

  }


  private resetLines(): void {

    this.lines.clear();

    this.lines.push(
      this.createLine()
    );

    this.lines.push(
      this.createLine()
    );

  }


  /* =========================================================
     TYPE HELPERS
  ========================================================= */

  private isSupportedVoucherType(
    value: unknown
  ): value is SupportedVoucherType {

    return [
      'journal',
      'payment',
      'receipt',
      'contra',
      'credit_note',
      'debit_note'
    ].includes(
      String(
        value
      )
    );

  }


  /* =========================================================
     DATE HELPERS
  ========================================================= */

  private today(): string {

    const now =
      new Date();


    const offset =
      now.getTimezoneOffset();


    const local =
      new Date(
        now.getTime() -
        offset *
        60_000
      );


    return local
      .toISOString()
      .slice(
        0,
        10
      );

  }


  private toDateInput(
    value?:
      string |
      null
  ): string {

    if (
      !value
    ) {

      return '';

    }


    return String(
      value
    )
      .slice(
        0,
        10
      );

  }


  /* =========================================================
     MONEY
  ========================================================= */

  private roundMoney(
    value: number
  ): number {

    return Math.round(
      (
        Number(
          value
        ) +
        Number.EPSILON
      ) *
      100
    ) /
    100;

  }


  /* =========================================================
     ERROR
  ========================================================= */

  private extractError(
    error: any,
    fallback: string
  ): string {

    return (
      error
        ?.error
        ?.message ||
      error
        ?.message ||
      fallback
    );

  }

}