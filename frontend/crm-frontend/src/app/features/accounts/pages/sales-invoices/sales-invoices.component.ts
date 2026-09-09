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


@Component({
  selector: 'app-sales-invoices',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './sales-invoices.component.html',

  styleUrl:
    './sales-invoices.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class SalesInvoicesComponent
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
    'sales' =
    'sales';


  readonly invoices =
    signal<Voucher[]>([]);

  readonly accounts =
    signal<ChartOfAccount[]>([]);

  readonly customers =
    signal<AccountParty[]>([]);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

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


  readonly invoiceForm =
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

    return this.invoiceForm.controls.lines;
  }


  ngOnInit(): void {

    this.loadReferenceData();

    this.loadInvoices();
  }


  loadReferenceData(): void {

    forkJoin({

      accounts:
        this.chartOfAccountsService
          .getActiveAccounts(),

      customers:
        this.accountPartyService
          .getCustomers({
            status: 'active'
          })

    }).subscribe({

      next: ({
        accounts,
        customers
      }) => {

        this.accounts.set(
          Array.isArray(accounts)
            ? accounts
            : []
        );

        this.customers.set(
          Array.isArray(customers)
            ? customers
            : []
        );
      },

      error: (
        err
      ) => {

        this.error.set(
          this.extractErrorMessage(
            err,
            'Unable to load invoice accounts.'
          )
        );
      }
    });
  }


  loadInvoices(): void {

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
      .getSalesVouchers(
        query
      )
      .subscribe({

        next: (
          invoices
        ) => {

          this.invoices.set(
            Array.isArray(invoices)
              ? invoices
              : []
          );

          this.loading.set(false);
        },

        error: (
          err
        ) => {

          this.invoices.set([]);

          this.error.set(
            this.extractErrorMessage(
              err,
              'Unable to load Sales Invoices.'
            )
          );

          this.loading.set(false);
        }
      });
  }


  applyFilters(): void {

    this.loadInvoices();
  }


  resetFilters(): void {

    this.search.set('');

    this.statusFilter.set('');

    this.fromDate.set('');

    this.toDate.set('');

    this.loadInvoices();
  }


  openNewInvoice(): void {

    this.editingVoucherId.set(
      null
    );

    this.invoiceForm.reset({

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


  editInvoice(
    invoice: Voucher
  ): void {

    if (
      invoice.status !==
      'draft'
    ) {
      return;
    }


    this.editingVoucherId.set(
      invoice._id ||
      null
    );


    this.invoiceForm.patchValue({

      voucherDate:
        this.dateOnly(
          invoice.voucherDate
        ),

      partyAccountId:
        invoice.partyAccountId ||
        '',

      referenceNo:
        invoice.referenceNo ||
        '',

      referenceDate:
        invoice.referenceDate
          ? this.dateOnly(
              invoice.referenceDate
            )
          : '',

      narration:
        invoice.narration ||
        ''
    });


    this.lines.clear();


    for (
      const line of
      invoice.lines || []
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
      this.invoiceForm.invalid
    ) {

      this.invoiceForm
        .markAllAsTouched();

      this.error.set(
        'Please complete all required invoice fields.'
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
        'Invoice debit and credit totals must be equal and greater than zero.'
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
            .createSalesVoucher(
              payload
            );


    request.subscribe({

      next: () => {

        this.saving.set(false);

        this.formOpen.set(false);

        this.message.set(
          voucherId
            ? 'Sales Invoice draft updated successfully.'
            : 'Sales Invoice draft created successfully.'
        );

        this.loadInvoices();
      },

      error: (
        err
      ) => {

        this.saving.set(false);

        this.error.set(
          this.extractErrorMessage(
            err,
            'Unable to save Sales Invoice draft.'
          )
        );
      }
    });
  }


  postInvoice(
    invoice: Voucher
  ): void {

    const id =
      invoice._id;


    if (
      !id ||
      invoice.status !==
        'draft'
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Post invoice ${invoice.voucherNumber}? Posted invoices cannot be edited.`
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
            'Sales Invoice posted successfully.'
          );

          this.loadInvoices();
        },

        error: (
          err
        ) => {

          this.saving.set(false);

          this.error.set(
            this.extractErrorMessage(
              err,
              'Unable to post Sales Invoice.'
            )
          );
        }
      });
  }


  voidInvoice(
    invoice: Voucher
  ): void {

    const id =
      invoice._id;


    if (
      !id ||
      invoice.status !==
        'posted'
    ) {
      return;
    }


    const reason =
      window.prompt(
        `Reason for voiding ${invoice.voucherNumber}:`
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
            'Sales Invoice voided successfully.'
          );

          this.loadInvoices();
        },

        error: (
          err
        ) => {

          this.saving.set(false);

          this.error.set(
            this.extractErrorMessage(
              err,
              'Unable to void Sales Invoice.'
            )
          );
        }
      });
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
    invoice: Voucher
  ): string {

    if (
      invoice.partyAccountName
    ) {
      return invoice.partyAccountName;
    }


    const customer =
      this.customers()
        .find(
          item =>
            item._id ===
            invoice.partyAccountId
        );


    return (
      customer?.accountName ||
      invoice.partyAccountCode ||
      '—'
    );
  }


  trackVoucher(
    index: number,
    invoice: Voucher
  ): string {

    return (
      invoice._id ||
      invoice.voucherNumber ||
      String(index)
    );
  }


  private buildPayload() {

    const raw =
      this.invoiceForm
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