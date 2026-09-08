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
  VoucherQuery
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


  private encodeId(
    value: string
  ): string {

    return encodeURIComponent(
      value.trim()
    );
  }

}