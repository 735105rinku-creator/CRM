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
    PurchaseApiListData,
    PurchaseOrder,
    PurchaseOrderFilters,
    PurchaseOrderPayload
  } from '../models/purchase.models';
  
  
  export interface PurchaseOrderStatusCounts {
    draft: number;
  
    approved: number;
  
    sent: number;
  
    partially_received: number;
  
    received: number;
  
    cancelled: number;
  }
  
  
  export interface PurchaseOrderDeliverySummary {
    pendingDeliveries: number;
  
    overdueDeliveries: number;
  }
  
  
  @Injectable({
    providedIn: 'root'
  })
  export class PurchaseOrderService {
  
    private readonly api =
      inject(
        ApiService
      );
  
  
    private readonly baseUrl =
      '/purchase/purchase-orders';
  
  
    /* ============================================================
       LIST
    ============================================================ */
  
    getPurchaseOrders(
      filters:
        PurchaseOrderFilters =
        {}
    ): Observable<
      PurchaseApiListData<PurchaseOrder>
    > {
  
      return this.api.get<
        PurchaseApiListData<PurchaseOrder>
      >(
        this.baseUrl,
        {
          search:
            filters.search?.trim() ||
            undefined,
  
          status:
            filters.status ||
            undefined,
  
          vendorId:
            filters.vendorId ||
            undefined,
  
          purchaseRequestId:
            filters.purchaseRequestId ||
            undefined,
  
          quotationId:
            filters.quotationId ||
            undefined,
  
          warehouseId:
            filters.warehouseId ||
            undefined,
  
          from:
            filters.fromDate ||
            undefined,
  
          to:
            filters.toDate ||
            undefined,
  
          page:
            filters.page,
  
          limit:
            filters.limit,
  
          sort:
            filters.sort
        }
      );
    }
  
  
    /* ============================================================
       DETAIL
    ============================================================ */
  
    getPurchaseOrderById(
      purchaseOrderId:
        string
    ): Observable<PurchaseOrder> {
  
      return this.api.get<
        PurchaseOrder
      >(
        `${this.baseUrl}/${purchaseOrderId}`
      );
    }
  
  
    /* ============================================================
       CREATE
    ============================================================ */
  
    createPurchaseOrder(
      payload:
        PurchaseOrderPayload
    ): Observable<PurchaseOrder> {
  
      return this.api.post<
        PurchaseOrder
      >(
        this.baseUrl,
        this.createPayload(
          payload
        )
      );
    }
  
  
    /* ============================================================
       UPDATE
    ============================================================ */
  
    updatePurchaseOrder(
      purchaseOrderId:
        string,
  
      payload:
        Partial<PurchaseOrderPayload>
    ): Observable<PurchaseOrder> {
  
      return this.api.put<
        PurchaseOrder
      >(
        `${this.baseUrl}/${purchaseOrderId}`,
        this.updatePayload(
          payload
        )
      );
    }


    private createPayload(
      payload: PurchaseOrderPayload
    ): Omit<PurchaseOrderPayload, 'vendorEnquiryId'> {

      const allowed = {
        ...payload
      };

      delete allowed.vendorEnquiryId;

      return allowed;
    }


    private updatePayload(
      payload: Partial<PurchaseOrderPayload>
    ): Partial<PurchaseOrderPayload> {

      const allowed = {
        ...payload
      };

      delete allowed.vendorId;
      delete allowed.purchaseRequestId;
      delete allowed.quotationId;
      delete allowed.vendorEnquiryId;

      return allowed;
    }
  
  
    /* ============================================================
       APPROVE
       Backend enforces Purchase Senior access.
    ============================================================ */
  
    approvePurchaseOrder(
      purchaseOrderId:
        string,
  
      remarks =
        ''
    ): Observable<PurchaseOrder> {
  
      return this.api.patch<
        PurchaseOrder
      >(
        `${this.baseUrl}/${purchaseOrderId}/approve`,
        {
          remarks
        }
      );
    }
  
  
    /* ============================================================
       SEND TO VENDOR
    ============================================================ */
  
    sendPurchaseOrder(
      purchaseOrderId:
        string,
  
      remarks =
        ''
    ): Observable<PurchaseOrder> {
  
      return this.api.patch<
        PurchaseOrder
      >(
        `${this.baseUrl}/${purchaseOrderId}/send`,
        {
          remarks
        }
      );
    }
  
  
    /* ============================================================
       CANCEL
    ============================================================ */
  
    cancelPurchaseOrder(
      purchaseOrderId:
        string,
  
      reason:
        string
    ): Observable<PurchaseOrder> {
  
      return this.api.patch<
        PurchaseOrder
      >(
        `${this.baseUrl}/${purchaseOrderId}/cancel`,
        {
          reason
        }
      );
    }
  
  
    /* ============================================================
       STATUS COUNTS
    ============================================================ */
  
    getStatusCounts():
      Observable<PurchaseOrderStatusCounts> {
  
      return this.api.get<
        PurchaseOrderStatusCounts
      >(
        `${this.baseUrl}/status-counts`
      );
    }
  
  
    /* ============================================================
       DELIVERY SUMMARY
    ============================================================ */
  
    getDeliverySummary():
      Observable<PurchaseOrderDeliverySummary> {
  
      return this.api.get<
        PurchaseOrderDeliverySummary
      >(
        `${this.baseUrl}/delivery-summary`
      );
    }
  
  }
