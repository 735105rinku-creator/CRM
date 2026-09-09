import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  finalize
} from 'rxjs';

import {
  DayBookQuery,
  DayBookReport,
  DayBookRow,
  DayBookVoucherType
} from '../../models/accounts.models';

import {
  DayBookService
} from '../../services/day-book.service';


interface VoucherTypeOption {
  label: string;
  value: DayBookVoucherType | '';
}


@Component({
  selector: 'app-day-book',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './day-book.component.html',

  styleUrl:
    './day-book.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class DayBookComponent
  implements OnInit {

  private readonly dayBookService =
    inject(DayBookService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  from = '';

  to = '';

  voucherType:
    DayBookVoucherType | '' = '';

  sort:
    'asc' | 'desc' = 'desc';

  page = 1;

  limit = 25;

  report:
    DayBookReport | null = null;

  loading = false;

  errorMessage = '';


  readonly voucherTypes:
    VoucherTypeOption[] = [
      {
        label: 'All Voucher Types',
        value: ''
      },
      {
        label: 'Journal',
        value: 'journal'
      },
      {
        label: 'Payment',
        value: 'payment'
      },
      {
        label: 'Receipt',
        value: 'receipt'
      },
      {
        label: 'Contra',
        value: 'contra'
      },
      {
        label: 'Sales',
        value: 'sales'
      },
      {
        label: 'Purchase',
        value: 'purchase'
      },
      {
        label: 'Credit Note',
        value: 'credit_note'
      },
      {
        label: 'Debit Note',
        value: 'debit_note'
      }
    ];


  ngOnInit(): void {

    this.loadDayBook();

  }


  loadDayBook(): void {

    this.loading = true;
    this.errorMessage = '';

    const query:
      DayBookQuery = {

        from:
          this.from || undefined,

        to:
          this.to || undefined,

        voucherType:
          this.voucherType || undefined,

        sort:
          this.sort,

        page:
          this.page,

        limit:
          this.limit
      };


    this.dayBookService
      .getDayBook(query)
      .pipe(
        finalize(() => {

          this.loading = false;
          this.cdr.markForCheck();

        })
      )
      .subscribe({

        next: (report) => {

          this.report = report;

          if (!this.from) {
            this.from =
              this.toDateInputValue(
                report.period?.from
              );
          }

          if (!this.to) {
            this.to =
              this.toDateInputValue(
                report.period?.to
              );
          }

          this.cdr.markForCheck();

        },

        error: (error) => {

          this.report = null;

          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Unable to load Day Book.';

          this.cdr.markForCheck();

        }

      });

  }


  applyFilters(): void {

    this.page = 1;
    this.loadDayBook();

  }


  clearFilters(): void {

    this.from = '';
    this.to = '';
    this.voucherType = '';
    this.sort = 'desc';
    this.page = 1;

    this.loadDayBook();

  }


  previousPage(): void {

    if (this.page <= 1 || this.loading) {
      return;
    }

    this.page -= 1;
    this.loadDayBook();

  }


  nextPage(): void {

    if (
      this.loading ||
      this.page >= this.totalPages
    ) {
      return;
    }

    this.page += 1;
    this.loadDayBook();

  }


  get totalPages(): number {

    return Math.max(
      1,
      this.report?.pagination?.totalPages || 1
    );

  }


  get voucherCount(): number {

    return Number(
      this.report?.summary?.voucherCount || 0
    );

  }


  get totalDebit(): number {

    return Number(
      this.report?.summary?.totalDebit || 0
    );

  }


  get totalCredit(): number {

    return Number(
      this.report?.summary?.totalCredit || 0
    );

  }


  get rows(): DayBookRow[] {

    return this.report?.rows || [];

  }


  trackRow(
    index: number,
    row: DayBookRow
  ): string {

    return (
      row.journalEntryId ||
      row.voucherNumber ||
      row.journalNumber ||
      String(index)
    );

  }


  trackLine(
    index: number,
    line: {
      accountId?: string;
      accountCode?: string;
      accountName?: string;
    }
  ): string {

    return (
      line.accountId ||
      line.accountCode ||
      line.accountName ||
      String(index)
    );

  }


  formatVoucherType(
    row: DayBookRow
  ): string {

    const raw =
      row.displayType ||
      row.voucherType ||
      row.referenceType ||
      'Journal';

    return String(raw)
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );

  }


  private toDateInputValue(
    value?: string | null
  ): string {

    if (!value) {
      return '';
    }

    return value.slice(0, 10);

  }

}