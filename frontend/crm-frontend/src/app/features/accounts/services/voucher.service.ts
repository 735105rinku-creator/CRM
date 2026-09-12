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
  PurchasePaymentAllocationOption
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

  getVoucher(
    voucherId: string
  ): Observable<Voucher> {

    return this.api.get<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}`
    );
  }


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


  updateVoucher(
    voucherId: string,
    payload: UpdateVoucherPayload
  ): Observable<Voucher> {

    return this.api.patch<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}`,
      payload
    );
  }


  postVoucher(
    voucherId: string
  ): Observable<Voucher> {

    return this.api.post<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}/post`,
      {}
    );
  }


  voidVoucher(
    voucherId: string,
    payload: VoidVoucherPayload
  ): Observable<Voucher> {

    return this.api.post<Voucher>(
      `${this.basePath}/${this.encodeId(voucherId)}/void`,
      payload
    );
  }


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

  getPurchaseAllocationOptions(
    voucherId: string
  ): Observable<PurchasePaymentAllocationOption[]> {
    return this.api.get<PurchasePaymentAllocationOption[]>(
      `${this.basePath}/${this.encodeId(voucherId)}/purchase-allocation-options`
    );
  }


  createPurchaseAllocations(
    voucherId: string,
    allocations: Array<{ purchaseInvoiceId: string; allocatedAmount: number }>
  ): Observable<unknown[]> {
    return this.api.post<unknown[]>(
      `${this.basePath}/${this.encodeId(voucherId)}/purchase-allocations`,
      { allocations }
    );
  }


  private encodeId(
    value: string
  ): string {

    return encodeURIComponent(
      value.trim()
    );
  }

}
