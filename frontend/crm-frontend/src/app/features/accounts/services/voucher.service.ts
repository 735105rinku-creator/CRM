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
  CreateVoucherPayload,
  UpdateVoucherPayload,
  VoidVoucherPayload,
  Voucher,
  VoucherQuery,
  PurchasePaymentAllocationOption,
  PurchasePaymentContext
} from '../models/accounts.models';


@Injectable({
  providedIn: 'root'
})
export class VoucherService {

  private readonly api =
    inject(ApiService);

  readonly basePath =
    '/accounting/vouchers';


  /* =========================================================
     GENERIC VOUCHER WORKFLOW
  ========================================================= */

  getVouchers(
    query: VoucherQuery = {}
  ): Observable<Voucher[]> {

    return this.api.get<Voucher[]>(
      this.basePath,
      {
        ...query
      }
    );
  }


  createVoucher(
    payload: CreateVoucherPayload
  ): Observable<Voucher> {

    return this.api.post<Voucher>(
      this.basePath,
      payload
    );
  }


  /* =========================================================
     SALES VOUCHERS
  ========================================================= */

  getSalesVouchers(
    query: VoucherQuery = {}
  ): Observable<Voucher[]> {

    return this.api.get<Voucher[]>(
      this.basePath,
      {
        ...query,
        voucherType: 'sales'
      }
    );
  }


  /* =========================================================
     PURCHASE VOUCHERS
  ========================================================= */

  getPurchaseVouchers(
    query: VoucherQuery = {}
  ): Observable<Voucher[]> {

    return this.api.get<Voucher[]>(
      this.basePath,
      {
        ...query,
        voucherType: 'purchase'
      }
    );
  }


  createPurchaseVoucher(
    payload: Omit<CreateVoucherPayload, 'voucherType'>
  ): Observable<Voucher> {

    return this.api.post<Voucher>(
      this.basePath,
      {
        ...payload,
        voucherType: 'purchase'
      }
    );
  }


  /* =========================================================
     PURCHASE PAYMENT CONTEXT

     Used before creating a Payment Voucher from an approved
     Purchase Invoice.

     Backend resolves the trusted:
       - Purchase Invoice
       - outstanding amount
       - Purchase payable Voucher
       - Vendor/AP account
       - Company Admin approval

     Frontend must not guess the payable account.
  ========================================================= */

  getPurchasePaymentContext(
    purchaseInvoiceId: string
  ): Observable<PurchasePaymentContext> {

    return this.api.get<PurchasePaymentContext>(
      `${this.basePath}/purchase-payment-context/${this.encodeId(purchaseInvoiceId)}`
    );
  }


  /* =========================================================
     SINGLE VOUCHER
  ========================================================= */

  getVoucher(
    voucherId: string
  ): Observable<Voucher> {

    return this.api.get<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}`
    );
  }


  /* =========================================================
     SALES VOUCHER CREATION
  ========================================================= */

  createSalesVoucher(
    payload: Omit<CreateVoucherPayload, 'voucherType'>
  ): Observable<Voucher> {

    return this.api.post<Voucher>(
      this.basePath,
      {
        ...payload,
        voucherType: 'sales'
      }
    );
  }


  /* =========================================================
     UPDATE VOUCHER
  ========================================================= */

  updateVoucher(
    voucherId: string,
    payload: UpdateVoucherPayload
  ): Observable<Voucher> {

    return this.api.patch<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}`,
      payload
    );
  }


  /* =========================================================
     POST VOUCHER
  ========================================================= */

  postVoucher(
    voucherId: string
  ): Observable<Voucher> {

    return this.api.post<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}/post`,
      {}
    );
  }


  /* =========================================================
     VOID VOUCHER
  ========================================================= */

  voidVoucher(
    voucherId: string,
    payload: VoidVoucherPayload
  ): Observable<Voucher> {

    return this.api.post<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}/void`,
      payload
    );
  }


  /* =========================================================
     VOUCHER ATTACHMENTS
  ========================================================= */

  uploadAttachments(
    voucherId: string,
    files: File[]
  ): Observable<Voucher> {

    const formData =
      new FormData();

    for (
      const file of files
    ) {

      formData.append(
        'proofFiles',
        file,
        file.name
      );
    }


    return this.api.post<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}/attachments`,
      formData
    );
  }


  removeAttachment(
    voucherId: string,
    attachmentId: string
  ): Observable<Voucher> {

    return this.api.delete<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}/attachments/${this.encodeId(attachmentId)}`
    );
  }


  /* =========================================================
     PURCHASE PAYMENT ALLOCATION OPTIONS

     Used after a draft Payment Voucher exists.

     Backend re-validates Purchase Invoice eligibility before
     returning allocation options.
  ========================================================= */

  getPurchaseAllocationOptions(
    voucherId: string
  ): Observable<PurchasePaymentAllocationOption[]> {

    return this.api.get<PurchasePaymentAllocationOption[]>(
      `${this.basePath}/${this.encodeId(voucherId)}/purchase-allocation-options`
    );
  }


  /* =========================================================
     CREATE PURCHASE PAYMENT ALLOCATIONS
  ========================================================= */

  createPurchaseAllocations(
    voucherId: string,
    allocations: Array<{
      purchaseInvoiceId: string;
      allocatedAmount: number;
    }>
  ): Observable<unknown[]> {

    return this.api.post<unknown[]>(
      `${this.basePath}/${this.encodeId(voucherId)}/purchase-allocations`,
      {
        allocations
      }
    );
  }


  /* =========================================================
     ID ENCODING
  ========================================================= */

  private encodeId(
    value: string
  ): string {

    return encodeURIComponent(
      value.trim()
    );
  }

}