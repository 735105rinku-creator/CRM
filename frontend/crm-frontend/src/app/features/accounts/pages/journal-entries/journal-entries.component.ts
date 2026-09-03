import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  JournalEntry,
  JournalEntryQuery,
  JournalEntryStatus,
} from '../../models/accounts.models';

import {
  JournalEntryService,
} from '../../services/journal-entry.service';


@Component({
  selector: 'app-journal-entries',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
  ],

  templateUrl:
    './journal-entries.component.html',

  styleUrl:
    './journal-entries.component.scss',
})
export class JournalEntriesComponent
  implements OnInit {

  /* =========================================================
     DEPENDENCIES
  ========================================================= */

  private readonly journalEntryService =
    inject(JournalEntryService);


  /* =========================================================
     JOURNAL LIST STATE
  ========================================================= */

  readonly journals =
    signal<JournalEntry[]>([]);


  readonly loading =
    signal(false);


  readonly error =
    signal('');


  /* =========================================================
     FILTER STATE
  ========================================================= */

  readonly search =
    signal('');


  readonly statusFilter =
    signal<JournalEntryStatus | ''>(
      ''
    );


  readonly fromDate =
    signal('');


  readonly toDate =
    signal('');


  /* =========================================================
     DERIVED STATE
  ========================================================= */

  readonly journalCount =
    computed(
      () =>
        this.journals().length
    );


  readonly draftCount =
    computed(
      () =>
        this.journals()
          .filter(
            (
              journal
            ) =>
              journal.status ===
              'draft'
          )
          .length
    );


  readonly postedCount =
    computed(
      () =>
        this.journals()
          .filter(
            (
              journal
            ) =>
              journal.status ===
              'posted'
          )
          .length
    );


  readonly voidCount =
    computed(
      () =>
        this.journals()
          .filter(
            (
              journal
            ) =>
              journal.status ===
              'void'
          )
          .length
    );


  readonly totalDebit =
    computed(
      () =>
        this.roundMoney(
          this.journals()
            .reduce(
              (
                total,
                journal
              ) =>
                total +
                Number(
                  journal.totalDebit ||
                  0
                ),
              0
            )
        )
    );


  readonly totalCredit =
    computed(
      () =>
        this.roundMoney(
          this.journals()
            .reduce(
              (
                total,
                journal
              ) =>
                total +
                Number(
                  journal.totalCredit ||
                  0
                ),
              0
            )
        )
    );


  /* =========================================================
     LIFECYCLE
  ========================================================= */

  ngOnInit(): void {
    this.loadJournals();
  }


  /* =========================================================
     LOAD JOURNALS
  ========================================================= */

  loadJournals(): void {
    this.loading.set(true);

    this.error.set('');


    const query =
      this.buildQuery();


    this.journalEntryService
      .getAll(
        query
      )
      .subscribe({

        next: (
          journals
        ) => {
          this.journals.set(
            Array.isArray(
              journals
            )
              ? journals
              : []
          );

          this.loading.set(false);
        },


        error: (
          err
        ) => {
          this.journals.set([]);

          this.error.set(
            this.extractErrorMessage(
              err
            )
          );

          this.loading.set(false);
        },

      });
  }


  /* =========================================================
     APPLY FILTERS
  ========================================================= */

  applyFilters(): void {
    this.loadJournals();
  }


  /* =========================================================
     RESET FILTERS
  ========================================================= */

  resetFilters(): void {
    this.search.set('');

    this.statusFilter.set('');

    this.fromDate.set('');

    this.toDate.set('');

    this.loadJournals();
  }


  /* =========================================================
     REFRESH
  ========================================================= */

  refresh(): void {
    this.loadJournals();
  }


  /* =========================================================
     BUILD QUERY
  ========================================================= */

  private buildQuery():
    JournalEntryQuery {

    const query:
      JournalEntryQuery = {

      sortBy:
        'journalDate',

      sortOrder:
        'desc',

    };


    const searchValue =
      this.search()
        .trim();


    if (
      searchValue
    ) {
      query.search =
        searchValue;
    }


    const status =
      this.statusFilter();


    if (
      status
    ) {
      query.status =
        status;
    }


    const from =
      this.fromDate()
        .trim();


    if (
      from
    ) {
      query.from =
        from;
    }


    const to =
      this.toDate()
        .trim();


    if (
      to
    ) {
      query.to =
        to;
    }


    return query;
  }


  /* =========================================================
     STATUS HELPERS
  ========================================================= */

  statusLabel(
    status:
      JournalEntryStatus
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
    status:
      JournalEntryStatus
  ): string {

    return `status-${status}`;
  }


  /* =========================================================
     REFERENCE DISPLAY
  ========================================================= */

  referenceLabel(
    journal:
      JournalEntry
  ): string {

    const referenceNo =
      String(
        journal.referenceNo ||
        ''
      )
        .trim();


    if (
      referenceNo
    ) {
      return referenceNo;
    }


    return this.formatReferenceType(
      journal.referenceType
    );
  }


  private formatReferenceType(
    value:
      JournalEntry['referenceType']
  ): string {

    return String(
      value ||
      'manual'
    )
      .split('_')
      .map(
        (
          part
        ) =>
          part
            .charAt(0)
            .toUpperCase() +
          part
            .slice(1)
      )
      .join(' ');
  }


  /* =========================================================
     DATE DISPLAY
  ========================================================= */

  formatDate(
    value:
      string | null | undefined
  ): string {

    if (
      !value
    ) {
      return '—';
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }


    return date
      .toLocaleDateString(
        'en-IN',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric',
        }
      );
  }


  /* =========================================================
     CURRENCY DISPLAY
  ========================================================= */

  formatCurrency(
    value:
      number | null | undefined
  ): string {

    const amount =
      Number(
        value ||
        0
      );


    return new Intl
      .NumberFormat(
        'en-IN',
        {
          style:
            'currency',

          currency:
            'INR',

          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2,
        }
      )
      .format(
        amount
      );
  }


  /* =========================================================
     ROW TRACKING
  ========================================================= */

  trackJournal(
    index:
      number,

    journal:
      JournalEntry
  ): string {

    return (
      journal._id ||
      journal.journalNumber ||
      String(
        index
      )
    );
  }


  /* =========================================================
     MONEY
  ========================================================= */

  private roundMoney(
    value:
      number
  ): number {

    return (
      Math.round(
        Number(
          value ||
          0
        ) *
        100
      ) /
      100
    );
  }


  /* =========================================================
     ERROR MESSAGE
  ========================================================= */

  private extractErrorMessage(
    error:
      unknown
  ): string {

    if (
      typeof error ===
      'object' &&
      error !==
      null
    ) {

      const candidate =
        error as {
          error?: {
            message?: string;
          };

          message?: string;
        };


      if (
        candidate.error
          ?.message
      ) {
        return candidate
          .error
          .message;
      }


      if (
        candidate.message
      ) {
        return candidate
          .message;
      }

    }


    return (
      'Unable to load Journal Entries. Please try again.'
    );
  }

}