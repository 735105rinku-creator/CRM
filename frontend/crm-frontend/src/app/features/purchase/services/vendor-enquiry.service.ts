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
    ReceiveVendorEnquiryPayload,
    VendorEnquiry,
    VendorEnquiryFilters,
    VendorEnquiryPayload,
    VendorEnquiryStatus,
    VendorEnquiryStatusCounts
  } from '../models/purchase.models';
  
  
  @Injectable({
    providedIn: 'root'
  })
  export class VendorEnquiryService {
  
    private readonly api =
      inject(ApiService);
  
  
    private readonly basePath =
      '/purchase/vendor-enquiries';
  
  
    /* ============================================================
       LIST
    ============================================================ */
  
    getVendorEnquiries(
      filters: VendorEnquiryFilters = {}
    ): Observable<
      PurchaseApiListData<VendorEnquiry>
    > {
  
      return this.api.get<
        PurchaseApiListData<VendorEnquiry>
      >(
        this.basePath,
        {
          search:
            filters.search
              ?.trim() ||
            undefined,
  
          status:
            filters.status ||
            undefined,
  
          source:
            filters.source ||
            undefined,
  
          vendorId:
            filters.vendorId ||
            undefined,
  
          purchaseRequestId:
            filters.purchaseRequestId ||
            undefined,
  
          /*
           * Frontend names:
           * fromDate / toDate
           *
           * Backend query names:
           * from / to
           */
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
  
          sortBy:
            filters.sortBy,
  
          sortOrder:
            filters.sortOrder
        }
      );
    }
  
  
    /* ============================================================
       STATUS COUNTS
    ============================================================ */
  
    getStatusCounts():
      Observable<VendorEnquiryStatusCounts> {
  
      return this.api.get<
        VendorEnquiryStatusCounts
      >(
        `${this.basePath}/status-counts`
      );
    }
  
  
    /* ============================================================
       GET ONE
    ============================================================ */
  
    getVendorEnquiryById(
      vendorEnquiryId: string
    ): Observable<VendorEnquiry> {
  
      return this.api.get<VendorEnquiry>(
        `${
          this.basePath
        }/${
          this.encodeId(
            vendorEnquiryId
          )
        }`
      );
    }
  
  
    /* ============================================================
       CREATE DRAFT
    ============================================================ */
  
    createVendorEnquiry(
      payload: VendorEnquiryPayload
    ): Observable<VendorEnquiry> {
  
      return this.api.post<VendorEnquiry>(
        this.basePath,
        this.normalizePayload(
          payload
        )
      );
    }
  
  
    /* ============================================================
       UPDATE DRAFT
    ============================================================ */
  
    updateVendorEnquiry(
      vendorEnquiryId: string,
      payload: VendorEnquiryPayload
    ): Observable<VendorEnquiry> {
  
      return this.api.put<VendorEnquiry>(
        `${
          this.basePath
        }/${
          this.encodeId(
            vendorEnquiryId
          )
        }`,
        this.normalizePayload(
          payload
        )
      );
    }
  
  
    /* ============================================================
       SEND RFQ
  
       Workflow:
         draft -> requested
    ============================================================ */
  
    requestVendorEnquiry(
      vendorEnquiryId: string,
      remarks?: string
    ): Observable<VendorEnquiry> {
  
      return this.api.patch<VendorEnquiry>(
        `${
          this.basePath
        }/${
          this.encodeId(
            vendorEnquiryId
          )
        }/request`,
        {
          ...(remarks?.trim()
            ? {
                remarks:
                  remarks.trim()
              }
            : {})
        }
      );
    }
  
  
    /* ============================================================
       RECEIVE VENDOR QUOTATION
  
       Workflow:
         requested -> received
    ============================================================ */
  
    receiveVendorEnquiry(
      vendorEnquiryId: string,
      payload: ReceiveVendorEnquiryPayload
    ): Observable<VendorEnquiry> {
  
      return this.api.patch<VendorEnquiry>(
        `${
          this.basePath
        }/${
          this.encodeId(
            vendorEnquiryId
          )
        }/receive`,
        this.normalizeReceivePayload(
          payload
        )
      );
    }
  
  
    /* ============================================================
       CONTROLLED STATUS UPDATE
    ============================================================ */
  
    updateVendorEnquiryStatus(
      vendorEnquiryId: string,
      status: VendorEnquiryStatus,
      remarks?: string
    ): Observable<VendorEnquiry> {
  
      return this.api.patch<VendorEnquiry>(
        `${
          this.basePath
        }/${
          this.encodeId(
            vendorEnquiryId
          )
        }/status`,
        {
          status,
  
          ...(remarks?.trim()
            ? {
                remarks:
                  remarks.trim()
              }
            : {})
        }
      );
    }
  
  
    /* ============================================================
       PAYLOAD NORMALIZATION
    ============================================================ */
  
    private normalizePayload(
      payload: VendorEnquiryPayload
    ): VendorEnquiryPayload {
  
      const source =
        payload.source;
  
  
      const normalized:
        VendorEnquiryPayload = {
  
          purchaseRequestId:
            payload.purchaseRequestId ||
            null,
  
          vendorId:
            payload.vendorId.trim(),
  
          contactPerson:
            payload.contactPerson
              ?.trim() ||
            '',
  
          phone:
            payload.phone
              ?.trim() ||
            '',
  
          email:
            payload.email
              ?.trim()
              .toLowerCase() ||
            '',
  
          source,
  
          itemName:
            payload.itemName.trim(),
  
          quantity:
            Number(
              payload.quantity
            ),
  
          unit:
            payload.unit
              ?.trim() ||
            '',
  
          quotedPrice:
            payload.quotedPrice ===
              null ||
            payload.quotedPrice ===
              undefined
              ? null
              : Number(
                  payload.quotedPrice
                ),
  
          taxPercent:
            payload.taxPercent ===
              null ||
            payload.taxPercent ===
              undefined
              ? null
              : Number(
                  payload.taxPercent
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
  
  
      /*
       * IMPORTANT:
       *
       * User rule:
       * whenever "Other" is selected,
       * custom input must be supplied.
       */
      if (
        source ===
        'other'
      ) {
  
        normalized.otherSource =
          payload.otherSource
            ?.trim() ||
          '';
  
      }
  
  
      return normalized;
    }
  
  
    /* ============================================================
       RECEIVE PAYLOAD NORMALIZATION
    ============================================================ */
  
    private normalizeReceivePayload(
      payload: ReceiveVendorEnquiryPayload
    ): ReceiveVendorEnquiryPayload {
  
      return {
  
        quotedPrice:
          Number(
            payload.quotedPrice
          ),
  
        taxPercent:
          payload.taxPercent ===
            null ||
          payload.taxPercent ===
            undefined
            ? null
            : Number(
                payload.taxPercent
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
       SAFE ROUTE ID
    ============================================================ */
  
    private encodeId(
      value: string
    ): string {
  
      return encodeURIComponent(
        value.trim()
      );
    }
  
  }