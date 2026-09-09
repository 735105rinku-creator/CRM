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
  GstReport,
  GstReportEntry
} from '../../models/accounts.models';

import {
  GstReportQuery,
  GstReportService
} from '../../services/gst-report.service';


function localDateValue(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
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


function indianFinancialYear(
  date: Date
): {
  from: string;
  to: string;
} {
  const year =
    date.getFullYear();

  const month =
    date.getMonth();

  const startYear =
    month >= 3
      ? year
      : year - 1;

  return {
    from:
      `${startYear}-04-01`,

    to:
      localDateValue(date)
  };
}


@Component({
  selector: 'app-gst-report',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './gst-report.component.html',

  styleUrl:
    './gst-report.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class GstReportComponent
  implements OnInit {

  private readonly service =
    inject(GstReportService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly defaultPeriod =
    indianFinancialYear(
      new Date()
    );

  readonly report =
    signal<GstReport | null>(
      null
    );

  readonly loading =
    signal(false);

  readonly errorMessage =
    signal('');

  readonly filterForm =
    this.formBuilder.nonNullable.group({
      from: [
        this.defaultPeriod.from
      ],

      to: [
        this.defaultPeriod.to
      ]
    });

  readonly outputEntries =
    computed(
      () =>
        this.report()
          ?.outputTax
          ?.entries ??
        []
    );

  readonly inputEntries =
    computed(
      () =>
        this.report()
          ?.inputTax
          ?.entries ??
        []
    );

  readonly netGst =
    computed(
      () =>
        this.report()?.netGst ??
        {
          amount: 0,
          type:
            'settled' as const
        }
    );

  ngOnInit(): void {
    this.loadGstReport();
  }

  loadGstReport(): void {
    const value =
      this.filterForm.getRawValue();

    if (
      value.from &&
      value.to &&
      value.from > value.to
    ) {
      this.errorMessage.set(
        'From date cannot be after To date.'
      );

      return;
    }

    const query:
      GstReportQuery = {};

    if (value.from) {
      query.from =
        value.from;
    }

    if (value.to) {
      query.to =
        value.to;
    }

    this.loading.set(true);

    this.errorMessage.set('');

    this.service
      .getGstReport(query)
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
        },

        error: (error) => {
          this.report.set(
            null
          );

          this.errorMessage.set(
            error?.error?.message ||
            error?.message ||
            'Unable to load GST report.'
          );
        }
      });
  }

  applyFilters(): void {
    this.loadGstReport();
  }

  resetFilters(): void {
    this.filterForm.reset({
      from:
        this.defaultPeriod.from,

      to:
        this.defaultPeriod.to
    });

    this.loadGstReport();
  }

  trackEntry(
    index: number,
    entry: GstReportEntry
  ): string {
    return (
      entry.voucherId ||
      `${entry.voucherNumber}-${entry.accountId}-${index}`
    );
  }
}