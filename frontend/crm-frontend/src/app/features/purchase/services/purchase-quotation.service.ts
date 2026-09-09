import {
    Injectable,
    inject
  } from '@angular/core';
  
  import {
    Observable
  } from 'rxjs';
  
  import {
    PurchaseApiListData,
    PurchaseQuotation,
    PurchaseQuotationFilters,
    PurchaseQuotationPayload,
    PurchaseQuotationStatus
  } from '../models/purchase.models';
  
  import {
    ApiService,
    QueryParams
  } from '../../../core/services/api.service';
  
  
  @Injectable({
    providedIn: 'root'
  })
  export class PurchaseQuotationService {
  
    private readonly api =
      inject(ApiService);
  
  
    private readonly basePath =
      '/purchase/quotations';
  
  
    /* ============================================================
       LIST
    ============================================================ */
  
    getQuotations(
      filters:
        PurchaseQuotationFilters = {}
    ):
      Observable<
        PurchaseApiListData<PurchaseQuotation>
      > {
  
        const params:
        QueryParams = {};
  
  
      if (
        filters.search
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
        filters.vendorId
      ) {
  
        params['vendorId'] =
          filters.vendorId;
      }
  
  
      if (
        filters.purchaseRequestId
      ) {
  
        params['purchaseRequestId'] =
          filters.purchaseRequestId;
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
  
  
      params['page'] =
        filters.page ?? 1;
  
  
      params['limit'] =
        filters.limit ?? 25;
  
  
      return this.api.get<
        PurchaseApiListData<PurchaseQuotation>
      >(
        this.basePath,
        params
      );
    }
  
  
    /* ============================================================
       GET ONE
    ============================================================ */
  
    getQuotationById(
      id: string
    ):
      Observable<PurchaseQuotation> {
  
      return this.api.get<
        PurchaseQuotation
      >(
        `${this.basePath}/${this.encodeId(id)}`
      );
    }
  
  
    /* ============================================================
       CREATE
    ============================================================ */
  
    createQuotation(
      payload:
        PurchaseQuotationPayload
    ):
      Observable<PurchaseQuotation> {
  
      return this.api.post<
        PurchaseQuotation
      >(
        this.basePath,
        this.normalizePayload(
          payload
        )
      );
    }
  
  
    /* ============================================================
       UPDATE
    ============================================================ */
  
    updateQuotation(
      id: string,
      payload:
        PurchaseQuotationPayload
    ):
      Observable<PurchaseQuotation> {
  
      return this.api.put<
        PurchaseQuotation
      >(
        `${this.basePath}/${this.encodeId(id)}`,
        this.normalizePayload(
          payload
        )
      );
    }
  
  
    /* ============================================================
       SELECT QUOTATION
    ============================================================ */
  
    selectQuotation(
      id: string,
      remarks?: string
    ):
      Observable<PurchaseQuotation> {
  
      return this.api.patch<
        PurchaseQuotation
      >(
        `${this.basePath}/${this.encodeId(id)}/select`,
        {
          remarks:
            remarks?.trim() ||
            undefined
        }
      );
    }
  
  
    /* ============================================================
       REJECT QUOTATION
    ============================================================ */
  
    rejectQuotation(
      id: string,
      reason?: string
    ):
      Observable<PurchaseQuotation> {
  
      return this.api.patch<
        PurchaseQuotation
      >(
        `${this.basePath}/${this.encodeId(id)}/reject`,
        {
          reason:
            reason?.trim() ||
            undefined
        }
      );
    }
  
  
    /* ============================================================
       CONTROLLED STATUS UPDATE
    ============================================================ */
  
    updateQuotationStatus(
      id: string,
      status:
        Extract<
          PurchaseQuotationStatus,
          'requested' | 'received'
        >
    ):
      Observable<PurchaseQuotation> {
  
      return this.api.patch<
        PurchaseQuotation
      >(
        `${this.basePath}/${this.encodeId(id)}/status`,
        {
          status
        }
      );
    }
  
  
    /* ============================================================
       COMPARISON
    ============================================================ */
  
    getComparison(
      purchaseRequestId: string
    ):
      Observable<PurchaseQuotation[]> {
  
      return this.api.get<
        PurchaseQuotation[]
      >(
        `${this.basePath}/comparison`,
        {
          purchaseRequestId
        }
      );
    }
  
  
    /* ============================================================
       NORMALIZE PAYLOAD
    ============================================================ */
  
    private normalizePayload(
      payload:
        PurchaseQuotationPayload
    ):
      PurchaseQuotationPayload {
  
      return {
  
        purchaseRequestId:
          payload.purchaseRequestId ||
          null,
  
        vendorEnquiryId:
          payload.vendorEnquiryId ||
          null,
  
        vendorId:
          payload.vendorId.trim(),
  
        quotationDate:
          payload.quotationDate ||
          undefined,
  
        items:
          payload.items.map(
            item => ({
  
              itemId:
                item.itemId ||
                null,
  
              itemName:
                item.itemName.trim(),
  
              description:
                item.description
                  ?.trim() ||
                '',
  
              quantity:
                Number(
                  item.quantity
                ),
  
              unit:
                item.unit.trim(),
  
              unitPrice:
                Number(
                  item.unitPrice
                ),
  
              taxPercent:
                Number(
                  item.taxPercent ||
                  0
                )
  
            })
          ),
  
        freightCharges:
          Number(
            payload.freightCharges ||
            0
          ),
  
        otherCharges:
          Number(
            payload.otherCharges ||
            0
          ),
  
        deliveryTime:
          payload.deliveryTime
            ?.trim() ||
          '',
  
        paymentTerms:
          payload.paymentTerms
            ?.trim() ||
          '',
  
        validUntil:
          payload.validUntil ||
          null,
  
        remarks:
          payload.remarks
            ?.trim() ||
          ''
  
      };
    }
  
  
    /* ============================================================
       SAFE ID
    ============================================================ */
  
    private encodeId(
      id: string
    ):
      string {
  
      return encodeURIComponent(
        String(id).trim()
      );
    }
  
  }
