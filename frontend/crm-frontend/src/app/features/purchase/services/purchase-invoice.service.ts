import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

import {
  GoodsReceipt,
  PurchaseApiListData,
  PurchaseInvoice,
  PurchaseInvoiceMetrics,
  PurchaseOrder
} from '../models/purchase.models';


@Injectable({
  providedIn: 'root'
})
export class PurchaseInvoiceService {

  private readonly baseUrl =
    '/purchase/invoices';


  constructor(
    private readonly api:
      ApiService
  ) {}


  /* ============================================================
     LIST
  ============================================================ */

  list(
    params:
      Record<string, string> =
      {}
  ):
    Observable<
      PurchaseApiListData<PurchaseInvoice>
    > {

    return this.api.get<
      PurchaseApiListData<PurchaseInvoice>
    >(
      this.baseUrl,
      params
    );
  }


  /* ============================================================
     REFERENCES
  ============================================================ */

  getReferences():
    Observable<{
      purchaseOrders:
        PurchaseOrder[];
    }> {

    return this.api.get<{
      purchaseOrders:
        PurchaseOrder[];
    }>(
      `${this.baseUrl}/references`
    );
  }


  /* ============================================================
     ELIGIBLE GRNs
  ============================================================ */

  getReceipts(
    purchaseOrderId:
      string
  ):
    Observable<GoodsReceipt[]> {

    return this.api.get<
      GoodsReceipt[]
    >(
      `${this.baseUrl}/purchase-orders/${purchaseOrderId}/goods-receipts`
    );
  }


  /* ============================================================
     CREATE
  ============================================================ */

  create(
    payload:
      unknown
  ):
    Observable<PurchaseInvoice> {

    return this.api.post<
      PurchaseInvoice
    >(
      this.baseUrl,
      payload
    );
  }


  /* ============================================================
     UPDATE / CORRECT
  ============================================================ */

  update(
    id:
      string,

    payload:
      unknown
  ):
    Observable<PurchaseInvoice> {

    return this.api.put<
      PurchaseInvoice
    >(
      `${this.baseUrl}/${id}`,
      payload
    );
  }


  /* ============================================================
     VERIFY
  ============================================================ */

  verify(
    id:
      string
  ):
    Observable<PurchaseInvoice> {

    return this.api.patch<
      PurchaseInvoice
    >(
      `${this.baseUrl}/${id}/verify`,
      {}
    );
  }


  /* ============================================================
     HANDOFF TO ACCOUNTS
  ============================================================ */

  handoff(
    id:
      string
  ):
    Observable<PurchaseInvoice> {

    return this.api.patch<
      PurchaseInvoice
    >(
      `${this.baseUrl}/${id}/handoff`,
      {}
    );
  }


  /* ============================================================
     METRICS
  ============================================================ */

  metrics():
    Observable<PurchaseInvoiceMetrics> {

    return this.api.get<
      PurchaseInvoiceMetrics
    >(
      `${this.baseUrl}/metrics`
    );
  }

}