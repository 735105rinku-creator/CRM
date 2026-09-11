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


export type PurchaseInvoiceDocumentType =
  | 'vendor_invoice'
  | 'e_way_bill'
  | 'delivery_challan'
  | 'supporting_document'
  | 'other';


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
     UPLOAD ATTACHMENT

     Multipart field name expected by backend:
     invoiceFile

     Backend Multer rules:
     - PDF
     - JPG / JPEG
     - PNG
     - Maximum 1 MB

     The UI component will also reject files larger than 1 MB
     before this request is sent.
  ============================================================ */

  uploadAttachment(
    id:
      string,

    file:
      File,

    documentType:
      PurchaseInvoiceDocumentType,

    otherDocumentType?:
      string
  ):
    Observable<PurchaseInvoice> {

    const formData =
      new FormData();


    formData.append(
      'invoiceFile',
      file
    );


    formData.append(
      'documentType',
      documentType
    );


    if (
      documentType ===
        'other' &&
      otherDocumentType?.trim()
    ) {

      formData.append(
        'otherDocumentType',
        otherDocumentType.trim()
      );
    }


    return this.api.post<
      PurchaseInvoice
    >(
      `${this.baseUrl}/${id}/attachments`,
      formData
    );
  }


  /* ============================================================
     DELETE ATTACHMENT
  ============================================================ */

  deleteAttachment(
    id:
      string,

    attachmentId:
      string
  ):
    Observable<PurchaseInvoice> {

    return this.api.delete<
      PurchaseInvoice
    >(
      `${this.baseUrl}/${id}/attachments/${attachmentId}`
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