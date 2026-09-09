import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  ActivatedRoute
} from '@angular/router';

import {
  finalize
} from 'rxjs';

import {
  AccountParty
} from '../../models/accounts.models';

import {
  AccountPartyService
} from '../../services/account-party.service';

import {
  AccountLedgerEntry,
  AccountLedgerResponse,
  GeneralLedgerService
} from '../../services/general-ledger.service';


type PartyLedgerType =
  | 'customer'
  | 'vendor';


@Component({
  selector:
    'app-party-ledger',

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './party-ledger.component.html',

  styleUrl:
    './party-ledger.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class PartyLedgerComponent
  implements OnInit {

  private readonly route =
    inject(
      ActivatedRoute
    );


  private readonly accountPartyService =
    inject(
      AccountPartyService
    );


  private readonly generalLedgerService =
    inject(
      GeneralLedgerService
    );


  readonly partyType =
    signal<PartyLedgerType>(
      'customer'
    );


  readonly title =
    signal(
      'Customer Ledger'
    );


  readonly parties =
    signal<AccountParty[]>(
      []
    );


  readonly selectedPartyId =
    signal(
      ''
    );


  readonly fromDate =
    signal(
      ''
    );


  readonly toDate =
    signal(
      ''
    );


  readonly ledger =
    signal<AccountLedgerResponse | null>(
      null
    );


  readonly loadingParties =
    signal(
      false
    );


  readonly loadingLedger =
    signal(
      false
    );


  readonly errorMessage =
    signal(
      ''
    );


  ngOnInit(): void {

    this.readRouteMode();

    this.loadParties();

  }


  private readRouteMode(): void {

    const configuredType =
      String(
        this.route.snapshot.data[
          'partyType'
        ] ||
        ''
      )
        .trim()
        .toLowerCase();


    const type:
      PartyLedgerType =
      configuredType ===
        'vendor'
        ? 'vendor'
        : 'customer';


    this.partyType
      .set(
        type
      );


    this.title
      .set(
        type ===
          'vendor'
          ? 'Vendor Ledger'
          : 'Customer Ledger'
      );

  }


  loadParties(): void {

    if (
      this.loadingParties()
    ) {

      return;

    }


    this.loadingParties
      .set(
        true
      );


    this.errorMessage
      .set(
        ''
      );


    const request =
      this.partyType() ===
        'vendor'
        ? this.accountPartyService
            .getVendors()
        : this.accountPartyService
            .getCustomers();


    request
      .pipe(
        finalize(
          () =>
            this.loadingParties
              .set(
                false
              )
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.parties
              .set(
                Array.isArray(
                  response
                )
                  ? response
                  : []
              );

          },


        error:
          (
            error
          ) => {

            this.parties
              .set(
                []
              );


            this.errorMessage
              .set(
                this.resolveErrorMessage(
                  error,
                  `Unable to load ${
                    this.partyType() ===
                      'vendor'
                      ? 'vendors'
                      : 'customers'
                  }.`
                )
              );

          }

      });

  }


  onPartyChange(
    partyId:
      string
  ): void {

    this.selectedPartyId
      .set(
        String(
          partyId ||
          ''
        )
          .trim()
      );


    this.ledger
      .set(
        null
      );


    if (
      this.selectedPartyId()
    ) {

      this.loadLedger();

    }

  }


  onFromDateChange(
    value:
      string
  ): void {

    this.fromDate
      .set(
        String(
          value ||
          ''
        )
      );

  }


  onToDateChange(
    value:
      string
  ): void {

    this.toDate
      .set(
        String(
          value ||
          ''
        )
      );

  }


  applyDateFilter(): void {

    if (
      !this.selectedPartyId()
    ) {

      return;

    }



    this.loadLedger();

  }


  resetDates(): void {

    this.fromDate
      .set(
        ''
      );


    this.toDate
      .set(
        ''
      );


    if (
      this.selectedPartyId()
    ) {

      this.loadLedger();

    }

  }


  refresh(): void {

    if (
      this.selectedPartyId()
    ) {

      this.loadLedger();

      return;

    }


    this.loadParties();

  }


  loadLedger(): void {

    const accountId =
      this.selectedPartyId()
        .trim();


    if (
      !accountId ||
      this.loadingLedger()
    ) {

      return;

    }


    this.loadingLedger
      .set(
        true
      );


    this.errorMessage
      .set(
        ''
      );


    this.generalLedgerService
      .getAccountLedger(
        accountId,
        {
          from:
            this.fromDate(),

          to:
            this.toDate()
        }
      )
      .pipe(
        finalize(
          () =>
            this.loadingLedger
              .set(
                false
              )
        )
      )
      .subscribe({

        next:
          (
            response
          ) => {

            this.ledger
              .set(
                response ||
                null
              );

          },


        error:
          (
            error
          ) => {

            this.ledger
              .set(
                null
              );


            this.errorMessage
              .set(
                this.resolveErrorMessage(
                  error,
                  'Unable to load the selected ledger.'
                )
              );

          }

      });

  }


  selectedParty():
    AccountParty |
    undefined {

    const id =
      this.selectedPartyId();


    return this.parties()
      .find(
        (
          party
        ) =>
          String(
            party._id ||
            ''
          ) ===
          id
      );

  }


  partyLabel(
    party:
      AccountParty
  ): string {

    const code =
      String(
        party.accountCode ||
        ''
      )
        .trim();


    const name =
      String(
        party.accountName ||
        ''
      )
        .trim();


    if (
      code &&
      name
    ) {

      return `${code} - ${name}`;

    }


    return (
      name ||
      code ||
      'Unnamed Account'
    );

  }


  entryDate(
    entry:
      AccountLedgerEntry
  ): string {

    const value =
      entry.journalDate ||
      entry.transactionDate ||
      '';


    if (
      !value
    ) {

      return '-';

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


    return new Intl
      .DateTimeFormat(
        'en-IN',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric'
        }
      )
      .format(
        date
      );

  }


  entryReference(
    entry:
      AccountLedgerEntry
  ): string {

    return (
      entry.journalNumber ||
      entry.referenceNo ||
      '-'
    );

  }


  entryNarration(
    entry:
      AccountLedgerEntry
  ): string {

    return (
      entry.narration ||
      entry.description ||
      '-'
    );

  }


  formatMoney(
    value:
      number |
      null |
      undefined
  ): string {

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
            2
        }
      )
      .format(
        Number(
          value ||
          0
        )
      );

  }


  formatBalance(
    balance:
      {
        amount?: number;
        type?: string;
      } |
      null |
      undefined
  ): string {

    const amount =
      Number(
        balance?.amount ||
        0
      );


    const suffix =
      String(
        balance?.type ||
        ''
      )
        .toLowerCase() ===
        'credit'
        ? 'Cr'
        : 'Dr';


    return (
      `${this.formatMoney(
        amount
      )} ${suffix}`
    );

  }


  formatRunningBalance(
    entry:
      AccountLedgerEntry
  ): string {

    return this.formatBalance({
      amount:
        entry.runningBalance,

      type:
        entry.balanceType
    });

  }


  trackParty(
    index:
      number,
    party:
      AccountParty
  ): string {

    return String(
      party._id ||
      party.accountCode ||
      index
    );

  }


  trackEntry(
    index:
      number,
    entry:
      AccountLedgerEntry
  ): string {

    return String(
      entry._id ||
      entry.journalEntryId ||
      entry.journalNumber ||
      `${entry.transactionDate || entry.journalDate || ''}-${index}`
    );

  }


  private resolveErrorMessage(
    error:
      unknown,
    fallback:
      string
  ): string {

    const candidate =
      error as {
        error?: {
          message?: string;
        };

        message?: string;
      };


    const backendMessage =
      candidate
        ?.error
        ?.message;


    if (
      typeof backendMessage ===
        'string' &&
      backendMessage
        .trim()
    ) {

      return backendMessage
        .trim();

    }


    if (
      typeof candidate
        ?.message ===
        'string' &&
      candidate
        .message
        .trim()
    ) {

      return candidate
        .message
        .trim();

    }


    return fallback;

  }

}