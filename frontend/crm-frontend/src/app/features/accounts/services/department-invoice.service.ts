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
    DepartmentInvoice,
    DepartmentInvoiceQuery,
    VerifyDepartmentInvoicePayload,
    RejectDepartmentInvoicePayload,
    RecordDepartmentInvoicePaymentPayload
    ,CompanyAdminApprovalDecisionPayload
  } from '../models/accounts.models';
  
  
  /* =========================================================
     LIST RESPONSE
  ========================================================= */
  
  export interface DepartmentInvoicePagination {
  
    total: number;
  
    page: number;
  
    limit: number;
  
    pages: number;
  }
  
  
  export interface DepartmentInvoiceListResponse {
  
    rows: DepartmentInvoice[];
  
    pagination: DepartmentInvoicePagination;
  }
  
  
  /* =========================================================
     SERVICE
  ========================================================= */
  
  @Injectable({
    providedIn: 'root'
  })
  export class DepartmentInvoiceService {
  
    private readonly api =
      inject(ApiService);
  
  
    private readonly basePath =
      '/accounting/department-invoices';
  
  
    /* =========================================================
       LIST INCOMING DEPARTMENT INVOICES
    ========================================================= */
  
    getDepartmentInvoices(
      query: DepartmentInvoiceQuery = {}
    ): Observable<DepartmentInvoiceListResponse> {
  
      return this.api.get<DepartmentInvoiceListResponse>(
        this.basePath,
        {
          ...query
        }
      );
    }
  
  
    /* =========================================================
       GET SINGLE INVOICE
    ========================================================= */
  
    getDepartmentInvoice(
      invoiceId: string
    ): Observable<DepartmentInvoice> {
  
      return this.api.get<DepartmentInvoice>(
        `${this.basePath}/${this.encodeId(invoiceId)}`
      );
    }

    getApprovalInvoices(
      query: DepartmentInvoiceQuery = {}
    ): Observable<DepartmentInvoiceListResponse> {
      return this.api.get<DepartmentInvoiceListResponse>(
        `${this.basePath}/approvals`,
        { ...query }
      );
    }

    decideApproval(
      invoiceId: string,
      payload: CompanyAdminApprovalDecisionPayload
    ): Observable<DepartmentInvoice> {
      return this.api.patch<DepartmentInvoice>(
        `${this.basePath}/${this.encodeId(invoiceId)}/company-admin-approval`,
        payload
      );
    }
  
  
    /* =========================================================
       GET INVOICE DOCUMENT AS AUTHENTICATED BLOB
  
       Used for both:
       - View
       - Download
  
       The backend validates:
       - Accounts access
       - company scope
       - DepartmentInvoice
       - document index
       - approved upload root
    ========================================================= */
  
    getDocumentBlob(
      invoiceId: string,
      documentIndex: number
    ): Observable<Blob> {
  
      return this.api.getBlob(
        `${this.basePath}/${this.encodeId(invoiceId)}/documents/${documentIndex}/download`
      );
    }
  
  
    /* =========================================================
       VERIFY INVOICE
    ========================================================= */
  
    verifyDepartmentInvoice(
      invoiceId: string,
      payload: VerifyDepartmentInvoicePayload = {}
    ): Observable<DepartmentInvoice> {
  
      return this.api.patch<DepartmentInvoice>(
        `${this.basePath}/${this.encodeId(invoiceId)}/verify`,
        payload
      );
    }
  
  
    /* =========================================================
       REJECT INVOICE
    ========================================================= */
  
    rejectDepartmentInvoice(
      invoiceId: string,
      payload: RejectDepartmentInvoicePayload
    ): Observable<DepartmentInvoice> {
  
      return this.api.patch<DepartmentInvoice>(
        `${this.basePath}/${this.encodeId(invoiceId)}/reject`,
        payload
      );
    }
  
  
    /* =========================================================
       RECORD LOGISTICS PAYMENT / RECEIPT
  
       IMPORTANT:
  
       Supported:
       - logistics_vendor_payment
       - logistics_invoice
  
       Purchase Invoice must NOT use this method.
  
       Purchase settlement remains:
  
       Payment Voucher
          ->
       Payment Allocation
          ->
       Purchase Invoice
    ========================================================= */
  
    recordPayment(
      invoiceId: string,
      payload: RecordDepartmentInvoicePaymentPayload
    ): Observable<DepartmentInvoice> {
  
      return this.api.post<DepartmentInvoice>(
        `${this.basePath}/${this.encodeId(invoiceId)}/payments`,
        payload
      );
    }
  
  
    /* =========================================================
       RECORD LOGISTICS VENDOR PAYMENT
  
       UI convenience method.
       Uses the same backend settlement endpoint.
    ========================================================= */
  
    recordVendorPayment(
      invoiceId: string,
      payload: RecordDepartmentInvoicePaymentPayload
    ): Observable<DepartmentInvoice> {
  
      return this.recordPayment(
        invoiceId,
        payload
      );
    }
  
  
    /* =========================================================
       RECORD LOGISTICS CUSTOMER RECEIPT
  
       Backend uses the generic /payments endpoint.
  
       Frontend terminology remains "Receipt" because a
       Logistics Invoice is Accounts receivable.
    ========================================================= */
  
    recordCustomerReceipt(
      invoiceId: string,
      payload: RecordDepartmentInvoicePaymentPayload
    ): Observable<DepartmentInvoice> {
  
      return this.recordPayment(
        invoiceId,
        payload
      );
    }
  
  
    /* =========================================================
       HELPERS
    ========================================================= */
  
    isPurchaseInvoice(
      invoice: DepartmentInvoice
    ): boolean {
  
      return (
        invoice.sourceModule ===
        'purchase_invoice'
      );
    }
  
  
    isLogisticsVendorPayment(
      invoice: DepartmentInvoice
    ): boolean {
  
      return (
        invoice.sourceModule ===
        'logistics_vendor_payment'
      );
    }
  
  
    isLogisticsInvoice(
      invoice: DepartmentInvoice
    ): boolean {
  
      return (
        invoice.sourceModule ===
        'logistics_invoice'
      );
    }
  
  
    canVerify(
      invoice: DepartmentInvoice
    ): boolean {
  
      return [
        'sent',
        'under_review'
      ].includes(
        invoice.status
      );
    }
  
  
    canReject(
      invoice: DepartmentInvoice
    ): boolean {
  
      return [
        'sent',
        'under_review'
      ].includes(
        invoice.status
      ) &&
      Number(
        invoice.paidAmount ||
        0
      ) ===
      0;
    }
  
  
    canRecordSettlement(
      invoice: DepartmentInvoice
    ): boolean {
  
      if (
        this.isPurchaseInvoice(
          invoice
        )
      ) {
  
        return false;
      }
  
  
      return (
        [
          'verified',
          'partially_paid'
        ].includes(
          invoice.status
        ) &&
        invoice.companyAdminApprovalStatus ===
          'approved' &&
        Number(
          invoice.remainingAmount ||
          0
        ) >
        0
      );
    }

    canApprove(invoice: DepartmentInvoice): boolean {
      return invoice.status === 'verified' &&
        invoice.companyAdminApprovalStatus === 'pending';
    }
  
  
    private encodeId(
      value: string
    ): string {
  
      return encodeURIComponent(
        value.trim()
      );
    }
  
  }
