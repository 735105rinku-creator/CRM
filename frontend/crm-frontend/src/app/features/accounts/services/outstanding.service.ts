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
  OutstandingReport
} from '../models/accounts.models';


export type OutstandingType =
  | 'receivable'
  | 'payable';


export interface OutstandingQuery {
  asOf?: string;
  type?: OutstandingType;
  accountId?: string;
}


@Injectable({
  providedIn: 'root'
})
export class OutstandingService {

  private readonly api =
    inject(ApiService);

  private readonly endpoint =
    '/accounting/outstanding';


  getOutstanding(
    query: OutstandingQuery = {}
  ): Observable<OutstandingReport> {

    return this.api.get<OutstandingReport>(
      this.endpoint,
      {
        asOf: query.asOf,
        type: query.type,
        accountId: query.accountId
      }
    );

  }

}