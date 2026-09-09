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
} from 'rxjs/operators';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  TrialBalance,
  TrialBalanceAmount,
  TrialBalanceRow
} from '../../models/accounts.models';

import {
  TrialBalanceService
} from '../../services/trial-balance.service';


@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './trial-balance.component.html',
  styleUrl:
    './trial-balance.component.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class TrialBalanceComponent {

  private readonly fb =
    inject(FormBuilder);

  private readonly service =
    inject(TrialBalanceService);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly report =
    signal<TrialBalance | null>(null);

  readonly loading =
    signal(false);

  readonly errorMessage =
    signal('');


  readonly periodForm =
    this.fb.nonNullable.group({
      from: [''],
      to: ['']
    });


  readonly rows =
    computed(
      () =>
        this.report()?.accounts ?? []
    );


  readonly isBalanced =
    computed(() => {

      const totals =
        this.report()?.totals;

      if (!totals) {
        return true;
      }

      const difference =
        totals.difference ??
        (
          totals.closingDebit -
          totals.closingCredit
        );

      return Math.abs(difference) < 0.01;

    });


  constructor() {

    this.loadTrialBalance();

  }


  loadTrialBalance(): void {

    const raw =
      this.periodForm.getRawValue();

    const query = {
      ...(raw.from
        ? { from: raw.from }
        : {}),
      ...(raw.to
        ? { to: raw.to }
        : {})
    };

    this.loading.set(true);
    this.errorMessage.set('');

    this.service
      .getTrialBalance(query)
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

          this.report.set(report);

        },

        error: (error) => {

          this.report.set(null);

          this.errorMessage.set(
            error?.error?.message ??
            error?.message ??
            'Unable to load Trial Balance.'
          );

        }
      });

  }


  applyPeriod(): void {

    this.loadTrialBalance();

  }


  resetPeriod(): void {

    this.periodForm.reset({
      from: '',
      to: ''
    });

    this.loadTrialBalance();

  }


  amountDebit(
    balance: TrialBalanceAmount
  ): number {

    return balance?.type === 'debit'
      ? balance.amount
      : 0;

  }


  amountCredit(
    balance: TrialBalanceAmount
  ): number {

    return balance?.type === 'credit'
      ? balance.amount
      : 0;

  }


  trackRow(
    index: number,
    row: TrialBalanceRow
  ): string {

    return row.accountId;

  }

}