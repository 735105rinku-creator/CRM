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
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  finalize
} from 'rxjs/operators';

import {
  BalanceSheetAccount,
  BalanceSheetReport
} from '../../models/accounts.models';

import {
  BalanceSheetService
} from '../../services/balance-sheet.service';


const todayLocalDate = (): string => {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      now.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;

};


@Component({
  selector: 'app-balance-sheet',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './balance-sheet.component.html',
  styleUrl:
    './balance-sheet.component.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class BalanceSheetComponent {

  private readonly fb =
    inject(FormBuilder);

  private readonly service =
    inject(BalanceSheetService);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly today =
    todayLocalDate();


  readonly report =
    signal<BalanceSheetReport | null>(null);

  readonly loading =
    signal(false);

  readonly errorMessage =
    signal('');


  readonly asOfForm =
    this.fb.nonNullable.group({
      asOf: [this.today]
    });


  readonly currentPeriodResultLabel =
    computed(() => {

      const type =
        this.report()
          ?.currentPeriodResult
          ?.type;

      if (type === 'profit') {
        return 'Current Period Profit';
      }

      if (type === 'loss') {
        return 'Current Period Loss';
      }

      return 'Current Period Break-even';

    });


  readonly isBalanced =
    computed(
      () =>
        this.report()?.isBalanced ?? false
    );


  constructor() {

    this.loadBalanceSheet();

  }


  loadBalanceSheet(): void {

    const asOf =
      this.asOfForm.controls.asOf.value;

    if (!asOf) {

      this.errorMessage.set(
        'Please select an As of date.'
      );

      return;

    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.service
      .getBalanceSheet({
        asOf
      })
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
            'Unable to load Balance Sheet.'
          );

        }
      });

  }


  applyAsOf(): void {

    this.loadBalanceSheet();

  }


  resetAsOf(): void {

    this.asOfForm.reset({
      asOf: this.today
    });

    this.loadBalanceSheet();

  }


  trackAccount(
    index: number,
    account: BalanceSheetAccount
  ): string {

    return account.accountId;

  }

}