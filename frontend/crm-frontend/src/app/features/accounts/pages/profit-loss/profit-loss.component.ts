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
  ProfitLossAccount,
  ProfitLossReport
} from '../../models/accounts.models';

import {
  ProfitLossService
} from '../../services/profit-loss.service';


@Component({
  selector: 'app-profit-loss',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl:
    './profit-loss.component.html',
  styleUrl:
    './profit-loss.component.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class ProfitLossComponent {

  private readonly fb =
    inject(FormBuilder);

  private readonly service =
    inject(ProfitLossService);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly report =
    signal<ProfitLossReport | null>(null);

  readonly loading =
    signal(false);

  readonly errorMessage =
    signal('');


  readonly periodForm =
    this.fb.nonNullable.group({
      from: [''],
      to: ['']
    });


  readonly resultLabel =
    computed(() => {

      const result =
        this.report()?.result;

      if (result === 'profit') {
        return 'Net Profit';
      }

      if (result === 'loss') {
        return 'Net Loss';
      }

      return 'Break-even';

    });


  readonly resultAmount =
    computed(() => {

      const report =
        this.report();

      if (!report) {
        return 0;
      }

      if (report.result === 'profit') {
        return report.netProfit;
      }

      if (report.result === 'loss') {
        return report.netLoss;
      }

      return 0;

    });


  constructor() {

    this.loadProfitLoss();

  }


  loadProfitLoss(): void {

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
      .getProfitLoss(query)
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
            'Unable to load Profit & Loss.'
          );

        }
      });

  }


  applyPeriod(): void {

    this.loadProfitLoss();

  }


  resetPeriod(): void {

    this.periodForm.reset({
      from: '',
      to: ''
    });

    this.loadProfitLoss();

  }


  trackAccount(
    index: number,
    account: ProfitLossAccount
  ): string {

    return account.accountId;

  }

}