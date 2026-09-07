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
  selector: 'app-vendors',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './vendors.component.html',
  styleUrl: './vendors.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class VendorsComponent {

  private readonly fb =
    inject(FormBuilder);

  private readonly accountPartyService =
    inject(AccountPartyService);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly vendors =
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

  readonly editingVendor =
    signal<AccountParty | null>(null);


  readonly vendorForm =
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


  readonly filteredVendors =
    computed(() => {

      const search =
        this.searchText()
          .trim()
          .toLowerCase();

      const status =
        this.selectedStatus();

      return this.vendors().filter(
        (vendor) => {

          const matchesStatus =
            status === 'all' ||
            vendor.status === status;

          const matchesSearch =
            !search ||
            vendor.accountCode
              ?.toLowerCase()
              .includes(search) ||
            vendor.accountName
              ?.toLowerCase()
              .includes(search) ||
            vendor.description
              ?.toLowerCase()
              .includes(search);

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    });


  readonly totalVendors =
    computed(
      () => this.vendors().length
    );


  readonly activeVendors =
    computed(
      () =>
        this.vendors().filter(
          (vendor) =>
            vendor.status === 'active'
        ).length
    );


  readonly inactiveVendors =
    computed(
      () =>
        this.vendors().filter(
          (vendor) =>
            vendor.status === 'inactive'
        ).length
    );


  readonly totalPayable =
    computed(
      () =>
        this.vendors().reduce(
          (total, vendor) =>
            total +
            Number(
              vendor.currentBalance ??
              vendor.openingBalance ??
              0
            ),
          0
        )
    );


  constructor() {
    this.loadVendors();
  }


  loadVendors(): void {

    this.loading.set(true);
    this.errorMessage.set('');

    this.accountPartyService
      .getVendors()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        ),
        finalize(
          () => this.loading.set(false)
        )
      )
      .subscribe({
        next: (vendors) => {
          this.vendors.set(
            Array.isArray(vendors)
              ? vendors
              : []
          );
        },

        error: (error) => {
          this.errorMessage.set(
            this.getErrorMessage(
              error,
              'Unable to load vendors.'
            )
          );
        }
      });
  }


  openCreateForm(): void {

    this.clearMessages();
    this.editingVendor.set(null);

    this.vendorForm.reset({
      accountCode: '',
      accountName: '',
      description: '',
      openingBalance: 0,
      openingBalanceType: 'debit',
      status: 'active'
    });

    this.vendorForm.controls
      .accountCode.enable();

    this.vendorForm.controls
      .openingBalance.enable();

    this.vendorForm.controls
      .openingBalanceType.enable();

    this.formOpen.set(true);
  }


  openEditForm(
    vendor: AccountParty
  ): void {

    this.clearMessages();
    this.editingVendor.set(vendor);

    this.vendorForm.reset({
      accountCode:
        vendor.accountCode || '',

      accountName:
        vendor.accountName || '',

      description:
        vendor.description || '',

      openingBalance:
        Number(
          vendor.openingBalance || 0
        ),

      openingBalanceType:
        vendor.openingBalanceType ||
        'debit',

      status:
        vendor.status || 'active'
    });

    this.vendorForm.controls
      .accountCode.disable();

    this.vendorForm.controls
      .openingBalance.disable();

    this.vendorForm.controls
      .openingBalanceType.disable();

    this.formOpen.set(true);
  }


  closeForm(): void {

    if (this.saving()) {
      return;
    }

    this.formOpen.set(false);
    this.editingVendor.set(null);

    this.vendorForm.controls
      .accountCode.enable();

    this.vendorForm.controls
      .openingBalance.enable();

    this.vendorForm.controls
      .openingBalanceType.enable();
  }


  saveVendor(): void {

    if (
      this.vendorForm.invalid ||
      this.saving()
    ) {
      this.vendorForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.saving.set(true);

    const editing =
      this.editingVendor();

    const raw =
      this.vendorForm.getRawValue();

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
        .updateVendor(
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
              'Vendor updated successfully.'
            );

            this.formOpen.set(false);
            this.editingVendor.set(null);
            this.loadVendors();
          },

          error: (error) => {
            this.errorMessage.set(
              this.getErrorMessage(
                error,
                'Unable to update vendor.'
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
      .createVendor(payload)
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
            'Vendor created successfully.'
          );

          this.formOpen.set(false);
          this.loadVendors();
        },

        error: (error) => {
          this.errorMessage.set(
            this.getErrorMessage(
              error,
              'Unable to create vendor.'
            )
          );
        }
      });
  }


  toggleStatus(
    vendor: AccountParty
  ): void {

    if (
      !vendor._id ||
      this.saving()
    ) {
      return;
    }

    this.clearMessages();
    this.saving.set(true);

    const nextStatus:
      AccountStatus =
      vendor.status === 'active'
        ? 'inactive'
        : 'active';

    this.accountPartyService
      .updateVendor(
        vendor._id,
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
              ? 'Vendor activated successfully.'
              : 'Vendor deactivated successfully.'
          );

          this.loadVendors();
        },

        error: (error) => {
          this.errorMessage.set(
            this.getErrorMessage(
              error,
              'Unable to change vendor status.'
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


  trackVendor(
    _index: number,
    vendor: AccountParty
  ): string {

    return (
      vendor._id ||
      vendor.accountCode
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