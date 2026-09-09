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
  GstReport
} from '../models/accounts.models';


export interface GstReportQuery {
  from?: string;

  to?: string;
}


@Injectable({
  providedIn: 'root'
})
export class GstReportService {
  private readonly api =
    inject(ApiService);

  private readonly endpoint =
    '/accounting/gst-report';

  getGstReport(
    query: GstReportQuery = {}
  ): Observable<GstReport> {
    return this.api.get<GstReport>(
      this.endpoint,
      {
        from: query.from,
        to: query.to
      }
    );
  }
}