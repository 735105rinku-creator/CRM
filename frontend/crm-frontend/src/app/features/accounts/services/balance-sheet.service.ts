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
  BalanceSheetReport
} from '../models/accounts.models';


export interface BalanceSheetQuery {
  asOf: string;
}


@Injectable({
  providedIn: 'root'
})
export class BalanceSheetService {

  private readonly api =
    inject(ApiService);

  private readonly endpoint =
    '/accounting/balance-sheet';


  getBalanceSheet(
    query: BalanceSheetQuery
  ): Observable<BalanceSheetReport> {

    return this.api.get<BalanceSheetReport>(
      this.endpoint,
      {
        asOf: query.asOf
      }
    );

  }

}