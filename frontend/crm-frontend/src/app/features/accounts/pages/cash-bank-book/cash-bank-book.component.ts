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
  FormBuilder,
  ReactiveFormsModule
} from '@angular/forms';

import {
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  CashBankAccount,
  CashBankBookReport
} from '../../models/accounts.models';

import {
  CashBankBookQuery,
  CashBankBookService
} from '../../services/cash-bank-book.service';


interface FinancialYearRange {
  from: string;

  to: string;

  label: string;
}


const toDateString = (
  year: number,
  month: number,
  day: number
): string => {

  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');

};


const currentFinancialYear =
  (): FinancialYearRange => {

    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      now.getMonth() + 1;

    const startYear =
      month >= 4
        ? year
        : year - 1;

    const endYear =
      startYear + 1;

    return {
      from:
        toDateString(
          startYear,
          4,
          1
        ),

      to:
        toDateString(
          endYear,
          3,
          31
        ),

      label:
        `FY ${startYear}-${String(endYear).slice(-2)}`
    };

  };


@Component({
  selector: 'app-cash-bank-book',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './cash-bank-book.component.html',

  styleUrl:
    './cash-bank-book.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class CashBankBookComponent {

  private readonly service =
    inject(CashBankBookService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly financialYearRange =
    currentFinancialYear();


  readonly report =
    signal<CashBankBookReport | null>(
      null
    );


  readonly loading =
    signal(false);


  readonly errorMessage =
    signal('');


  readonly selectedAccountId =
    signal('');


  readonly filterForm =
    this.formBuilder.nonNullable.group({
      from: [
        this.financialYearRange.from
      ],

      to: [
        this.financialYearRange.to
      ],

      accountId: ['']
    });


  readonly accounts =
    computed(
      () =>
        this.report()?.accounts ??
        []
    );


  readonly selectedAccount =
    computed<CashBankAccount | null>(
      () => {

        const accountId =
          this.selectedAccountId();

        if (
          !accountId
        ) {

          return null;

        }

        return (
          this.accounts().find(
            (account) =>
              String(
                account.accountId
              ) ===
              accountId
          ) ??
          null
        );

      }
    );


  readonly visibleAccounts =
    computed(
      () => {

        const selected =
          this.selectedAccount();

        return selected
          ? [selected]
          : this.accounts();

      }
    );


  constructor() {

    this.loadCashBankBook();

  }


  loadCashBankBook(): void {

    const value =
      this.filterForm.getRawValue();


    if (
      value.from &&
      value.to &&
      value.from > value.to
    ) {

      this.errorMessage.set(
        'From Date cannot be after To Date.'
      );

      return;

    }


    const query:
      CashBankBookQuery = {};


    if (
      value.from
    ) {

      query.from =
        value.from;

    }


    if (
      value.to
    ) {

      query.to =
        value.to;

    }


    if (
      value.accountId
    ) {

      query.accountId =
        value.accountId;

    }


    this.loading.set(true);

    this.errorMessage.set('');


    this.service
      .getCashBankBook(query)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        ),

        finalize(
          () =>
            this.loading.set(false)
        )
      )
      .subscribe({

        next: (report) => {

          this.report.set(
            report
          );

          this.selectedAccountId.set(
            value.accountId || ''
          );

        },

        error: (error) => {

          this.errorMessage.set(
            error?.error?.message ||
            error?.message ||
            'Unable to load Cash & Bank Book.'
          );

        }

      });

  }


  applyFilters(): void {

    this.loadCashBankBook();

  }


  resetFilters(): void {

    this.filterForm.reset({
      from:
        this.financialYearRange.from,

      to:
        this.financialYearRange.to,

      accountId: ''
    });

    this.selectedAccountId.set('');

    this.loadCashBankBook();

  }


  selectAccount(
    accountId: string
  ): void {

    this.filterForm.patchValue({
      accountId
    });

    this.selectedAccountId.set(
      accountId
    );

  }


  showAllAccounts(): void {

    this.filterForm.patchValue({
      accountId: ''
    });

    this.selectedAccountId.set('');

  }


  signedBalance(
    balance:
      | {
          amount: number;
          type: 'debit' | 'credit';
        }
      | null
      | undefined
  ): number {

    const amount =
      Number(
        balance?.amount ||
        0
      );

    return (
      balance?.type === 'credit'
        ? -amount
        : amount
    );

  }


  trackAccount(
    _index: number,
    account: CashBankAccount
  ): string {

    return String(
      account.accountId
    );

  }


  trackEntry(
    index: number
  ): number {

    return index;

  }

}