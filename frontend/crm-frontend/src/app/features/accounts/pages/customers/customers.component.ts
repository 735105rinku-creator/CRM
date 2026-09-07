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
  AccountPartyService
} from '../../services/account-party.service';

import {
  AccountParty,
  AccountStatus,
  CreateAccountPartyPayload,
  DebitCredit,
  UpdateAccountPartyPayload
} from '../../models/accounts.models';


@Component({
  selector: 'app-customers',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class CustomersComponent {

  private readonly fb =
    inject(FormBuilder);

  private readonly accountPartyService =
    inject(AccountPartyService);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly customers =
    signal<AccountParty[]>([]);

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

  readonly selectedStatus =
    signal<AccountStatus | 'all'>('all');

  readonly formOpen =
    signal(false);

  readonly editingCustomer =
    signal<AccountParty | null>(null);


  readonly customerForm =
    this.fb.nonNullable.group({
      accountCode: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],

      accountName: [
        '',
        [
          Validators.required,
          Validators.maxLength(150)
        ]
      ],

      description: [''],

      openingBalance: [
        0,
        [
          Validators.min(0)
        ]
      ],

      openingBalanceType: [
        'debit' as DebitCredit,
        Validators.required
      ],

      status: [
        'active' as AccountStatus,
        Validators.required
      ]
    });


  readonly filteredCustomers =
    computed(() => {

      const search =
        this.searchText()
          .trim()
          .toLowerCase();

      const status =
        this.selectedStatus();

      return this.customers().filter(
        (customer) => {

          const matchesStatus =
            status === 'all' ||
            customer.status === status;

          const matchesSearch =
            !search ||
            customer.accountCode
              ?.toLowerCase()
              .includes(search) ||
            customer.accountName
              ?.toLowerCase()
              .includes(search) ||
            customer.description
              ?.toLowerCase()
              .includes(search);

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    });


  readonly totalCustomers =
    computed(
      () => this.customers().length
    );


  readonly activeCustomers =
    computed(
      () =>
        this.customers().filter(
          (customer) =>
            customer.status === 'active'
        ).length
    );


  readonly inactiveCustomers =
    computed(
      () =>
        this.customers().filter(
          (customer) =>
            customer.status === 'inactive'
        ).length
    );


  readonly totalReceivable =
    computed(
      () =>
        this.customers().reduce(
          (total, customer) =>
            total +
            Number(
              customer.currentBalance ??
              customer.openingBalance ??
              0
            ),
          0
        )
    );


  constructor() {
    this.loadCustomers();
  }


  loadCustomers(): void {

    this.loading.set(true);
    this.errorMessage.set('');

    this.accountPartyService
      .getCustomers()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        ),
        finalize(
          () => this.loading.set(false)
        )
      )
      .subscribe({
        next: (customers) => {
          this.customers.set(
            Array.isArray(customers)
              ? customers
              : []
          );
        },

        error: (error) => {
          this.errorMessage.set(
            this.getErrorMessage(
              error,
              'Unable to load customers.'
            )
          );
        }
      });
  }


  openCreateForm(): void {

    this.clearMessages();
    this.editingCustomer.set(null);

    this.customerForm.reset({
      accountCode: '',
      accountName: '',
      description: '',
      openingBalance: 0,
      openingBalanceType: 'debit',
      status: 'active'
    });

    this.customerForm.controls
      .accountCode.enable();

    this.customerForm.controls
      .openingBalance.enable();

    this.customerForm.controls
      .openingBalanceType.enable();

    this.formOpen.set(true);
  }


  openEditForm(
    customer: AccountParty
  ): void {

    this.clearMessages();
    this.editingCustomer.set(customer);

    this.customerForm.reset({
      accountCode:
        customer.accountCode || '',

      accountName:
        customer.accountName || '',

      description:
        customer.description || '',

      openingBalance:
        Number(
          customer.openingBalance || 0
        ),

      openingBalanceType:
        customer.openingBalanceType ||
        'debit',

      status:
        customer.status || 'active'
    });

    this.customerForm.controls
      .accountCode.disable();

    this.customerForm.controls
      .openingBalance.disable();

    this.customerForm.controls
      .openingBalanceType.disable();

    this.formOpen.set(true);
  }


  closeForm(): void {

    if (this.saving()) {
      return;
    }

    this.formOpen.set(false);
    this.editingCustomer.set(null);

    this.customerForm.controls
      .accountCode.enable();

    this.customerForm.controls
      .openingBalance.enable();

    this.customerForm.controls
      .openingBalanceType.enable();
  }


  saveCustomer(): void {

    if (
      this.customerForm.invalid ||
      this.saving()
    ) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.saving.set(true);

    const editing =
      this.editingCustomer();

    const raw =
      this.customerForm.getRawValue();

    if (
      editing &&
      editing._id
    ) {

      const payload:
        UpdateAccountPartyPayload = {

        accountName:
          raw.accountName,

        description:
          raw.description,

        status:
          raw.status
      };

      this.accountPartyService
        .updateCustomer(
          editing._id,
          payload
        )
        .pipe(
          takeUntilDestroyed(
            this.destroyRef
          ),
          finalize(
            () => this.saving.set(false)
          )
        )
        .subscribe({
          next: () => {
            this.successMessage.set(
              'Customer updated successfully.'
            );

            this.formOpen.set(false);
            this.editingCustomer.set(null);
            this.loadCustomers();
          },

          error: (error) => {
            this.errorMessage.set(
              this.getErrorMessage(
                error,
                'Unable to update customer.'
              )
            );
          }
        });

      return;
    }


    const payload:
      CreateAccountPartyPayload = {

      accountCode:
        raw.accountCode,

      accountName:
        raw.accountName,

      description:
        raw.description,

      openingBalance:
        Number(
          raw.openingBalance || 0
        ),

      openingBalanceType:
        raw.openingBalanceType,

      status:
        raw.status
    };


    this.accountPartyService
      .createCustomer(payload)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        ),
        finalize(
          () => this.saving.set(false)
        )
      )
      .subscribe({
        next: () => {
          this.successMessage.set(
            'Customer created successfully.'
          );

          this.formOpen.set(false);
          this.loadCustomers();
        },

        error: (error) => {
          this.errorMessage.set(
            this.getErrorMessage(
              error,
              'Unable to create customer.'
            )
          );
        }
      });
  }


  toggleStatus(
    customer: AccountParty
  ): void {

    if (
      !customer._id ||
      this.saving()
    ) {
      return;
    }

    this.clearMessages();
    this.saving.set(true);

    const nextStatus:
      AccountStatus =
      customer.status === 'active'
        ? 'inactive'
        : 'active';

    this.accountPartyService
      .updateCustomer(
        customer._id,
        {
          status: nextStatus
        }
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        ),
        finalize(
          () => this.saving.set(false)
        )
      )
      .subscribe({
        next: () => {
          this.successMessage.set(
            nextStatus === 'active'
              ? 'Customer activated successfully.'
              : 'Customer deactivated successfully.'
          );

          this.loadCustomers();
        },

        error: (error) => {
          this.errorMessage.set(
            this.getErrorMessage(
              error,
              'Unable to change customer status.'
            )
          );
        }
      });
  }


  onSearch(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    this.searchText.set(
      input.value
    );
  }


  onStatusFilter(
    event: Event
  ): void {

    const select =
      event.target as HTMLSelectElement;

    this.selectedStatus.set(
      select.value as
        AccountStatus | 'all'
    );
  }


  clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }


  trackCustomer(
    _index: number,
    customer: AccountParty
  ): string {

    return (
      customer._id ||
      customer.accountCode
    );
  }


  private getErrorMessage(
    error: unknown,
    fallback: string
  ): string {

    if (
      typeof error === 'object' &&
      error !== null
    ) {

      const candidate =
        error as {
          error?: {
            message?: string;
          };
          message?: string;
        };

      return (
        candidate.error?.message ||
        candidate.message ||
        fallback
      );
    }

    return fallback;
  }
}