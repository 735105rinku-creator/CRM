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
  OutstandingAccount,
  OutstandingReport
} from '../../models/accounts.models';

import {
  OutstandingQuery,
  OutstandingService,
  OutstandingType
} from '../../services/outstanding.service';


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


@Component({
  selector: 'app-outstanding',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './outstanding.component.html',

  styleUrl:
    './outstanding.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class OutstandingComponent
  implements OnInit {

  private readonly service =
    inject(OutstandingService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly report =
    signal<OutstandingReport | null>(
      null
    );


  readonly loading =
    signal(false);


  readonly errorMessage =
    signal('');


  readonly filterForm =
    this.formBuilder.nonNullable.group({
      asOf: [
        localDateValue(
          new Date()
        )
      ],

      type: [''],

      accountId: ['']
    });


  readonly receivableAccounts =
    computed(
      () =>
        this.report()
          ?.receivables
          ?.accounts ??
        []
    );


  readonly payableAccounts =
    computed(
      () =>
        this.report()
          ?.payables
          ?.accounts ??
        []
    );


  readonly accountOptions =
    computed(
      () => {

        const allAccounts = [
          ...this.receivableAccounts(),
          ...this.payableAccounts()
        ];

        return Array.from(
          new Map(
            allAccounts.map(
              (account) => [
                String(
                  account.accountId
                ),
                account
              ]
            )
          ).values()
        );

      }
    );


  ngOnInit(): void {

    this.loadOutstanding();

  }


  loadOutstanding(): void {

    const value =
      this.filterForm.getRawValue();

    const query:
      OutstandingQuery = {};


    if (
      value.asOf
    ) {

      query.asOf =
        value.asOf;

    }


    if (
      value.type
    ) {

      query.type =
        value.type as OutstandingType;

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
      .getOutstanding(query)
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
            'Unable to load outstanding report.'
          );

        }

      });

  }


  applyFilters(): void {

    this.loadOutstanding();

  }


  resetFilters(): void {

    this.filterForm.reset({
      asOf:
        localDateValue(
          new Date()
        ),

      type: '',

      accountId: ''
    });

    this.loadOutstanding();

  }


  trackAccount(
    _index: number,
    account: OutstandingAccount
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