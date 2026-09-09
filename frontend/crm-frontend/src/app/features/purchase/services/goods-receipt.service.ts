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
     STATUS COUNTS
  ============================================================ */

  getStatusCounts():
    Observable<GoodsReceiptStatusCounts> {

    return this.api.get<
      GoodsReceiptStatusCounts
    >(
      `${this.baseUrl}/status-counts`
    );
  }


  /* ============================================================
     PURCHASE ORDER GRN HISTORY
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