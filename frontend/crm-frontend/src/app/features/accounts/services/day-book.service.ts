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
  DayBookQuery,
  DayBookReport
} from '../models/accounts.models';


@Injectable({
  providedIn: 'root'
})
export class DayBookService {

  private readonly api =
    inject(ApiService);


  getDayBook(
    query: DayBookQuery
  ): Observable<DayBookReport> {

    return this.api.get<DayBookReport>(
      '/accounting/day-book',
      {
        from: query.from,
        to: query.to,
        voucherType: query.voucherType,
        sort: query.sort,
        page: query.page,
        limit: query.limit
      }
    );

  }

}