import {
  Injectable,
  inject
} from '@angular/core';

import {
  Observable
} from 'rxjs';

import {
  ApiService
} from '../../../core/services/api.service';

import {
  AccountParty,
  AccountPartyQuery,
  CreateAccountPartyPayload,
  UpdateAccountPartyPayload
} from '../models/accounts.models';


@Injectable({
  providedIn: 'root'
})
export class AccountPartyService {

  private readonly api =
    inject(ApiService);

  private readonly customerPath =
    '/accounting/customers';

  private readonly vendorPath =
    '/accounting/vendors';


  /* =========================================================
     CUSTOMERS
  ========================================================= */

  getCustomers(
    query: AccountPartyQuery = {}
  ): Observable<AccountParty[]> {

    return this.api.get<AccountParty[]>(
      this.customerPath,
      {
        search:
          query.search?.trim() ||
          undefined,

        status:
          query.status
      }
    );
  }


  getCustomer(
    customerId: string
  ): Observable<AccountParty> {

    return this.api.get<AccountParty>(
      `${this.customerPath}/${this.encodeId(customerId)}`
    );
  }


  createCustomer(
    payload: CreateAccountPartyPayload
  ): Observable<AccountParty> {

    return this.api.post<AccountParty>(
      this.customerPath,
      this.normalizeCreatePayload(payload)
    );
  }


  updateCustomer(
    customerId: string,
    payload: UpdateAccountPartyPayload
  ): Observable<AccountParty> {

    return this.api.patch<AccountParty>(
      `${this.customerPath}/${this.encodeId(customerId)}`,
      this.normalizeUpdatePayload(payload)
    );
  }


  activateCustomer(
    customerId: string
  ): Observable<AccountParty> {

    return this.updateCustomer(
      customerId,
      {
        status: 'active'
      }
    );
  }


  deactivateCustomer(
    customerId: string
  ): Observable<AccountParty> {

    return this.updateCustomer(
      customerId,
      {
        status: 'inactive'
      }
    );
  }


  /* =========================================================
     VENDORS

     Shared service contract is prepared now because both
     masters use the same accounting party backend.
  ========================================================= */

  getVendors(
    query: AccountPartyQuery = {}
  ): Observable<AccountParty[]> {

    return this.api.get<AccountParty[]>(
      this.vendorPath,
      {
        search:
          query.search?.trim() ||
          undefined,

        status:
          query.status
      }
    );
  }


  getVendor(
    vendorId: string
  ): Observable<AccountParty> {

    return this.api.get<AccountParty>(
      `${this.vendorPath}/${this.encodeId(vendorId)}`
    );
  }


  createVendor(
    payload: CreateAccountPartyPayload
  ): Observable<AccountParty> {

    return this.api.post<AccountParty>(
      this.vendorPath,
      this.normalizeCreatePayload(payload)
    );
  }


  updateVendor(
    vendorId: string,
    payload: UpdateAccountPartyPayload
  ): Observable<AccountParty> {

    return this.api.patch<AccountParty>(
      `${this.vendorPath}/${this.encodeId(vendorId)}`,
      this.normalizeUpdatePayload(payload)
    );
  }


  activateVendor(
    vendorId: string
  ): Observable<AccountParty> {

    return this.updateVendor(
      vendorId,
      {
        status: 'active'
      }
    );
  }


  deactivateVendor(
    vendorId: string
  ): Observable<AccountParty> {

    return this.updateVendor(
      vendorId,
      {
        status: 'inactive'
      }
    );
  }


  /* =========================================================
     PAYLOAD NORMALIZATION
  ========================================================= */

  private normalizeCreatePayload(
    payload: CreateAccountPartyPayload
  ): CreateAccountPartyPayload {

    return {
      accountCode:
        payload.accountCode
          .trim()
          .toUpperCase(),

      accountName:
        payload.accountName
          .trim(),

      description:
        payload.description
          ?.trim() ||
        undefined,

      parentAccountId:
        payload.parentAccountId ||
        null,

      openingBalance:
        Number(
          payload.openingBalance ||
          0
        ),

      openingBalanceType:
        payload.openingBalanceType,

      status:
        payload.status ||
        'active'
    };
  }


  private normalizeUpdatePayload(
    payload: UpdateAccountPartyPayload
  ): UpdateAccountPartyPayload {

    const normalized:
      UpdateAccountPartyPayload = {};


    if (
      payload.accountName !==
      undefined
    ) {
      normalized.accountName =
        payload.accountName.trim();
    }


    if (
      payload.description !==
      undefined
    ) {
      normalized.description =
        payload.description.trim();
    }


    if (
      payload.parentAccountId !==
      undefined
    ) {
      normalized.parentAccountId =
        payload.parentAccountId ||
        null;
    }


    if (
      payload.status !==
      undefined
    ) {
      normalized.status =
        payload.status;
    }


    return normalized;
  }


  private encodeId(
    value: string
  ): string {

    return encodeURIComponent(
      value.trim()
    );
  }
}