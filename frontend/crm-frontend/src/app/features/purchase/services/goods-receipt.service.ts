import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

import {
  GoodsReceipt,
  GoodsReceiptFilters,
  GoodsReceiptPayload,
  GoodsReceiptStatusCounts,
  PurchaseApiListData,
  PurchaseOrderReceiptSummary
} from '../models/purchase.models';


@Injectable({
  providedIn: 'root'
})
export class GoodsReceiptService {

  private readonly baseUrl =
    '/purchase/goods-receipts';


  constructor(
    private readonly api:
      ApiService
  ) {}


  /* ============================================================
     LIST GOODS RECEIPTS
  ============================================================ */

  getAll(
    filters: GoodsReceiptFilters = {}
  ): Observable<PurchaseApiListData<GoodsReceipt>> {

    const params =
      this.buildQueryParams(
        filters
      );


    return this.api.get<
      PurchaseApiListData<GoodsReceipt>
    >(
      this.baseUrl,
      params
    );
  }


  /* ============================================================
     GET GOODS RECEIPT BY ID
  ============================================================ */

  getById(
    id: string
  ): Observable<GoodsReceipt> {

    return this.api.get<
      GoodsReceipt
    >(
      `${this.baseUrl}/${id}`
    );
  }


  /* ============================================================
     CREATE GOODS RECEIPT

     Junior:
     - backend creates pending_approval GRN.

     Senior:
     - backend creates immediately approved GRN.
  ============================================================ */

  create(
    payload: GoodsReceiptPayload
  ): Observable<GoodsReceipt> {

    return this.api.post<
      GoodsReceipt
    >(
      this.baseUrl,
      payload
    );
  }


  /* ============================================================
     APPROVE PENDING GRN
  ============================================================ */

  approve(
    id: string
  ): Observable<GoodsReceipt> {

    return this.api.patch<
      GoodsReceipt
    >(
      `${this.baseUrl}/${id}/approve`,
      {}
    );
  }


  /* ============================================================
     REJECT PENDING GRN
  ============================================================ */

  reject(
    id: string,
    reason: string
  ): Observable<GoodsReceipt> {

    return this.api.patch<
      GoodsReceipt
    >(
      `${this.baseUrl}/${id}/reject`,
      {
        reason
      }
    );
  }


  /* ============================================================
     STATUS COUNTS

     Supports:
     - Junior own counts automatically.
     - Senior scope=my.
     - Senior scope=team.
  ============================================================ */

  getStatusCounts(
    filters: GoodsReceiptFilters = {}
  ): Observable<GoodsReceiptStatusCounts> {

    const params =
      this.buildQueryParams(
        filters
      );


    return this.api.get<
      GoodsReceiptStatusCounts
    >(
      `${this.baseUrl}/status-counts`,
      params
    );
  }


  /* ============================================================
     PURCHASE ORDER GRN HISTORY

     Backend automatically applies:
     - Junior own history only.
     - Senior complete team history.
  ============================================================ */

  getByPurchaseOrder(
    purchaseOrderId: string
  ): Observable<GoodsReceipt[]> {

    return this.api.get<
      GoodsReceipt[]
    >(
      `${this.baseUrl}/purchase-order/${purchaseOrderId}`
    );
  }


  /* ============================================================
     PURCHASE ORDER RECEIPT SUMMARY

     Operational PO-level summary.
     Backend intentionally does not employee-scope this endpoint.
  ============================================================ */

  getPurchaseOrderReceiptSummary(
    purchaseOrderId: string
  ): Observable<PurchaseOrderReceiptSummary> {

    return this.api.get<
      PurchaseOrderReceiptSummary
    >(
      `${this.baseUrl}/purchase-order/${purchaseOrderId}/summary`
    );
  }


  /* ============================================================
     QUERY PARAMS
  ============================================================ */

  private buildQueryParams(
    filters: GoodsReceiptFilters
  ): Record<
    string,
    string
  > {

    const params:
      Record<
        string,
        string
      > = {};


    const search =
      String(
        filters.search ??
        ''
      )
        .trim();


    if (
      search
    ) {

      params['search'] =
        search;
    }


    if (
      filters.status
    ) {

      params['status'] =
        filters.status;
    }


    if (
      filters.approvalStatus
    ) {

      params['approvalStatus'] =
        filters.approvalStatus;
    }


    if (
      filters.scope
    ) {

      params['scope'] =
        filters.scope;
    }


    if (
      filters.vendorId
    ) {

      params['vendorId'] =
        filters.vendorId;
    }


    if (
      filters.warehouseId
    ) {

      params['warehouseId'] =
        filters.warehouseId;
    }


    if (
      filters.purchaseOrderId
    ) {

      params['purchaseOrderId'] =
        filters.purchaseOrderId;
    }


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
      filters.page
    ) {

      params['page'] =
        String(
          filters.page
        );
    }


    if (
      filters.limit
    ) {

      params['limit'] =
        String(
          filters.limit
        );
    }


    if (
      filters.sort
    ) {

      params['sort'] =
        filters.sort;
    }


    return params;
  }

}