import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
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
  AccountExpenseRecord,
  AccountExpenseService
} from '../../services/account-expense.service';


@Component({
  selector: 'app-expense-register',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './expense-register.component.html',

  styleUrl:
    './expense-register.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class ExpenseRegisterComponent
  implements OnInit {

  private readonly expenseService =
    inject(AccountExpenseService);


  readonly expenses =
    signal<AccountExpenseRecord[]>([]);

  readonly loading =
    signal(false);

  readonly errorMessage =
    signal('');

  readonly search =
    signal('');

  readonly status =
    signal('');

  readonly category =
    signal('');

  readonly fromDate =
    signal('');

  readonly toDate =
    signal('');


  readonly categories =
    computed(
      () => {

        const values =
          this.expenses()
            .map(
              (expense) =>
                String(
                  expense.category ||
                  ''
                ).trim()
            )
            .filter(Boolean);

        return Array.from(
          new Set(values)
        )
          .sort(
            (a, b) =>
              a.localeCompare(b)
          );
      }
    );


  readonly statuses =
    computed(
      () => {

        const values =
          this.expenses()
            .map(
              (expense) =>
                String(
                  expense.status ||
                  ''
                ).trim()
            )
            .filter(Boolean);

        return Array.from(
          new Set(values)
        )
          .sort(
            (a, b) =>
              a.localeCompare(b)
          );
      }
    );


  readonly filteredExpenses =
    computed(
      () => {

        const search =
          this.search()
            .trim()
            .toLowerCase();

        const status =
          this.status()
            .trim()
            .toLowerCase();

        const category =
          this.category()
            .trim()
            .toLowerCase();

        const fromDate =
          this.fromDate();

        const toDate =
          this.toDate();


        return this.expenses()
          .filter(
            (expense) => {

              const searchable =
                [
                  expense.title,
                  expense.category,
                  expense.expenseType,
                  expense.businessCategory,
                  expense.routeType,
                  expense.assignedEmployeeCode,
                  expense.status,
                  expense.notes
                ]
                  .join(' ')
                  .toLowerCase();


              if (
                search &&
                !searchable.includes(search)
              ) {
                return false;
              }


              if (
                status &&
                String(
                  expense.status ||
                  ''
                )
                  .trim()
                  .toLowerCase() !== status
              ) {
                return false;
              }


              if (
                category &&
                String(
                  expense.category ||
                  ''
                )
                  .trim()
                  .toLowerCase() !== category
              ) {
                return false;
              }


              const expenseDate =
                this.toDateKey(
                  expense.expenseDate
                );


              if (
                fromDate &&
                (
                  !expenseDate ||
                  expenseDate < fromDate
                )
              ) {
                return false;
              }


              if (
                toDate &&
                (
                  !expenseDate ||
                  expenseDate > toDate
                )
              ) {
                return false;
              }


              return true;
            }
          );
      }
    );


  readonly totalAmount =
    computed(
      () =>
        this.filteredExpenses()
          .reduce(
            (
              total,
              expense
            ) =>
              total +
              Number(
                expense.amount ||
                0
              ),
            0
          )
    );


  readonly pendingCount =
    computed(
      () =>
        this.filteredExpenses()
          .filter(
            (expense) =>
              this.normalizeStatus(
                expense.status
              ) === 'pending'
          )
          .length
    );


  readonly approvedCount =
    computed(
      () =>
        this.filteredExpenses()
          .filter(
            (expense) =>
              this.normalizeStatus(
                expense.status
              ) === 'approved'
          )
          .length
    );


  readonly otherCount =
    computed(
      () =>
        this.filteredExpenses()
          .filter(
            (expense) => {

              const value =
                this.normalizeStatus(
                  expense.status
                );

              return (
                value !== 'pending' &&
                value !== 'approved'
              );
            }
          )
          .length
    );


  ngOnInit():
    void {

    this.loadExpenses();
  }


  loadExpenses():
    void {

    this.loading.set(true);

    this.errorMessage.set('');


    this.expenseService
      .getExpenses()
      .pipe(
        finalize(
          () =>
            this.loading.set(false)
        )
      )
      .subscribe({
        next:
          (expenses) =>
            this.expenses.set(
              expenses
            ),

        error:
          (error) => {

            this.expenses.set([]);

            this.errorMessage.set(
              this.resolveErrorMessage(
                error
              )
            );
          }
      });
  }


  onSearchChange(
    value: string
  ):
    void {

    this.search.set(
      value
    );
  }


  onStatusChange(
    value: string
  ):
    void {

    this.status.set(
      value
    );
  }


  onCategoryChange(
    value: string
  ):
    void {

    this.category.set(
      value
    );
  }


  onFromDateChange(
    value: string
  ):
    void {

    this.fromDate.set(
      value
    );
  }


  onToDateChange(
    value: string
  ):
    void {

    this.toDate.set(
      value
    );
  }


  resetFilters():
    void {

    this.search.set('');

    this.status.set('');

    this.category.set('');

    this.fromDate.set('');

    this.toDate.set('');
  }


  formatMoney(
    value:
      number |
      null |
      undefined
  ):
    string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
      }
    )
      .format(
        Number(
          value ||
          0
        )
      );
  }


  formatDate(
    value:
      string |
      null |
      undefined
  ):
    string {

    if (
      !value
    ) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    )
      .format(date);
  }


  trackExpense(
    index: number,
    expense: AccountExpenseRecord
  ):
    string {

    return (
      expense._id ||
      String(index)
    );
  }


  private normalizeStatus(
    value:
      string |
      null |
      undefined
  ):
    string {

    return String(
      value ||
      ''
    )
      .trim()
      .toLowerCase();
  }


  private toDateKey(
    value:
      string |
      null |
      undefined
  ):
    string {

    if (
      !value
    ) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );

    const day =
      String(
        date.getDate()
      )
        .padStart(
          2,
          '0'
        );

    return `${year}-${month}-${day}`;
  }


  private resolveErrorMessage(
    error: unknown
  ):
    string {

    const candidate =
      error as {
        error?: {
          message?: string;
        };
        message?: string;
      };


    return (
      candidate?.error?.message ||
      candidate?.message ||
      'Unable to load operational expenses.'
    );
  }
}