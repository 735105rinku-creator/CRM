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
  Voucher,
  VoucherLinePayload,
  VoucherQuery,
  VoucherStatus,
  VoucherType
} from '../../models/accounts.models';

import {
  ChartOfAccountsService
} from '../../services/chart-of-accounts.service';

import {
  VoucherService
} from '../../services/voucher.service';


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


  readonly voucherType =
    signal<SupportedVoucherType>('journal');

  readonly title =
    signal('Journal Vouchers');

  readonly vouchers =
    signal<Voucher[]>([]);

  readonly accounts =
    signal<ChartOfAccount[]>([]);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

  readonly errorMessage =
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


  readonly voucherForm =
    this.fb.group({

      voucherDate: [
        this.today(),
        Validators.required
      ],

      referenceNo: [''],

      referenceDate: [''],

      narration: [''],

      lines: this.fb.array([
        this.createLine(),
        this.createLine()
      ])
    });


  constructor() {

    this.readRouteConfiguration();

    this.loadReferenceData();

    this.loadVouchers();
  }


  get lines(): FormArray {

    return this.voucherForm.controls.lines;
  }


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


  loadVouchers(): void {

    const query: VoucherQuery = {
      voucherType:
        this.voucherType(),
      sortBy: 'voucherDate',
      sortOrder: 'desc'
    };

    const search =
      this.search().trim();

    if (search) {
      query.search = search;
    }

    const status =
      this.statusFilter();

    if (status) {
      query.status = status;
    }

    const from =
      this.fromDate();

    if (from) {
      query.from = from;
    }

    const to =
      this.toDate();

    if (to) {
      query.to = to;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.voucherService
      .getVouchers(query)
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


  openNewVoucher(): void {

    this.editingVoucherId.set(null);

    this.voucherForm.reset({
      voucherDate: this.today(),
      referenceNo: '',
      referenceDate: '',
      narration: ''
    });

    this.resetLines();

    this.errorMessage.set('');
    this.message.set('');
    this.formOpen.set(true);
  }


  editVoucher(
    voucher: Voucher
  ): void {

    if (
      voucher.status !== 'draft' ||
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
        voucher.referenceNo ?? '',

      referenceDate:
        this.toDateInput(
          voucher.referenceDate
        ),

      narration:
        voucher.narration ?? ''
    });

    this.lines.clear();

    for (
      const line of
      voucher.lines ?? []
    ) {

      this.lines.push(
        this.createLine({
          accountId:
            line.accountId ?? '',

          description:
            line.description ?? '',

          debit:
            Number(
              line.debit ?? 0
            ),

          credit:
            Number(
              line.credit ?? 0
            )
        })
      );
    }

    while (
      this.lines.length < 2
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

    if (this.saving()) {
      return;
    }

    this.formOpen.set(false);

    this.editingVoucherId.set(null);
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

    this.lines.removeAt(index);
  }


  onDebitInput(
    index: number
  ): void {

    const line =
      this.lines.at(index);

    const debit =
      Number(
        line.get('debit')?.value || 0
      );

    if (debit > 0) {

      line.get('credit')
        ?.setValue(
          0,
          {
            emitEvent: false
          }
        );
    }
  }


  onCreditInput(
    index: number
  ): void {

    const line =
      this.lines.at(index);

    const credit =
      Number(
        line.get('credit')?.value || 0
      );

    if (credit > 0) {

      line.get('debit')
        ?.setValue(
          0,
          {
            emitEvent: false
          }
        );
    }
  }


  totalDebit(): number {

    return this.roundMoney(
      this.lines.controls.reduce(
        (total, control) =>
          total +
          Number(
            control.get('debit')
              ?.value || 0
          ),
        0
      )
    );
  }


  totalCredit(): number {

    return this.roundMoney(
      this.lines.controls.reduce(
        (total, control) =>
          total +
          Number(
            control.get('credit')
              ?.value || 0
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


  saveDraft(): void {

    this.errorMessage.set('');
    this.message.set('');

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
      this.buildPayload();

    if (
      payload.lines.length < 2
    ) {

      this.errorMessage.set(
        'At least two valid accounting lines are required.'
      );

      return;
    }

    if (!this.balanced()) {

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

        next: () => {

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


  postVoucher(
    voucher: Voucher
  ): void {

    if (
      voucher.status !== 'draft' ||
      !voucher._id
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Post voucher ${voucher.voucherNumber}? Posted vouchers cannot be edited.`
      );

    if (!confirmed) {
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


  voidVoucher(
    voucher: Voucher
  ): void {

    if (
      voucher.status !== 'posted' ||
      !voucher._id
    ) {
      return;
    }

    const reason =
      window.prompt(
        `Reason for voiding ${voucher.voucherNumber}:`
      )?.trim();

    if (!reason) {
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


  accountLabel(
    accountId: string
  ): string {

    const account =
      this.accounts()
        .find(
          (item) =>
            item._id === accountId
        );

    if (!account) {
      return '—';
    }

    return [
      account.accountCode,
      account.accountName
    ]
      .filter(Boolean)
      .join(' · ');
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
      String(index)
    );
  }


  trackAccount(
    index: number,
    account: ChartOfAccount
  ): string {

    return (
      account._id ||
      account.accountCode ||
      String(index)
    );
  }


  private readRouteConfiguration(): void {

    const data =
      this.route.snapshot.data;

    const routeType =
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
      data['title'];

    if (
      typeof routeTitle === 'string' &&
      routeTitle.trim()
    ) {
      this.title.set(
        routeTitle.trim()
      );
    }
  }


  private buildPayload():
    CreateVoucherPayload {

    const raw =
      this.voucherForm.getRawValue();

    const lines:
      VoucherLinePayload[] =
        raw.lines
          .map((line) => ({

            accountId:
              String(
                line.accountId ?? ''
              ).trim(),

            description:
              String(
                line.description ?? ''
              ).trim(),

            debit:
              this.roundMoney(
                Number(
                  line.debit ?? 0
                )
              ),

            credit:
              this.roundMoney(
                Number(
                  line.credit ?? 0
                )
              )
          }))
          .filter(
            (line) =>
              Boolean(
                line.accountId
              ) &&
              (
                line.debit > 0 ||
                line.credit > 0
              )
          );

    return {
      voucherType:
        this.voucherType(),

      voucherDate:
        String(
          raw.voucherDate ?? ''
        ),

      referenceNo:
        String(
          raw.referenceNo ?? ''
        ).trim(),

      referenceDate:
        raw.referenceDate
          ? String(
              raw.referenceDate
            )
          : null,

      narration:
        String(
          raw.narration ?? ''
        ).trim(),

      lines
    };
  }


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
        value.accountId ?? '',
        Validators.required
      ],

      description: [
        value.description ?? ''
      ],

      debit: [
        value.debit ?? 0,
        [
          Validators.min(0)
        ]
      ],

      credit: [
        value.credit ?? 0,
        [
          Validators.min(0)
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
      String(value)
    );
  }


  private today(): string {

    const now =
      new Date();

    const offset =
      now.getTimezoneOffset();

    const local =
      new Date(
        now.getTime() -
        offset * 60_000
      );

    return local
      .toISOString()
      .slice(0, 10);
  }


  private toDateInput(
    value?: string | null
  ): string {

    if (!value) {
      return '';
    }

    return String(value)
      .slice(0, 10);
  }


  private roundMoney(
    value: number
  ): number {

    return Math.round(
      (
        Number(value) +
        Number.EPSILON
      ) * 100
    ) / 100;
  }


  private extractError(
    error: any,
    fallback: string
  ): string {

    return (
      error?.error?.message ||
      error?.message ||
      fallback
    );
  }

}