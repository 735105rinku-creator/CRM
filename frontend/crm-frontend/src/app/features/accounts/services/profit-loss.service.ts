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
  ProfitLossReport
} from '../models/accounts.models';


export interface ProfitLossQuery {
  from?: string;
  to?: string;
}


@Injectable({
  providedIn: 'root'
})
export class ProfitLossService {

  private readonly api =
    inject(ApiService);

  private readonly endpoint =
    '/accounting/profit-and-loss';


  getProfitLoss(
    query: ProfitLossQuery = {}
  ): Observable<ProfitLossReport> {

    return this.api.get<ProfitLossReport>(
      this.endpoint,
      {
        from: query.from,
        to: query.to
      }
    );

  }

}