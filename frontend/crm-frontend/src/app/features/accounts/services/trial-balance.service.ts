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
  TrialBalance
} from '../models/accounts.models';


export interface TrialBalanceQuery {
  from?: string;
  to?: string;
}


@Injectable({
  providedIn: 'root'
})
export class TrialBalanceService {

  private readonly api =
    inject(ApiService);

  private readonly endpoint =
    '/accounting/trial-balance';


  getTrialBalance(
    query: TrialBalanceQuery = {}
  ): Observable<TrialBalance> {

    return this.api.get<TrialBalance>(
      this.endpoint,
      {
        from: query.from,
        to: query.to
      }
    );

  }

}