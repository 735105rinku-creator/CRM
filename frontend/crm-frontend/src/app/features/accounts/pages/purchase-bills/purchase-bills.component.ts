import {
  ChangeDetectionStrategy,
  Component,
  OnInit,

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
  forkJoin
} from 'rxjs';

import {
  AccountParty,
  ChartOfAccount,
  Voucher,
    VoucherAttachment,
VoucherLinePayload,
  VoucherQuery,
  VoucherStatus
} from '../../models/accounts.models';

import {
  AccountPartyService
} from '../../services/account-party.service';

import {
  ChartOfAccountsService
} from '../../services/chart-of-accounts.service';

import {
  VoucherService
} from '../../services/voucher.service';

import {
  apiUrl
} from '../../../../core/config/api.config';


@Component({
  selector: 'app-purchase-bills',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './purchase-bills.component.html',

  styleUrl:
    './purchase-bills.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class PurchaseBillsComponent
implements OnInit {

  private readonly fb =
    inject(FormBuilder);

  private readonly voucherService =
    inject(VoucherService);

  private readonly chartOfAccountsService =
    inject(ChartOfAccountsService);

  private readonly accountPartyService =
    inject(AccountPartyService);


  readonly voucherType:
    'purchase' =
    'purchase';


  readonly bills =
    signal<Voucher[]>([]);

  readonly accounts =
    signal<ChartOfAccount[]>([]);

  readonly vendors =
    signal<AccountParty[]>([]);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

  readonly uploadingBillId =
    signal<string | null>(null);

  readonly error =
    signal('');

  readonly message =
    signal('');

  readonly formOpen =
    signal(false);

  readonly editingVoucherId =
    signal<string | null>(null);


  readonly search =
    signal('');

  readonly statusFilter =
    signal<VoucherStatus | ''>('');

  readonly fromDate =
    signal('');

  readonly toDate =
    signal('');


  readonly billForm =
    this.fb.group({

      voucherDate: [
        this.today(),
        Validators.required
      ],

      partyAccountId: [
        '',
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


  totalDebit(): number {

    return this.roundMoney(
      this.lines.controls.reduce(
        (
          total,
          control
        ) =>
          total +
          Number(
            control.get('debit')?.value ||
            0
          ),
        0
      )
    );
  }


  totalCredit(): number {

    return this.roundMoney(
      this.lines.controls.reduce(
        (
          total,
          control
        ) =>
          total +
          Number(
            control.get('credit')?.value ||
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
      debit > 0 &&
      debit === credit
    );
  }


  get lines(): FormArray {

    return this.billForm.controls.lines;
  }


  ngOnInit(): void {

    this.loadReferenceData();

    this.loadBills();
  }


  loadReferenceData(): void {

    forkJoin({

      accounts:
        this.chartOfAccountsService
          .getActiveAccounts(),

      vendors:
        this.accountPartyService
          .getVendors({
            status: 'active'
          })

    }).subscribe({

      next: ({
        accounts,
        vendors
      }) => {

        this.accounts.set(
          Array.isArray(accounts)
            ? accounts
            : []
        );

        this.vendors.set(
          Array.isArray(vendors)
            ? vendors
            : []
        );
      },

      error: (
        err
      ) => {

        this.error.set(
          this.extractErrorMessage(
            err,
            'Unable to load bill accounts.'
          )
        );
      }
    });
  }


  loadBills(): void {

    this.loading.set(true);

    this.error.set('');


    const query:
      VoucherQuery = {

      search:
        this.search().trim() ||
        undefined,

      status:
        this.statusFilter() ||
        undefined,

      from:
        this.fromDate() ||
        undefined,

      to:
        this.toDate() ||
        undefined,

      sortBy:
        'voucherDate',

      sortOrder:
        'desc'
    };


    this.voucherService
      .getPurchaseVouchers(
        query
      )
      .subscribe({

        next: (
          bills
        ) => {

          this.bills.set(
            Array.isArray(bills)
              ? bills
              : []
          );

          this.loading.set(false);
        },

        error: (
          err
        ) => {

          this.bills.set([]);

          this.error.set(
            this.extractErrorMessage(
              err,
              'Unable to load Sales Bills.'
            )
          );

          this.loading.set(false);
        }
      });
  }


  applyFilters(): void {

    this.loadBills();
  }


  resetFilters(): void {

    this.search.set('');

    this.statusFilter.set('');

    this.fromDate.set('');

    this.toDate.set('');

    this.loadBills();
  }


  openNewBill(): void {

    this.editingVoucherId.set(
      null
    );

    this.billForm.reset({

      voucherDate:
        this.today(),

      partyAccountId:
        '',

      referenceNo:
        '',

      referenceDate:
        '',

      narration:
        ''

    });


    this.resetLines();

    this.error.set('');

    this.message.set('');

    this.formOpen.set(true);
  }


  editBill(
    bill: Voucher
  ): void {

    if (
      bill.status !==
      'draft'
    ) {
      return;
    }


    this.editingVoucherId.set(
      bill._id ||
      null
    );


    this.billForm.patchValue({

      voucherDate:
        this.dateOnly(
          bill.voucherDate
        ),

      partyAccountId:
        bill.partyAccountId ||
        '',

      referenceNo:
        bill.referenceNo ||
        '',

      referenceDate:
        bill.referenceDate
          ? this.dateOnly(
              bill.referenceDate
            )
          : '',

      narration:
        bill.narration ||
        ''
    });


    this.lines.clear();


    for (
      const line of
      bill.lines || []
    ) {

      this.lines.push(
        this.createLine({
          accountId:
            line.accountId,

          description:
            line.description ||
            '',

          debit:
            line.debit,

          credit:
            line.credit
        })
      );
    }


    while (
      this.lines.length < 2
    ) {

      this.addLine();
    }


    this.error.set('');

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
  }


  createLine(
    value: Partial<VoucherLinePayload> = {}
  ) {

    return this.fb.group({

      accountId: [
        value.accountId ||
        '',
        Validators.required
      ],

      description: [
        value.description ||
        ''
      ],

      debit: [
        Number(
          value.debit ||
          0
        ),
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      credit: [
        Number(
          value.credit ||
          0
        ),
        [
          Validators.required,
          Validators.min(0)
        ]
      ]
    });
  }


  addLine(): void {

    this.lines.push(
      this.createLine()
    );
  }


  removeLine(
    index: number
  ): void {

    if (
      this.lines.length <= 2
    ) {
      return;
    }

    this.lines.removeAt(
      index
    );
  }


  onDebitChanged(
    index: number
  ): void {

    const line =
      this.lines.at(index);

    const debit =
      Number(
        line.get('debit')
          ?.value ||
        0
      );


    if (
      debit > 0
    ) {

      line.get('credit')
        ?.setValue(
          0,
          {
            emitEvent: false
          }
        );
    }
  }


  onCreditChanged(
    index: number
  ): void {

    const line =
      this.lines.at(index);

    const credit =
      Number(
        line.get('credit')
          ?.value ||
        0
      );


    if (
      credit > 0
    ) {

      line.get('debit')
        ?.setValue(
          0,
          {
            emitEvent: false
          }
        );
    }
  }


  saveDraft(): void {

    this.error.set('');

    this.message.set('');


    if (
      this.billForm.invalid
    ) {

      this.billForm
        .markAllAsTouched();

      this.error.set(
        'Please complete all required bill fields.'
      );

      return;
    }


    const payload =
      this.buildPayload();


    if (
      payload.lines.length < 2
    ) {

      this.error.set(
        'At least two accounting lines are required.'
      );

      return;
    }


    const debit =
      this.sumLines(
        payload.lines,
        'debit'
      );

    const credit =
      this.sumLines(
        payload.lines,
        'credit'
      );


    if (
      debit <= 0 ||
      debit !== credit
    ) {

      this.error.set(
        'Bill debit and credit totals must be equal and greater than zero.'
      );

      return;
    }


    this.saving.set(true);


    const voucherId =
      this.editingVoucherId();


    const request =
      voucherId

        ? this.voucherService
            .updateVoucher(
              voucherId,
              payload
            )

        : this.voucherService
            .createPurchaseVoucher(
              payload
            );


    request.subscribe({

      next: () => {

        this.saving.set(false);

        this.formOpen.set(false);

        this.message.set(
          voucherId
            ? 'Sales Bill draft updated successfully.'
            : 'Sales Bill draft created successfully.'
        );

        this.loadBills();
      },

      error: (
        err
      ) => {

        this.saving.set(false);

        this.error.set(
          this.extractErrorMessage(
            err,
            'Unable to save Sales Bill draft.'
          )
        );
      }
    });
  }


  postBill(
    bill: Voucher
  ): void {

    const id =
      bill._id;


    if (
      !id ||
      bill.status !==
        'draft'
    ) {
      return;
    }

    if (
      !this.isPurchaseOriginBill(bill) &&
      !(bill.attachments?.length)
    ) {
      this.error.set(
        'Purchase Bill requires supporting proof before posting.'
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Post bill ${bill.voucherNumber}? Posted bills cannot be edited.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    this.saving.set(true);

    this.error.set('');

    this.message.set('');


    this.voucherService
      .postVoucher(
        id
      )
      .subscribe({

        next: () => {

          this.saving.set(false);

          this.message.set(
            'Sales Bill posted successfully.'
          );

          this.loadBills();
        },

        error: (
          err
        ) => {

          this.saving.set(false);

          this.error.set(
            this.extractErrorMessage(
              err,
              'Unable to post Sales Bill.'
            )
          );
        }
      });
  }


  voidBill(
    bill: Voucher
  ): void {

    const id =
      bill._id;


    if (
      !id ||
      bill.status !==
        'posted'
    ) {
      return;
    }


    const reason =
      window.prompt(
        `Reason for voiding ${bill.voucherNumber}:`
      )
        ?.trim();


    if (
      !reason
    ) {
      return;
    }


    this.saving.set(true);

    this.error.set('');

    this.message.set('');


    this.voucherService
      .voidVoucher(
        id,
        {
          reason
        }
      )
      .subscribe({

        next: () => {

          this.saving.set(false);

          this.message.set(
            'Sales Bill voided successfully.'
          );

          this.loadBills();
        },

        error: (
          err
        ) => {

          this.saving.set(false);

          this.error.set(
            this.extractErrorMessage(
              err,
              'Unable to void Sales Bill.'
            )
          );
        }
      });
  }
  isPurchaseOriginBill(
    bill: Voucher
  ): boolean {

    return (
      bill.sourceModule ===
      'purchase_invoice'
    );
  }


  onBillProofSelected(
    bill: Voucher,
    event: Event
  ): void {

    if (
      bill.status !== 'draft' ||
      !bill._id
    ) {
      return;
    }

    if (
      this.isPurchaseOriginBill(
        bill
      )
    ) {
      this.error.set(
        'Purchase-origin proof is managed by Purchase and must not be uploaded again in Accounts.'
      );
      return;
    }

    const input =
      event.target as HTMLInputElement;

    const files =
      Array.from(
        input.files ?? []
      );

    input.value = '';

    if (!files.length) {
      return;
    }

    if (
      (bill.attachments?.length ?? 0) +
      files.length > 5
    ) {
      this.error.set(
        'A maximum of 5 supporting proof files is allowed.'
      );
      return;
    }

    const allowedTypes =
      new Set([
        'application/pdf',
        'image/jpeg',
        'image/png'
      ]);

    const invalid =
      files.some(
        file => {

          const extension =
            file.name
              .split('.')
              .pop()
              ?.toLowerCase() ?? '';

          return (
            !allowedTypes.has(
              file.type
            ) ||
            ![
              'pdf',
              'jpg',
              'jpeg',
              'png'
            ].includes(
              extension
            )
          );
        }
      );

    if (invalid) {
      this.error.set(
        'Only PDF, JPG, JPEG and PNG files are allowed.'
      );
      return;
    }

    if (
      files.some(
        file =>
          file.size >
          10 * 1024 * 1024
      )
    ) {
      this.error.set(
        'Each supporting proof file must be 10 MB or smaller.'
      );
      return;
    }

    this.error.set('');
    this.message.set('');

    this.uploadingBillId.set(
      bill._id
    );

    this.voucherService
      .uploadAttachments(
        bill._id,
        files
      )
      .subscribe({

        next: () => {

          this.uploadingBillId.set(
            null
          );

          this.message.set(
            'Purchase Bill supporting proof uploaded successfully.'
          );

          this.loadBills();
        },

        error: (
          err
        ) => {

          this.uploadingBillId.set(
            null
          );

          this.error.set(
            this.extractErrorMessage(
              err,
              'Unable to upload supporting proof.'
            )
          );
        }
      });
  }


  removeBillProof(
    bill: Voucher,
    attachment: VoucherAttachment
  ): void {

    if (
      bill.status !== 'draft' ||
      !bill._id ||
      !attachment._id ||
      this.isPurchaseOriginBill(bill)
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove supporting proof "${attachment.originalName}"?`
      );

    if (!confirmed) {
      return;
    }

    this.uploadingBillId.set(
      bill._id
    );

    this.voucherService
      .removeAttachment(
        bill._id,
        attachment._id
      )
      .subscribe({

        next: () => {

          this.uploadingBillId.set(
            null
          );

          this.message.set(
            'Purchase Bill supporting proof removed successfully.'
          );

          this.loadBills();
        },

        error: (
          err
        ) => {

          this.uploadingBillId.set(
            null
          );

          this.error.set(
            this.extractErrorMessage(
              err,
              'Unable to remove supporting proof.'
            )
          );
        }
      });
  }


  attachmentUrl(
    attachment: VoucherAttachment
  ): string {

    return apiUrl(
      attachment.fileUrl
    );
  }


  statusLabel(
    status: VoucherStatus
  ): string {

    switch (
      status
    ) {

      case 'draft':
        return 'Draft';

      case 'posted':
        return 'Posted';

      case 'void':
        return 'Void';

      default:
        return status;
    }
  }


  statusClass(
    status: VoucherStatus
  ): string {

    return `status-${status}`;
  }


  accountLabel(
    accountId:
      string
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
      return accountId;
    }


    return `${account.accountCode} - ${account.accountName}`;
  }


  partyLabel(
    bill: Voucher
  ): string {

    if (
      bill.partyAccountName
    ) {
      return bill.partyAccountName;
    }


    const vendor =
      this.vendors()
        .find(
          item =>
            item._id ===
            bill.partyAccountId
        );


    return (
      vendor?.accountName ||
      bill.partyAccountCode ||
      '—'
    );
  }


  trackVoucher(
    index: number,
    bill: Voucher
  ): string {

    return (
      bill._id ||
      bill.voucherNumber ||
      String(index)
    );
  }


  private buildPayload() {

    const raw =
      this.billForm
        .getRawValue();


    const lines:
      VoucherLinePayload[] =
      raw.lines

        .map(
          line => ({

            accountId:
              String(
                line.accountId ||
                ''
              ).trim(),

            description:
              String(
                line.description ||
                ''
              ).trim() ||
              undefined,

            debit:
              this.roundMoney(
                Number(
                  line.debit ||
                  0
                )
              ),

            credit:
              this.roundMoney(
                Number(
                  line.credit ||
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
              line.debit > 0 ||
              line.credit > 0
            )
        );


    return {

      voucherDate:
        String(
          raw.voucherDate ||
          ''
        ),

      partyAccountId:
        String(
          raw.partyAccountId ||
          ''
        ),

      referenceNo:
        String(
          raw.referenceNo ||
          ''
        ).trim() ||
        undefined,

      referenceDate:
        String(
          raw.referenceDate ||
          ''
        ) ||
        null,

      narration:
        String(
          raw.narration ||
          ''
        ).trim() ||
        undefined,

      lines
    };
  }


  private resetLines(): void {

    this.lines.clear();

    this.addLine();

    this.addLine();
  }


  private sumLines(
    lines:
      VoucherLinePayload[],
    field:
      'debit' |
      'credit'
  ): number {

    return this.roundMoney(
      lines.reduce(
        (
          total,
          line
        ) =>
          total +
          Number(
            line[field] ||
            0
          ),
        0
      )
    );
  }


  private roundMoney(
    value: number
  ): number {

    return (
      Math.round(
        (
          Number(value) +
          Number.EPSILON
        ) *
        100
      ) /
      100
    );
  }


  private today(): string {

    const now =
      new Date();

    const offset =
      now.getTimezoneOffset();

    return new Date(
      now.getTime() -
      offset * 60_000
    )
      .toISOString()
      .slice(
        0,
        10
      );
  }


  private dateOnly(
    value: string
  ): string {

    return String(
      value ||
      ''
    ).slice(
      0,
      10
    );
  }


  private extractErrorMessage(
    error: unknown,
    fallback: string
  ): string {

    if (
      error &&
      typeof error ===
        'object'
    ) {

      const candidate =
        error as {
          error?: {
            message?: string;
          };
          message?: string;
        };


      return (
        candidate.error?.message ||
        candidate.message ||
        fallback
      );
    }


    return fallback;
  }

}
