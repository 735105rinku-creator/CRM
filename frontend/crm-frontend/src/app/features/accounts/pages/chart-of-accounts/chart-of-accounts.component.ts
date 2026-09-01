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
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  ChartOfAccountsService
} from '../../services/chart-of-accounts.service';

import {
  AccountNature,
  AccountStatus,
  AccountType,
  ChartOfAccount,
  CreateChartOfAccountPayload,
  DebitCredit,
  UpdateChartOfAccountPayload
} from '../../models/accounts.models';


interface NatureOption {
  value: AccountNature;
  label: string;
  description: string;
  normalBalance: DebitCredit;
}


interface AccountTypeOption {
  value: AccountType;
  label: string;
  nature: AccountNature;
}


@Component({
  selector:
    'app-chart-of-accounts',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl:
    './chart-of-accounts.component.html',

  styleUrl:
    './chart-of-accounts.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class ChartOfAccountsComponent {

  /* =========================================================
     DEPENDENCIES
  ========================================================= */

  private readonly fb =
    inject(FormBuilder);

  private readonly chartOfAccountsService =
    inject(ChartOfAccountsService);

  private readonly destroyRef =
    inject(DestroyRef);


  /* =========================================================
     STATE
  ========================================================= */

  readonly accounts =
    signal<ChartOfAccount[]>([]);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

  readonly errorMessage =
    signal('');

  readonly successMessage =
    signal('');

  readonly searchText =
    signal('');

  readonly selectedNature =
    signal<AccountNature | 'all'>(
      'all'
    );

  readonly selectedStatus =
    signal<AccountStatus | 'all'>(
      'all'
    );

  readonly formOpen =
    signal(false);

  readonly editingAccount =
    signal<ChartOfAccount | null>(
      null
    );


  /* =========================================================
     ACCOUNT NATURE OPTIONS
  ========================================================= */

  readonly natureOptions:
    NatureOption[] = [

    {
      value:
        'asset',

      label:
        'Assets',

      description:
        'Resources owned by the business.',

      normalBalance:
        'debit'
    },

    {
      value:
        'liability',

      label:
        'Liabilities',

      description:
        'Amounts payable and obligations.',

      normalBalance:
        'credit'
    },

    {
      value:
        'equity',

      label:
        'Equity',

      description:
        'Capital and ownership balances.',

      normalBalance:
        'credit'
    },

    {
      value:
        'income',

      label:
        'Income',

      description:
        'Revenue and other business income.',

      normalBalance:
        'credit'
    },

    {
      value:
        'expense',

      label:
        'Expenses',

      description:
        'Operating and business expenses.',

      normalBalance:
        'debit'
    }

  ];


  /* =========================================================
     ACCOUNT TYPE OPTIONS
  ========================================================= */

  readonly accountTypeOptions:
    AccountTypeOption[] = [

    /* ---------------- ASSETS ---------------- */

    {
      value:
        'cash',

      label:
        'Cash',

      nature:
        'asset'
    },

    {
      value:
        'bank',

      label:
        'Bank',

      nature:
        'asset'
    },

    {
      value:
        'accounts_receivable',

      label:
        'Accounts Receivable',

      nature:
        'asset'
    },

    {
      value:
        'current_asset',

      label:
        'Current Asset',

      nature:
        'asset'
    },

    {
      value:
        'fixed_asset',

      label:
        'Fixed Asset',

      nature:
        'asset'
    },


    /* ---------------- LIABILITIES ---------------- */

    {
      value:
        'accounts_payable',

      label:
        'Accounts Payable',

      nature:
        'liability'
    },

    {
      value:
        'current_liability',

      label:
        'Current Liability',

      nature:
        'liability'
    },

    {
      value:
        'long_term_liability',

      label:
        'Long-Term Liability',

      nature:
        'liability'
    },

    {
      value:
        'tax',

      label:
        'Tax Liability',

      nature:
        'liability'
    },


    /* ---------------- EQUITY ---------------- */

    {
      value:
        'capital',

      label:
        'Capital / Equity',

      nature:
        'equity'
    },


    /* ---------------- INCOME ---------------- */

    {
      value:
        'sales',

      label:
        'Sales',

      nature:
        'income'
    },

    {
      value:
        'direct_income',

      label:
        'Direct Income',

      nature:
        'income'
    },

    {
      value:
        'indirect_income',

      label:
        'Indirect Income',

      nature:
        'income'
    },


    /* ---------------- EXPENSES ---------------- */

    {
      value:
        'purchase',

      label:
        'Purchase',

      nature:
        'expense'
    },

    {
      value:
        'direct_expense',

      label:
        'Direct Expense',

      nature:
        'expense'
    },

    {
      value:
        'indirect_expense',

      label:
        'Indirect Expense',

      nature:
        'expense'
    },

    {
      value:
        'other',

      label:
        'Other',

      nature:
        'expense'
    }

  ];


  /* =========================================================
     FORM
  ========================================================= */

  readonly accountForm =
    this.fb.nonNullable.group({

      accountCode: [
        '',
        [
          Validators.required,
          Validators.maxLength(
            30
          )
        ]
      ],

      accountName: [
        '',
        [
          Validators.required,
          Validators.maxLength(
            120
          )
        ]
      ],

      description: [
        '',
        [
          Validators.maxLength(
            500
          )
        ]
      ],

      nature: [
        'asset' as AccountNature,
        [
          Validators.required
        ]
      ],

      accountType: [
        'current_asset' as AccountType,
        [
          Validators.required
        ]
      ],

      parentAccountId: [
        ''
      ],

      openingBalance: [
        0,
        [
          Validators.min(
            0
          )
        ]
      ],

      openingBalanceType: [
        'debit' as DebitCredit,
        [
          Validators.required
        ]
      ],

      status: [
        'active' as AccountStatus,
        [
          Validators.required
        ]
      ]

    });


  /* =========================================================
     FILTERED ACCOUNT TYPE OPTIONS
  ========================================================= */

  readonly availableAccountTypes =
    signal<AccountTypeOption[]>(
      this.accountTypeOptions.filter(
        option =>
          option.nature ===
          'asset'
      )
    );


  /* =========================================================
     FILTERED ACCOUNTS
  ========================================================= */

  readonly filteredAccounts =
    computed(
      () => {

        const search =
          this.searchText()
            .trim()
            .toLowerCase();

        const nature =
          this.selectedNature();

        const status =
          this.selectedStatus();


        return this.accounts().filter(
          account => {

            const matchesSearch =
              !search ||
              account.accountCode
                .toLowerCase()
                .includes(
                  search
                ) ||
              account.accountName
                .toLowerCase()
                .includes(
                  search
                ) ||
              (
                account.description ??
                ''
              )
                .toLowerCase()
                .includes(
                  search
                );


            const matchesNature =
              nature ===
                'all' ||
              account.nature ===
                nature;


            const matchesStatus =
              status ===
                'all' ||
              account.status ===
                status;


            return (
              matchesSearch &&
              matchesNature &&
              matchesStatus
            );

          }
        );

      }
    );


  /* =========================================================
     PARENT ACCOUNT OPTIONS
  ========================================================= */

  readonly selectedFormNature =
    signal<AccountNature>(
      'asset'
    );


  readonly parentAccountOptions =
    computed(
      () => {

        const editingId =
          this.editingAccount()?._id;

        const nature =
          this.selectedFormNature();

        return this.accounts()
          .filter(
            account =>
              account.status ===
                'active' &&
              account.nature ===
                nature &&
              account._id !==
                editingId
          )
          .sort(
            (
              first,
              second
            ) =>
              first.accountCode.localeCompare(
                second.accountCode
              )
          );

      }
    );


  /* =========================================================
     SUMMARY COUNTS
  ========================================================= */

  readonly totalAccounts =
    computed(
      () =>
        this.accounts().length
    );


  readonly activeAccounts =
    computed(
      () =>
        this.accounts().filter(
          account =>
            account.status ===
              'active'
        ).length
    );


  readonly assetAccounts =
    computed(
      () =>
        this.accounts().filter(
          account =>
            account.nature ===
              'asset'
        ).length
    );


  readonly liabilityAccounts =
    computed(
      () =>
        this.accounts().filter(
          account =>
            account.nature ===
              'liability'
        ).length
    );


  readonly incomeAccounts =
    computed(
      () =>
        this.accounts().filter(
          account =>
            account.nature ===
              'income'
        ).length
    );


  readonly expenseAccounts =
    computed(
      () =>
        this.accounts().filter(
          account =>
            account.nature ===
              'expense'
        ).length
    );


  /* =========================================================
     CONSTRUCTOR
  ========================================================= */

  constructor() {

    this.accountForm.controls.nature
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(
        nature => {

          this.selectedFormNature.set(
            nature
          );

          this.updateAvailableAccountTypes(
            nature
          );

          if (
            !this.editingAccount()
          ) {

            this.setDefaultBalanceType(
              nature
            );

          }

        }
      );


    this.loadAccounts();

  }


  /* =========================================================
     LOAD ACCOUNTS
  ========================================================= */

  loadAccounts(): void {

    this.loading.set(
      true
    );

    this.errorMessage.set(
      ''
    );


    this.chartOfAccountsService
      .getAccounts()
      .pipe(
        finalize(
          () =>
            this.loading.set(
              false
            )
        ),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          accounts => {

            this.accounts.set(
              accounts ??
              []
            );

          },

        error:
          error => {

            console.error(
              'Failed to load Chart of Accounts',
              error
            );

            this.accounts.set(
              []
            );

            this.errorMessage.set(
              error?.error?.message ??
              'Unable to load Chart of Accounts.'
            );

          }

      });

  }


  /* =========================================================
     SEARCH
  ========================================================= */

  onSearch(
    event: Event
  ): void {

    const target =
      event.target as HTMLInputElement;

    this.searchText.set(
      target.value
    );

  }


  /* =========================================================
     NATURE FILTER
  ========================================================= */

  onNatureFilter(
    event: Event
  ): void {

    const target =
      event.target as HTMLSelectElement;

    this.selectedNature.set(
      target.value as
        AccountNature |
        'all'
    );

  }


  /* =========================================================
     STATUS FILTER
  ========================================================= */

  onStatusFilter(
    event: Event
  ): void {

    const target =
      event.target as HTMLSelectElement;

    this.selectedStatus.set(
      target.value as
        AccountStatus |
        'all'
    );

  }


  /* =========================================================
     RESET FILTERS
  ========================================================= */

  resetFilters(): void {

    this.searchText.set(
      ''
    );

    this.selectedNature.set(
      'all'
    );

    this.selectedStatus.set(
      'all'
    );

  }


  /* =========================================================
     OPEN CREATE FORM
  ========================================================= */

  openCreateForm(): void {

    this.editingAccount.set(
      null
    );

    this.successMessage.set(
      ''
    );

    this.errorMessage.set(
      ''
    );


    this.accountForm.reset({

      accountCode:
        '',

      accountName:
        '',

      description:
        '',

      nature:
        'asset',

      accountType:
        'current_asset',

      parentAccountId:
        '',

      openingBalance:
        0,

      openingBalanceType:
        'debit',

      status:
        'active'

    });


    this.accountForm.controls
      .accountCode.enable();

    this.accountForm.controls
      .nature.enable();

    this.accountForm.controls
      .openingBalance.enable();

    this.accountForm.controls
      .openingBalanceType.enable();


    this.selectedFormNature.set(
      'asset'
    );


    this.updateAvailableAccountTypes(
      'asset'
    );


    this.formOpen.set(
      true
    );

  }


  /* =========================================================
     OPEN EDIT FORM
  ========================================================= */

  openEditForm(
    account: ChartOfAccount
  ): void {

    this.editingAccount.set(
      account
    );

    this.successMessage.set(
      ''
    );

    this.errorMessage.set(
      ''
    );


    this.selectedFormNature.set(
      account.nature
    );


    this.updateAvailableAccountTypes(
      account.nature
    );


    this.accountForm.reset({

      accountCode:
        account.accountCode,

      accountName:
        account.accountName,

      description:
        account.description ??
        '',

      nature:
        account.nature,

      accountType:
        account.accountType,

      parentAccountId:
        account.parentAccountId ??
        '',

      openingBalance:
        account.openingBalance ??
        0,

      openingBalanceType:
        account.openingBalanceType ??
        this.getNormalBalanceType(
          account.nature
        ),

      status:
        account.status

    });


    /*
     * Existing financial account code, nature and opening
     * balance should not be casually changed after creation.
     */

    this.accountForm.controls
      .accountCode.disable();

    this.accountForm.controls
      .nature.disable();

    this.accountForm.controls
      .openingBalance.disable();

    this.accountForm.controls
      .openingBalanceType.disable();


    this.formOpen.set(
      true
    );

  }


  /* =========================================================
     CLOSE FORM
  ========================================================= */

  closeForm(): void {

    if (
      this.saving()
    ) {
      return;
    }


    this.formOpen.set(
      false
    );

    this.editingAccount.set(
      null
    );

  }


  /* =========================================================
     SAVE ACCOUNT
  ========================================================= */

  saveAccount(): void {

    if (
      this.accountForm.invalid
    ) {

      this.accountForm.markAllAsTouched();

      return;

    }


    const editing =
      this.editingAccount();


    if (
      editing
    ) {

      this.updateAccount(
        editing
      );

      return;

    }


    this.createAccount();

  }


  /* =========================================================
     CREATE ACCOUNT
  ========================================================= */

  private createAccount(): void {

    const rawValue =
      this.accountForm.getRawValue();


    const payload:
      CreateChartOfAccountPayload = {

      accountCode:
        rawValue.accountCode,

      accountName:
        rawValue.accountName,

      description:
        rawValue.description,

      nature:
        rawValue.nature,

      accountType:
        rawValue.accountType,

      parentAccountId:
        rawValue.parentAccountId ||
        null,

      openingBalance:
        Number(
          rawValue.openingBalance ||
          0
        ),

      openingBalanceType:
        rawValue.openingBalanceType,

      status:
        rawValue.status

    };


    this.saving.set(
      true
    );

    this.errorMessage.set(
      ''
    );

    this.successMessage.set(
      ''
    );


    this.chartOfAccountsService
      .createAccount(
        payload
      )
      .pipe(
        finalize(
          () =>
            this.saving.set(
              false
            )
        ),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          created => {

            if (
              created
            ) {

              this.accounts.update(
                accounts => [
                  ...accounts,
                  created
                ]
              );

            }


            this.successMessage.set(
              'Account created successfully.'
            );


            this.formOpen.set(
              false
            );

          },

        error:
          error => {

            console.error(
              'Failed to create account',
              error
            );

            this.errorMessage.set(
              error?.error?.message ??
              'Unable to create account.'
            );

          }

      });

  }


  /* =========================================================
     UPDATE ACCOUNT
  ========================================================= */

  private updateAccount(
    account: ChartOfAccount
  ): void {

    if (
      !account._id
    ) {

      this.errorMessage.set(
        'Account ID is missing.'
      );

      return;

    }


    const rawValue =
      this.accountForm.getRawValue();


    const payload:
      UpdateChartOfAccountPayload = {

      accountName:
        rawValue.accountName,

      description:
        rawValue.description,

      accountType:
        rawValue.accountType,

      parentAccountId:
        rawValue.parentAccountId ||
        null,

      status:
        rawValue.status

    };


    this.saving.set(
      true
    );

    this.errorMessage.set(
      ''
    );

    this.successMessage.set(
      ''
    );


    this.chartOfAccountsService
      .updateAccount(
        account._id,
        payload
      )
      .pipe(
        finalize(
          () =>
            this.saving.set(
              false
            )
        ),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          updated => {

            if (
              updated
            ) {

              this.accounts.update(
                accounts =>
                  accounts.map(
                    item =>
                      item._id ===
                      updated._id
                        ? updated
                        : item
                  )
              );

            }


            this.successMessage.set(
              'Account updated successfully.'
            );


            this.formOpen.set(
              false
            );

            this.editingAccount.set(
              null
            );

          },

        error:
          error => {

            console.error(
              'Failed to update account',
              error
            );

            this.errorMessage.set(
              error?.error?.message ??
              'Unable to update account.'
            );

          }

      });

  }


  /* =========================================================
     TOGGLE ACCOUNT STATUS
  ========================================================= */

  toggleStatus(
    account: ChartOfAccount
  ): void {

    if (
      !account._id ||
      account.isSystemAccount
    ) {
      return;
    }


    const request =
      account.status ===
        'active'
        ? this.chartOfAccountsService
            .deactivateAccount(
              account._id
            )
        : this.chartOfAccountsService
            .activateAccount(
              account._id
            );


    this.loading.set(
      true
    );

    this.errorMessage.set(
      ''
    );

    this.successMessage.set(
      ''
    );


    request
      .pipe(
        finalize(
          () =>
            this.loading.set(
              false
            )
        ),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next:
          updated => {

            if (
              updated
            ) {

              this.accounts.update(
                accounts =>
                  accounts.map(
                    item =>
                      item._id ===
                      updated._id
                        ? updated
                        : item
                  )
              );

            }


            this.successMessage.set(
              account.status ===
                'active'
                ? 'Account deactivated successfully.'
                : 'Account activated successfully.'
            );

          },

        error:
          error => {

            console.error(
              'Failed to update account status',
              error
            );

            this.errorMessage.set(
              error?.error?.message ??
              'Unable to update account status.'
            );

          }

      });

  }


  /* =========================================================
     UPDATE ACCOUNT TYPE OPTIONS
  ========================================================= */

  private updateAvailableAccountTypes(
    nature: AccountNature
  ): void {

    const options =
      this.accountTypeOptions.filter(
        option =>
          option.nature ===
          nature
      );


    this.availableAccountTypes.set(
      options
    );


    const currentType =
      this.accountForm.controls
        .accountType.value;


    const stillValid =
      options.some(
        option =>
          option.value ===
          currentType
      );


    if (
      !stillValid &&
      options.length
    ) {

      this.accountForm.controls
        .accountType.setValue(
          options[0].value,
          {
            emitEvent:
              false
          }
        );

    }

  }


  /* =========================================================
     DEFAULT BALANCE TYPE
  ========================================================= */

  private setDefaultBalanceType(
    nature: AccountNature
  ): void {

    this.accountForm.controls
      .openingBalanceType
      .setValue(
        this.getNormalBalanceType(
          nature
        ),
        {
          emitEvent:
            false
        }
      );

  }


  /* =========================================================
     NORMAL BALANCE TYPE
  ========================================================= */

  getNormalBalanceType(
    nature: AccountNature
  ): DebitCredit {

    switch (
      nature
    ) {

      case 'asset':
      case 'expense':
        return 'debit';

      case 'liability':
      case 'equity':
      case 'income':
        return 'credit';

      default:
        return 'debit';

    }

  }


  /* =========================================================
     NATURE LABEL
  ========================================================= */

  getNatureLabel(
    nature: AccountNature
  ): string {

    return (
      this.natureOptions.find(
        option =>
          option.value ===
          nature
      )?.label ??
      nature
    );

  }


  /* =========================================================
     ACCOUNT TYPE LABEL
  ========================================================= */

  getAccountTypeLabel(
    accountType: AccountType
  ): string {

    return (
      this.accountTypeOptions.find(
        option =>
          option.value ===
          accountType
      )?.label ??
      accountType
    );

  }


  /* =========================================================
     PARENT ACCOUNT NAME
  ========================================================= */

  getParentAccountName(
    account: ChartOfAccount
  ): string {

    if (
      account.parentAccountName
    ) {

      return account.parentAccountName;

    }


    if (
      !account.parentAccountId
    ) {

      return 'Primary Account';

    }


    const parent =
      this.accounts().find(
        item =>
          item._id ===
          account.parentAccountId
      );


    return (
      parent?.accountName ??
      'Parent Account'
    );

  }


  /* =========================================================
     FORMAT BALANCE
  ========================================================= */

  formatBalance(
    value:
      number |
      undefined |
      null
  ): string {

    return new Intl.NumberFormat(
      'en-IN',
      {
        style:
          'currency',

        currency:
          'INR',

        maximumFractionDigits:
          2
      }
    ).format(
      Number(
        value ??
        0
      )
    );

  }


  /* =========================================================
     CLEAR MESSAGE
  ========================================================= */

  clearMessages(): void {

    this.errorMessage.set(
      ''
    );

    this.successMessage.set(
      ''
    );

  }


  /* =========================================================
     TRACK ACCOUNT
  ========================================================= */

  trackAccount(
    index: number,
    account: ChartOfAccount
  ): string {

    return (
      account._id ??
      account.accountCode
    );

  }


  /* =========================================================
     TRACK NATURE
  ========================================================= */

  trackNature(
    index: number,
    nature: NatureOption
  ): string {

    return nature.value;

  }


  /* =========================================================
     TRACK ACCOUNT TYPE
  ========================================================= */

  trackAccountType(
    index: number,
    option: AccountTypeOption
  ): string {

    return option.value;

  }

}