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
  CashBankBookReport
} from '../models/accounts.models';


export interface CashBankBookQuery {
  from?: string;

  to?: string;

  accountId?: string;
}


@Injectable({
  providedIn: 'root'
})
export class CashBankBookService {

  private readonly api =
    inject(ApiService);

  private readonly endpoint =
    '/accounting/cash-bank-book';


  getCashBankBook(
    query: CashBankBookQuery = {}
  ): Observable<CashBankBookReport> {

    return this.api.get<CashBankBookReport>(
      this.endpoint,
      {
        from: query.from,
        to: query.to,
        accountId: query.accountId
      }
    );

  }

}