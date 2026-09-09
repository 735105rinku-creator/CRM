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
  ChartOfAccount,
  CreateJournalEntryPayload,
  JournalEntry,
  JournalEntryLinePayload,
  JournalEntryQuery,
  JournalEntryStatus,
} from '../../models/accounts.models';

import {
  ChartOfAccountsService,
} from '../../services/chart-of-accounts.service';

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

  private readonly chartOfAccountsService =
    inject(ChartOfAccountsService);


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
     CREATE FORM STATE
  ========================================================= */

  readonly createFormOpen =
    signal(false);

  readonly activeAccounts =
    signal<ChartOfAccount[]>([]);

  readonly accountsLoading =
    signal(false);

  readonly saving =
    signal(false);

  readonly postingJournalId =
    signal<string | null>(null);

  readonly voidingJournalId =
    signal<string | null>(null);

  readonly formError =
    signal('');

  readonly formSuccess =
    signal('');

  readonly journalDate =
    signal(
      this.getTodayDate()
    );

  readonly narration =
    signal('');

  readonly referenceNo =
    signal('');

  readonly journalLines =
    signal<JournalEntryLinePayload[]>([
      this.createEmptyLine(),
      this.createEmptyLine(),
    ]);


  readonly draftTotalDebit =
    computed(
      () =>
        this.roundMoney(
          this.journalLines()
            .reduce(
              (
                total,
                line
              ) =>
                total +
                Number(
                  line.debit ||
                  0
                ),
              0
            )
        )
    );

  readonly draftTotalCredit =
    computed(
      () =>
        this.roundMoney(
          this.journalLines()
            .reduce(
              (
                total,
                line
              ) =>
                total +
                Number(
                  line.credit ||
                  0
                ),
              0
            )
        )
    );

  readonly draftDifference =
    computed(
      () =>
        this.roundMoney(
          this.draftTotalDebit() -
          this.draftTotalCredit()
        )
    );


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
    this.loadActiveAccounts();
  }


  /* =========================================================
     LOAD ACTIVE ACCOUNTS
  ========================================================= */

  loadActiveAccounts(): void {
    this.accountsLoading.set(true);

    this.chartOfAccountsService
      .getActiveAccounts()
      .subscribe({

        next: (
          accounts
        ) => {
          this.activeAccounts.set(
            Array.isArray(
              accounts
            )
              ? accounts
                  .filter(
                    (
                      account
                    ) =>
                      Boolean(
                        account._id
                      )
                  )
                  .sort(
                    (
                      left,
                      right
                    ) =>
                      left.accountName
                        .localeCompare(
                          right.accountName
                        )
                  )
              : []
          );

          this.accountsLoading.set(false);
        },

        error: () => {
          this.activeAccounts.set([]);

          this.accountsLoading.set(false);
        },

      });
  }


  /* =========================================================
     CREATE FORM
  ========================================================= */

  openCreateForm(): void {
    this.formError.set('');
    this.formSuccess.set('');

    this.resetDraftForm();

    this.createFormOpen.set(true);
  }


  closeCreateForm(): void {
    if (
      this.saving()
    ) {
      return;
    }

    this.createFormOpen.set(false);

    this.formError.set('');
  }


  addLine(): void {
    this.journalLines.update(
      (
        lines
      ) => [
        ...lines,
        this.createEmptyLine(),
      ]
    );
  }


  removeLine(
    index: number
  ): void {
    if (
      this.journalLines().length <=
      2
    ) {
      this.formError.set(
        'A Journal Entry requires at least two lines.'
      );

      return;
    }

    this.journalLines.update(
      (
        lines
      ) =>
        lines.filter(
          (
            _,
            lineIndex
          ) =>
            lineIndex !==
            index
        )
    );

    this.formError.set('');
  }


  updateLine(
    index: number,
    field:
      keyof JournalEntryLinePayload,
    value: string | number
  ): void {

    this.journalLines.update(
      (
        lines
      ) =>
        lines.map(
          (
            line,
            lineIndex
          ) => {

            if (
              lineIndex !==
              index
            ) {
              return line;
            }

            if (
              field ===
              'debit' ||
              field ===
              'credit'
            ) {
              const numericValue =
                Math.max(
                  0,
                  Number(
                    value ||
                    0
                  )
                );

              return {
                ...line,
                [field]:
                  this.roundMoney(
                    numericValue
                  ),
              };
            }

            return {
              ...line,
              [field]:
                String(
                  value ??
                  ''
                ),
            };
          }
        )
    );

    this.formError.set('');
  }


  saveDraft(): void {
    this.formError.set('');
    this.formSuccess.set('');

    const payload =
      this.buildCreatePayload();

    const validationError =
      this.validateDraftPayload(
        payload
      );

    if (
      validationError
    ) {
      this.formError.set(
        validationError
      );

      return;
    }

    this.saving.set(true);

    this.journalEntryService
      .create(
        payload
      )
      .subscribe({

        next: () => {
          this.saving.set(false);

          this.formSuccess.set(
            'Journal Entry saved as Draft successfully.'
          );

          this.createFormOpen.set(false);

          this.resetDraftForm();

          this.loadJournals();
        },

        error: (
          err
        ) => {
          this.saving.set(false);

          this.formError.set(
            this.extractErrorMessage(
              err
            )
          );
        },

      });
  }


  postJournal(
    journal: JournalEntry
  ): void {

    if (
      journal.status !==
      'draft'
    ) {
      return;
    }


    const journalId =
      journal._id;


    if (
      !journalId
    ) {
      this.formError.set(
        'Journal Entry ID is missing.'
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Post Journal Entry ${journal.journalNumber}? Once posted, it will be included in the ledger flow.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    this.formError.set('');
    this.formSuccess.set('');

    this.postingJournalId.set(
      journalId
    );


    this.journalEntryService
      .post(
        journalId
      )
      .subscribe({

        next: () => {
          this.postingJournalId.set(
            null
          );

          this.formSuccess.set(
            'Journal Entry posted successfully.'
          );

          this.loadJournals();
        },

        error: (
          err
        ) => {
          this.postingJournalId.set(
            null
          );

          this.formError.set(
            this.extractErrorMessage(
              err
            )
          );
        },

      });

  }


  voidJournal(
    journal: JournalEntry
  ): void {

    if (
      journal.status !==
      'posted'
    ) {
      return;
    }


    const journalId =
      journal._id;


    if (
      !journalId
    ) {
      this.formError.set(
        'Journal Entry ID is missing.'
      );

      return;
    }


    const voidReason =
      window.prompt(
        `Reason for voiding Journal Entry ${journal.journalNumber}:`
      );


    if (
      voidReason ===
      null
    ) {
      return;
    }


    const reason =
      voidReason.trim();


    if (
      !reason
    ) {
      this.formError.set(
        'Void reason is required.'
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Void Journal Entry ${journal.journalNumber}? This action will reverse its posted ledger effect.`
      );


    if (
      !confirmed
    ) {
      return;
    }


    this.formError.set('');
    this.formSuccess.set('');

    this.voidingJournalId.set(
      journalId
    );


    this.journalEntryService
      .void(
        journalId,
        {
          reason,
        }
      )
      .subscribe({

        next: () => {
          this.voidingJournalId.set(
            null
          );

          this.formSuccess.set(
            'Journal Entry voided successfully.'
          );

          this.loadJournals();
        },

        error: (
          err
        ) => {
          this.voidingJournalId.set(
            null
          );

          this.formError.set(
            this.extractErrorMessage(
              err
            )
          );
        },

      });
  }

  private buildCreatePayload():
    CreateJournalEntryPayload {

    return {
      journalDate:
        this.journalDate(),

      narration:
        this.narration()
          .trim() ||
        undefined,

      referenceType:
        'manual',

      referenceNo:
        this.referenceNo()
          .trim() ||
        undefined,

      lines:
        this.journalLines()
          .map(
            (
              line
            ) => ({
              accountId:
                String(
                  line.accountId ||
                  ''
                )
                  .trim(),

              description:
                line.description
                  ?.trim() ||
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
                ),
            })
          ),
    };
  }


  private validateDraftPayload(
    payload:
      CreateJournalEntryPayload
  ): string {

    if (
      !payload.journalDate
    ) {
      return (
        'Journal Date is required.'
      );
    }

    if (
      payload.lines.length <
      2
    ) {
      return (
        'A Journal Entry requires at least two lines.'
      );
    }

    for (
      let index = 0;
      index <
      payload.lines.length;
      index += 1
    ) {
      const line =
        payload.lines[index];

      if (
        !line.accountId
      ) {
        return (
          `Select an Account for line ${index + 1}.`
        );
      }

      if (
        line.debit < 0 ||
        line.credit < 0
      ) {
        return (
          `Debit and Credit cannot be negative on line ${index + 1}.`
        );
      }

      if (
        line.debit === 0 &&
        line.credit === 0
      ) {
        return (
          `Enter either Debit or Credit on line ${index + 1}.`
        );
      }

      if (
        line.debit > 0 &&
        line.credit > 0
      ) {
        return (
          `A line cannot contain both Debit and Credit on line ${index + 1}.`
        );
      }
    }

    if (
      this.draftTotalDebit() <=
      0
    ) {
      return (
        'Total Debit must be greater than zero.'
      );
    }

    if (
      this.draftTotalDebit() !==
      this.draftTotalCredit()
    ) {
      return (
        'Journal Entry must be balanced before saving.'
      );
    }

    return '';
  }


  private resetDraftForm(): void {
    this.journalDate.set(
      this.getTodayDate()
    );

    this.narration.set('');

    this.referenceNo.set('');

    this.journalLines.set([
      this.createEmptyLine(),
      this.createEmptyLine(),
    ]);
  }


  private createEmptyLine():
    JournalEntryLinePayload {

    return {
      accountId: '',
      description: '',
      debit: 0,
      credit: 0,
    };
  }


  private getTodayDate():
    string {

    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() +
        1
      )
        .padStart(
          2,
          '0'
        );

    const day =
      String(
        now.getDate()
      )
        .padStart(
          2,
          '0'
        );

    return (
      `${year}-${month}-${day}`
    );
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
      return 'â€”';
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
      'Unable to process Journal Entry. Please try again.'
    );
  }

}