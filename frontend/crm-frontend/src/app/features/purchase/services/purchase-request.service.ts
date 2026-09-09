import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

import {
  PurchaseAccess,
  PurchaseApiListData,
  PurchaseRequest,
  PurchaseRequestFilters,
  PurchaseRequestPayload,
  PurchaseRequestStatus
} from '../models/purchase.models';


@Injectable({
  providedIn: 'root'
})
export class PurchaseRequestService {

  private readonly baseUrl =
    '/purchase/requests';


  private readonly accessUrl =
    '/purchase/access';


  constructor(
    private readonly api: ApiService
  ) {}


  /* ============================================================
     PURCHASE ACCESS
  ============================================================ */

  getPurchaseAccess():
    Observable<
      PurchaseAccess
    > {

    return this.api.get<
      PurchaseAccess
    >(
      this.accessUrl
    );
  }


  /* ============================================================
     LIST PURCHASE REQUESTS
  ============================================================ */

  getPurchaseRequests(
    filters: PurchaseRequestFilters = {}
  ): Observable<
    PurchaseApiListData<PurchaseRequest>
  > {

    return this.api.get<
      PurchaseApiListData<PurchaseRequest>
    >(
      this.baseUrl,
      this.buildQueryParams(filters)
    );
  }


  /* ============================================================
     GET SINGLE PURCHASE REQUEST
  ============================================================ */

  getPurchaseRequestById(
    id: string
  ): Observable<
    PurchaseRequest
  > {

    return this.api.get<
      PurchaseRequest
    >(
      `${this.baseUrl}/${id}`
    );
  }


  /* ============================================================
     CREATE PURCHASE REQUEST
  ============================================================ */

  createPurchaseRequest(
    payload: PurchaseRequestPayload
  ): Observable<
    PurchaseRequest
  > {

    return this.api.post<
      PurchaseRequest
    >(
      this.baseUrl,
      payload
    );
  }


  /* ============================================================
     UPDATE PURCHASE REQUEST
  ============================================================ */

  updatePurchaseRequest(
    id: string,
    payload: PurchaseRequestPayload
  ): Observable<
    PurchaseRequest
  > {

    return this.api.put<
      PurchaseRequest
    >(
      `${this.baseUrl}/${id}`,
      payload
    );
  }


  /* ============================================================
     UPDATE STATUS
  ============================================================ */

  updatePurchaseRequestStatus(
    id: string,
    status: PurchaseRequestStatus,
    remarks?: string
  ): Observable<
    PurchaseRequest
  > {

    return this.api.patch<
      PurchaseRequest
    >(
      `${this.baseUrl}/${id}/status`,
      {
        status,
        remarks
      }
    );
  }


  /* ============================================================
     SUBMIT FOR APPROVAL
  ============================================================ */

  submitForApproval(
    id: string,
    remarks?: string
  ): Observable<
    PurchaseRequest
  > {

    return this.api.patch<
      PurchaseRequest
    >(
      `${this.baseUrl}/${id}/submit`,
      {
        remarks
      }
    );
  }


  /* ============================================================
     APPROVE PURCHASE REQUEST
  ============================================================ */

  approvePurchaseRequest(
    id: string,
    remarks?: string
  ): Observable<
    PurchaseRequest
  > {

    return this.api.patch<
      PurchaseRequest
    >(
      `${this.baseUrl}/${id}/approve`,
      {
        remarks
      }
    );
  }


  /* ============================================================
     REJECT PURCHASE REQUEST
  ============================================================ */

  rejectPurchaseRequest(
    id: string,
    rejectionReason: string
  ): Observable<
    PurchaseRequest
  > {

    return this.api.patch<
      PurchaseRequest
    >(
      `${this.baseUrl}/${id}/reject`,
      {
        rejectionReason
      }
    );
  }


  /* ============================================================
     QUERY PARAMS
  ============================================================ */

  private buildQueryParams(
    filters: PurchaseRequestFilters
  ): Record<
    string,
    string | number
  > {

    const params:
      Record<
        string,
        string | number
      > = {};


    if (
      filters.search?.trim()
    ) {

      params['search'] =
        filters.search.trim();
    }


    if (
      filters.status
    ) {

      params['status'] =
        filters.status;
    }


    if (
      filters.priority
    ) {

      params['priority'] =
        filters.priority;
    }


    if (
      filters.requestedBy
    ) {

      params['requestedBy'] =
        filters.requestedBy;
    }


    if (
      filters.departmentId
    ) {

      params['departmentId'] =
        filters.departmentId;
    }


    /*
     * Backend Purchase Request validator expects:
     *
     *   from
     *   to
     *
     * Frontend model can continue using:
     *
     *   fromDate
     *   toDate
     */

    if (
      filters.fromDate
    ) {

      params['from'] =
        filters.fromDate;
    }


    if (
      filters.toDate
    ) {

      params['to'] =
        filters.toDate;
    }


    if (
      typeof filters.page ===
        'number'
    ) {

      params['page'] =
        filters.page;
    }


    if (
      typeof filters.limit ===
        'number'
    ) {

      params['limit'] =
        filters.limit;
    }


    return params;
  }
}
