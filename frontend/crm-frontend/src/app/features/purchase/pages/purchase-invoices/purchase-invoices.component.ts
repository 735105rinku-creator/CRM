import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { apiUrl } from '../../../../core/config/api.config';

import {
  GoodsReceipt,
  PurchaseInvoice,
  PurchaseInvoiceAttachment,
  PurchaseInvoiceDocumentType,
  PurchaseOrder,
  PURCHASE_INVOICE_DOCUMENT_TYPE_OPTIONS
} from '../../models/purchase.models';

import { PurchaseInvoiceService } from '../../services/purchase-invoice.service';
import { PurchaseRequestService } from '../../services/purchase-request.service';


interface DraftItem {
  purchaseOrderItemId: string;
  itemName: string;
  unit: string;
  invoicedQuantity: number;
  unitPrice: number;
  taxPercent: number;
}


@Component({
  selector: 'app-purchase-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './purchase-invoices.component.html',
  styleUrl: './purchase-invoices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseInvoicesComponent implements OnInit {

  private readonly service =
    inject(PurchaseInvoiceService);

  private readonly requestService =
    inject(PurchaseRequestService);


  readonly invoices =
    signal<PurchaseInvoice[]>([]);

  readonly purchaseOrders =
    signal<PurchaseOrder[]>([]);

  readonly receipts =
    signal<GoodsReceipt[]>([]);

  readonly loading =
    signal(false);

  readonly saving =
    signal(false);

  readonly error =
    signal('');

  readonly message =
    signal('');

  readonly formOpen =
    signal(false);

  readonly selectedInvoice =
    signal<PurchaseInvoice | null>(null);

  readonly editingInvoice =
    signal<PurchaseInvoice | null>(null);

  readonly canApprove =
    signal(false);


  /* ============================================================
     ATTACHMENT STATE
  ============================================================ */

  readonly uploadingAttachment =
    signal(false);

  readonly deletingAttachmentId =
    signal('');

  readonly purchaseInvoiceDocumentTypeOptions =
    PURCHASE_INVOICE_DOCUMENT_TYPE_OPTIONS;


  attachmentDocumentType:
    PurchaseInvoiceDocumentType =
      'vendor_invoice';

  attachmentOtherDocumentType =
    '';

  selectedAttachmentFile:
    File |
    null =
      null;


  search = '';
  status = '';
  matchStatus = '';
  handoffStatus = '';
  paymentStatus = '';


  purchaseOrderId = '';

  selectedReceiptIds: string[] = [];

  vendorInvoiceNumber = '';

  invoiceDate =
    this.today();

  receivedDate =
    this.today();

  freightCharges = 0;

  otherCharges = 0;

  declaredInvoiceTotal = 0;

  remarks = '';

  items: DraftItem[] = [];


  /* ============================================================
     INIT
  ============================================================ */

  ngOnInit(): void {

    this.load();


    this.requestService
      .getPurchaseAccess()
      .subscribe({

        next: access => {

          this.canApprove.set(
            access.canApprove === true
          );

        },

        error: () => {

          this.canApprove.set(false);

        }

      });

  }


  /* ============================================================
     LOAD
  ============================================================ */

  load(): void {

    this.loading.set(true);

    this.error.set('');


    const params: Record<string, string> = {
      limit: '200'
    };


    if (
      this.search.trim()
    ) {

      params['search'] =
        this.search.trim();

    }


    if (
      this.status
    ) {

      params['status'] =
        this.status;

    }


    if (
      this.matchStatus
    ) {

      params['matchStatus'] =
        this.matchStatus;

    }


    if (
      this.handoffStatus
    ) {

      params['handoffStatus'] =
        this.handoffStatus;

    }


    forkJoin({

      rows:
        this.service.list(
          params
        ),

      refs:
        this.service.getReferences()

    })
      .pipe(
        finalize(
          () =>
            this.loading.set(false)
        )
      )
      .subscribe({

        next: result => {

          const rows: PurchaseInvoice[] =
  (
    result.rows.rows ||
    []
  ).map(
    row => ({
      ...row,
      attachments:
        Array.isArray(
          row.attachments
        )
          ? row.attachments
          : []
    })
  );


          const visibleRows =
            this.paymentStatus

              ? rows.filter(
                  row =>
                    row.paymentStatus ===
                    this.paymentStatus
                )

              : rows;


          this.invoices.set(
            visibleRows
          );


          /*
           * Keep an already-open invoice detail synchronized
           * whenever the register is refreshed after upload,
           * delete, verify or handoff.
           */

          const currentSelected =
            this.selectedInvoice();


          if (
            currentSelected
          ) {

            const refreshed =
              rows.find(
                row =>
                  row._id ===
                  currentSelected._id
              );


            if (
              refreshed
            ) {

              this.selectedInvoice.set(
                refreshed
              );

            }

          }


          /*
           * Backend invoice reference endpoint already returns
           * vendorName directly on every Purchase Order.
           *
           * Do not remap row.vendor here.
           */

          this.purchaseOrders.set(
            result.refs.purchaseOrders ||
            []
          );

        },

        error: error => {

          this.error.set(
            error?.error?.message ||
            'Unable to load Purchase Invoices.'
          );

        }

      });

  }


  /* ============================================================
     CREATE FORM
  ============================================================ */

  openForm(): void {

    this.resetForm();

    this.editingInvoice.set(
      null
    );

    this.formOpen.set(
      true
    );

  }


  /* ============================================================
     EDIT FORM
  ============================================================ */

  editInvoice(
    row: PurchaseInvoice
  ): void {

    if (
      !this.canEditInvoice(
        row
      )
    ) {

      this.error.set(
        'Verified or Accounts handed-off invoices cannot be edited.'
      );

      return;

    }


    this.error.set('');

    this.message.set('');

    this.selectedInvoice.set(
      null
    );

    this.editingInvoice.set(
      row
    );

    this.formOpen.set(
      true
    );


    this.purchaseOrderId =
      this.referenceId(
        row.purchaseOrderId
      );


    this.vendorInvoiceNumber =
      row.vendorInvoiceNumber ||
      '';


    this.invoiceDate =
      this.dateInputValue(
        row.invoiceDate
      );


    this.receivedDate =
      this.dateInputValue(
        row.receivedDate
      );


    this.freightCharges =
      Number(
        row.freightCharges ||
        0
      );


    this.otherCharges =
      Number(
        row.otherCharges ||
        0
      );


    this.declaredInvoiceTotal =
      Number(
        row.declaredInvoiceTotal ??
        row.invoiceTotal ??
        0
      );


    this.remarks =
      row.remarks ||
      '';


    this.selectedReceiptIds =
      (
        row.goodsReceiptIds ||
        []
      )
        .map(
          receiptId =>
            this.referenceId(
              receiptId
            )
        )
        .filter(
          Boolean
        );


    this.items =
      (
        row.items ||
        []
      )
        .map(
          item => ({

            purchaseOrderItemId:
              this.referenceId(
                item.purchaseOrderItemId
              ),

            itemName:
              item.itemName ||
              '',

            unit:
              item.unit ||
              '',

            invoicedQuantity:
              Number(
                item.invoicedQuantity ||
                0
              ),

            unitPrice:
              Number(
                item.unitPrice ||
                0
              ),

            taxPercent:
              Number(
                item.taxPercent ||
                0
              )

          })
        );


    if (
      !this.purchaseOrderId
    ) {

      this.error.set(
        'The Purchase Order reference for this invoice is missing.'
      );

      return;

    }


    this.service
      .getReceipts(
        this.purchaseOrderId
      )
      .subscribe({

        next: receipts => {

          this.receipts.set(
            receipts ||
            []
          );

        },

        error: error => {

          this.receipts.set([]);

          this.error.set(
            error?.error?.message ||
            'Unable to load eligible GRNs for this invoice.'
          );

        }

      });

  }


  /* ============================================================
     EDIT PERMISSION
  ============================================================ */

  canEditInvoice(
    row: PurchaseInvoice
  ): boolean {

    const status =
      String(
        row.status ||
        ''
      );


    const handoffStatus =
      String(
        row.handoffStatus ||
        ''
      );


    return (
      (
        status === 'matched' ||
        status === 'exception'
      ) &&
      handoffStatus !== 'handing_off' &&
      handoffStatus !== 'handed_off' &&
      !row.accountsVoucherId
    );

  }


  /* ============================================================
     FORM MODE
  ============================================================ */

  isEditMode(): boolean {

    return !!this.editingInvoice();

  }


  formTitle(): string {

    return this.isEditMode()
      ? 'Edit Vendor Invoice'
      : 'New Vendor Invoice';

  }


  saveButtonLabel(): string {

    if (
      this.saving()
    ) {

      return this.isEditMode()
        ? 'Updating...'
        : 'Saving...';

    }


    return this.isEditMode()
      ? 'Update & Re-Match'
      : 'Save & Match';

  }


  /* ============================================================
     CLOSE FORM
  ============================================================ */

  closeForm(): void {

    this.formOpen.set(
      false
    );

    this.editingInvoice.set(
      null
    );

    this.resetForm();

  }


  /* ============================================================
     DETAIL
  ============================================================ */

  openDetail(
    row: PurchaseInvoice
  ): void {

    this.resetAttachmentForm();

    this.error.set('');

    this.message.set('');

    this.selectedInvoice.set(
      row
    );

  }


  closeDetail(): void {

    this.selectedInvoice.set(
      null
    );

    this.resetAttachmentForm();

  }


  /* ============================================================
     PAYMENT STATUS LABEL
  ============================================================ */

  paymentStatusLabel(
    value: PurchaseInvoice['paymentStatus']
  ): string {

    if (
      value === 'partially_paid'
    ) {

      return 'Partially Paid';

    }


    if (
      value === 'paid'
    ) {

      return 'Paid';

    }


    return 'Unpaid';

  }


  /* ============================================================
     ACCOUNTS HANDOFF STATUS LABEL

     Purchase only displays the Accounts integration state.
     It does not create or modify Accounts ledgers here.
  ============================================================ */

  handoffStatusLabel(
    row: PurchaseInvoice
  ): string {

    switch (
      row.handoffStatus
    ) {

      case 'handed_off':

        return 'Handed Off';


      case 'handing_off':

        return 'Sending...';


      case 'failed':

        return 'Accounts Setup Required';


      default:

        return 'Not Handed Off';

    }

  }


  /* ============================================================
     ACCOUNTS HANDOFF BUTTON LABEL
  ============================================================ */

  handoffButtonLabel(
    row: PurchaseInvoice
  ): string {

    return (
      row.handoffStatus ===
      'failed'
    )
      ? 'Retry Send to Accounts'
      : 'Send to Accounts';

  }


  /* ============================================================
     HANDOFF FAILURE
  ============================================================ */

  hasHandoffFailure(
    row: PurchaseInvoice
  ): boolean {

    return (
      row.handoffStatus ===
        'failed' &&
      !!String(
        row.handoffError ||
        ''
      )
        .trim()
    );

  }


  /* ============================================================
     HANDOFF DETAIL MESSAGE
  ============================================================ */

  handoffFailureMessage(
    row: PurchaseInvoice
  ): string {

    const backendMessage =
      String(
        row.handoffError ||
        ''
      )
        .trim();


    if (
      !backendMessage
    ) {

      return (
        'Accounts could not accept this invoice. ' +
        'Please contact the Accounts team and retry after the required setup is available.'
      );

    }


    if (
      backendMessage
        .toLowerCase()
        .includes(
          'accounts requires an active vendor accounts payable account and purchase account'
        )
    ) {

      return (
        'Accounts setup is incomplete for this vendor. ' +
        'An active vendor Accounts Payable ledger and an active Purchase account are required before this invoice can be handed off.'
      );

    }


    return backendMessage;

  }


  /* ============================================================
     ATTACHMENT MODIFY PERMISSION

     Verified invoices remain allowed until Accounts handoff
     actually begins.

     handing_off / handed_off / accountsVoucherId are locked.
  ============================================================ */

  canModifyAttachments(
    row: PurchaseInvoice
  ): boolean {

    return (
      row.handoffStatus !==
        'handing_off' &&
      row.handoffStatus !==
        'handed_off' &&
      !row.accountsVoucherId
    );

  }


  /* ============================================================
     CAN UPLOAD ATTACHMENT
  ============================================================ */

  canUploadAttachment(
    row: PurchaseInvoice
  ): boolean {

    return (
      this.canModifyAttachments(
        row
      ) &&
      (
        row.attachments?.length ||
        0
      ) < 5
    );

  }


  /* ============================================================
     ATTACHMENT FILE SELECTION
  ============================================================ */

  onAttachmentFileSelected(
    event: Event
  ): void {

    this.error.set('');

    this.message.set('');


    const input =
      event.target as
        HTMLInputElement;


    const file =
      input.files?.[0] ||
      null;


    if (
      !file
    ) {

      this.selectedAttachmentFile =
        null;

      return;

    }


    const maxFileSize =
      1 *
      1024 *
      1024;


    if (
      file.size >
      maxFileSize
    ) {

      this.selectedAttachmentFile =
        null;

      input.value =
        '';

      this.error.set(
        'Attachment size must not exceed 1 MB.'
      );

      return;

    }


    const allowedMimeTypes =
      [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];


    const allowedExtensions =
      [
        '.pdf',
        '.jpg',
        '.jpeg',
        '.png'
      ];


    const lowerName =
      file.name
        .toLowerCase();


    const hasAllowedExtension =
      allowedExtensions.some(
        extension =>
          lowerName.endsWith(
            extension
          )
      );


    if (
      !allowedMimeTypes.includes(
        file.type
      ) ||
      !hasAllowedExtension
    ) {

      this.selectedAttachmentFile =
        null;

      input.value =
        '';

      this.error.set(
        'Only PDF, JPG, JPEG and PNG files are allowed.'
      );

      return;

    }


    this.selectedAttachmentFile =
      file;

  }


  /* ============================================================
     DOCUMENT TYPE CHANGE
  ============================================================ */

  onAttachmentDocumentTypeChange(): void {

    if (
      this.attachmentDocumentType !==
      'other'
    ) {

      this.attachmentOtherDocumentType =
        '';

    }

  }


  /* ============================================================
     UPLOAD ATTACHMENT
  ============================================================ */

  uploadAttachment(
    row: PurchaseInvoice
  ): void {

    this.error.set('');

    this.message.set('');


    if (
      !this.canModifyAttachments(
        row
      )
    ) {

      this.error.set(
        'Attachments cannot be changed after Accounts handoff has started.'
      );

      return;

    }


    if (
      (
        row.attachments?.length ||
        0
      ) >= 5
    ) {

      this.error.set(
        'A maximum of 5 attachments is allowed for each Purchase Invoice.'
      );

      return;

    }


    if (
      !this.attachmentDocumentType
    ) {

      this.error.set(
        'Please select a document type.'
      );

      return;

    }


    if (
      this.attachmentDocumentType ===
        'other' &&
      !this.attachmentOtherDocumentType
        .trim()
    ) {

      this.error.set(
        'Please enter the custom document type.'
      );

      return;

    }


    if (
      !this.selectedAttachmentFile
    ) {

      this.error.set(
        'Please select a document to upload.'
      );

      return;

    }


    if (
      this.selectedAttachmentFile.size >
      (
        1 *
        1024 *
        1024
      )
    ) {

      this.error.set(
        'Attachment size must not exceed 1 MB.'
      );

      return;

    }


    this.uploadingAttachment.set(
      true
    );


    this.service
      .uploadAttachment(
        row._id,
        this.selectedAttachmentFile,
        this.attachmentDocumentType,
        this.attachmentOtherDocumentType
          .trim()
      )
      .pipe(
        finalize(
          () =>
            this.uploadingAttachment.set(
              false
            )
        )
      )
      .subscribe({

        next: updated => {

          this.message.set(
            'Invoice document uploaded successfully.'
          );


          this.resetAttachmentForm();


          if (
            updated &&
            updated._id
          ) {

            this.selectedInvoice.set(
              updated
            );

          }


          this.load();

        },

        error: error => {

          this.error.set(
            error?.error?.message ||
            'Unable to upload invoice document.'
          );

        }

      });

  }


  /* ============================================================
     DELETE ATTACHMENT
  ============================================================ */

  deleteAttachment(
    row: PurchaseInvoice,
    attachment: PurchaseInvoiceAttachment
  ): void {

    this.error.set('');

    this.message.set('');


    if (
      !this.canModifyAttachments(
        row
      )
    ) {

      this.error.set(
        'Attachments cannot be deleted after Accounts handoff has started.'
      );

      return;

    }


    if (
      !attachment._id
    ) {

      this.error.set(
        'Attachment reference is missing.'
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Delete "${attachment.originalName || attachment.fileName}"?`
      );


    if (
      !confirmed
    ) {

      return;

    }


    this.deletingAttachmentId.set(
      attachment._id
    );


    this.service
      .deleteAttachment(
        row._id,
        attachment._id
      )
      .pipe(
        finalize(
          () =>
            this.deletingAttachmentId.set(
              ''
            )
        )
      )
      .subscribe({

        next: () => {

          this.message.set(
            'Invoice document deleted successfully.'
          );


          this.load();

        },

        error: error => {

          this.error.set(
            error?.error?.message ||
            'Unable to delete invoice document.'
          );

        }

      });

  }


  /* ============================================================
     ATTACHMENT DOCUMENT LABEL
  ============================================================ */

  attachmentDocumentLabel(
    attachment:
      PurchaseInvoiceAttachment
  ): string {

    if (
      attachment.documentType ===
      'other'
    ) {

      return (
        attachment.otherDocumentType ||
        'Other'
      );

    }


    const option =
      PURCHASE_INVOICE_DOCUMENT_TYPE_OPTIONS
        .find(
          row =>
            row.value ===
            attachment.documentType
        );


    return (
      option?.label ||
      attachment.documentType
    );

  }


  /* ============================================================
     ATTACHMENT SIZE LABEL
  ============================================================ */

  attachmentSizeLabel(
    bytes:
      number
  ): string {

    const size =
      Number(
        bytes ||
        0
      );


    if (
      size <= 0
    ) {

      return '0 KB';

    }


    if (
      size <
      1024
    ) {

      return `${size} B`;

    }


    const kilobytes =
      size /
      1024;


    if (
      kilobytes <
      1024
    ) {

      return `${kilobytes.toFixed(1)} KB`;

    }


    return `${(
      kilobytes /
      1024
    ).toFixed(2)} MB`;

  }


  /* ============================================================
     RESOLVE ATTACHMENT URL

     MongoDB stores only the relative reference such as:
     /uploads/purchase-invoices/file.pdf

     The actual file remains on the backend filesystem.
  ============================================================ */

  attachmentUrl(
    attachment:
      PurchaseInvoiceAttachment
  ): string {

    const fileUrl =
      String(
        attachment.fileUrl ||
        ''
      )
        .trim();


    if (
      !fileUrl
    ) {

      return '';

    }


    if (
      /^https?:\/\//i.test(
        fileUrl
      )
    ) {

      return fileUrl;

    }


    try {

      const backendUrl =
        apiUrl(
          '/'
        );


      const backendOrigin =
        new URL(
          backendUrl,
          window.location.origin
        ).origin;


      return new URL(
        fileUrl,
        `${backendOrigin}/`
      ).toString();

    } catch {

      return fileUrl;

    }

  }


  /* ============================================================
     VIEW ATTACHMENT
  ============================================================ */

  viewAttachment(
    attachment:
      PurchaseInvoiceAttachment
  ): void {

    const url =
      this.attachmentUrl(
        attachment
      );


    if (
      !url
    ) {

      this.error.set(
        'Document URL is unavailable.'
      );

      return;

    }


    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );

  }


  /* ============================================================
     DOWNLOAD ATTACHMENT
  ============================================================ */

  downloadAttachment(
    attachment:
      PurchaseInvoiceAttachment
  ): void {

    const url =
      this.attachmentUrl(
        attachment
      );


    if (
      !url
    ) {

      this.error.set(
        'Document URL is unavailable.'
      );

      return;

    }


    const link =
      document.createElement(
        'a'
      );


    link.href =
      url;

    link.download =
      attachment.originalName ||
      attachment.fileName ||
      'purchase-invoice-document';

    link.target =
      '_blank';

    link.rel =
      'noopener noreferrer';


    document.body.appendChild(
      link
    );


    link.click();


    document.body.removeChild(
      link
    );

  }


  /* ============================================================
     PURCHASE ORDER SELECTION
  ============================================================ */

  selectPurchaseOrder(): void {

    this.selectedReceiptIds = [];

    this.receipts.set([]);


    const po =
      this.purchaseOrders()
        .find(
          row =>
            row._id ===
            this.purchaseOrderId
        );


    this.items =
      (
        po?.items ||
        []
      )
        .map(
          item => ({

            purchaseOrderItemId:
              item._id ||
              '',

            itemName:
              item.itemName,

            unit:
              item.unit,

            invoicedQuantity:
              0,

            unitPrice:
              Number(
                item.unitPrice ||
                0
              ),

            taxPercent:
              Number(
                item.taxPercent ||
                0
              )

          })
        );


    if (
      !po
    ) {

      this.freightCharges = 0;

      this.otherCharges = 0;

      this.declaredInvoiceTotal = 0;

      return;

    }


    this.freightCharges =
      Number(
        po.freightCharges ||
        0
      );


    this.otherCharges =
      Number(
        po.otherCharges ||
        0
      );


    this.declaredInvoiceTotal =
      Number(
        po.grandTotal ||
        0
      );


    this.service
      .getReceipts(
        po._id
      )
      .subscribe({

        next: rows => {

          this.receipts.set(
            rows ||
            []
          );

        },

        error: error => {

          this.error.set(
            error?.error?.message ||
            'Unable to load eligible GRNs.'
          );

        }

      });

  }


  /* ============================================================
     GRN SELECTION
  ============================================================ */

  toggleReceipt(
    receiptId: string,
    checked: boolean
  ): void {

    if (
      checked
    ) {

      if (
        !this.selectedReceiptIds.includes(
          receiptId
        )
      ) {

        this.selectedReceiptIds = [
          ...this.selectedReceiptIds,
          receiptId
        ];

      }


      return;

    }


    this.selectedReceiptIds =
      this.selectedReceiptIds
        .filter(
          value =>
            value !==
            receiptId
        );

  }


  /* ============================================================
     CHECK SELECTED GRN
  ============================================================ */

  isReceiptSelected(
    receiptId: string
  ): boolean {

    return this.selectedReceiptIds
      .includes(
        receiptId
      );

  }


  /* ============================================================
     SAVE / UPDATE INVOICE
  ============================================================ */

  save(): void {

    this.error.set('');

    this.message.set('');


    if (
      !this.purchaseOrderId
    ) {

      this.error.set(
        'Please select a Purchase Order.'
      );

      return;

    }


    if (
      !this.selectedReceiptIds.length
    ) {

      this.error.set(
        'Please select at least one eligible GRN.'
      );

      return;

    }


    if (
      !this.vendorInvoiceNumber.trim()
    ) {

      this.error.set(
        'Vendor Invoice Number is required.'
      );

      return;

    }


    if (
      Number(
        this.declaredInvoiceTotal
      ) <= 0
    ) {

      this.error.set(
        'Supplier Invoice Total must be greater than zero.'
      );

      return;

    }


    if (
      !this.items.length
    ) {

      this.error.set(
        'The selected Purchase Order does not contain invoice items.'
      );

      return;

    }


    if (
      this.items.some(
        item =>
          Number(
            item.invoicedQuantity
          ) <= 0
      )
    ) {

      this.error.set(
        'Please provide an invoiced quantity for every item.'
      );

      return;

    }


    const payload = {

      purchaseOrderId:
        this.purchaseOrderId,

      goodsReceiptIds:
        [
          ...this.selectedReceiptIds
        ],

      vendorInvoiceNumber:
        this.vendorInvoiceNumber
          .trim(),

      invoiceDate:
        this.invoiceDate,

      receivedDate:
        this.receivedDate,

      items:
        this.items.map(
          ({
            purchaseOrderItemId,
            invoicedQuantity,
            unitPrice,
            taxPercent
          }) => ({

            purchaseOrderItemId,

            invoicedQuantity:
              Number(
                invoicedQuantity
              ),

            unitPrice:
              Number(
                unitPrice
              ),

            taxPercent:
              Number(
                taxPercent
              )

          })
        ),

      freightCharges:
        Number(
          this.freightCharges ||
          0
        ),

      otherCharges:
        Number(
          this.otherCharges ||
          0
        ),

      declaredInvoiceTotal:
        Number(
          this.declaredInvoiceTotal
        ),

      remarks:
        this.remarks
          .trim()

    };


    const editing =
      this.editingInvoice();


    let request:
      Observable<PurchaseInvoice>;


    if (
      editing
    ) {

      request =
        this.service.update(
          editing._id,
          payload
        );

    } else {

      request =
        this.service.create(
          payload
        );

    }


    this.saving.set(
      true
    );


    request
      .pipe(
        finalize(
          () =>
            this.saving.set(
              false
            )
        )
      )
      .subscribe({

        next: row => {

          this.message.set(

            editing

              ? `Invoice ${row.vendorInvoiceNumber} updated and re-matched as ${row.matchStatus}.`

              : `Invoice ${row.vendorInvoiceNumber} saved with ${row.matchStatus} result.`

          );


          this.formOpen.set(
            false
          );

          this.editingInvoice.set(
            null
          );

          this.resetForm();

          this.load();

        },

        error: error => {

          this.error.set(
            error?.error?.message ||
            (
              editing
                ? 'Unable to update Purchase Invoice.'
                : 'Unable to save Purchase Invoice.'
            )
          );

        }

      });

  }


  /* ============================================================
     VERIFY
  ============================================================ */

  verify(
    row: PurchaseInvoice
  ): void {

    this.action(
      row,
      'verify'
    );

  }


  /* ============================================================
     HANDOFF TO ACCOUNTS
  ============================================================ */

  handoff(
    row: PurchaseInvoice
  ): void {

    this.action(
      row,
      'handoff'
    );

  }


  /* ============================================================
     ACTION
  ============================================================ */

  private action(
    row: PurchaseInvoice,
    action: 'verify' | 'handoff'
  ): void {

    this.saving.set(
      true
    );

    this.error.set('');

    this.message.set('');


    this.service[
      action
    ](
      row._id
    )
      .pipe(
        finalize(
          () =>
            this.saving.set(
              false
            )
        )
      )
      .subscribe({

        next: () => {

          this.message.set(
            action === 'verify'
              ? 'Invoice verified.'
              : 'Invoice handed to Accounts.'
          );


          this.load();

        },

        error: error => {

          const backendMessage =
            String(
              error?.error?.message ||
              ''
            )
              .trim();


          if (
            action === 'handoff' &&
            backendMessage
              .toLowerCase()
              .includes(
                'accounts requires an active vendor accounts payable account and purchase account'
              )
          ) {

            this.error.set(
              'Accounts setup is incomplete for this vendor. Please ask the Accounts team to configure the vendor payable ledger and Purchase account, then retry.'
            );

          } else {

            this.error.set(
              backendMessage ||
              `Unable to ${action} invoice.`
            );

          }


          if (
            action === 'handoff'
          ) {

            this.load();

          }

        }

      });

  }


  /* ============================================================
     ITEM AMOUNT
  ============================================================ */

  amount(
    row: DraftItem
  ): number {

    const quantity =
      Number(
        row.invoicedQuantity ||
        0
      );


    const price =
      Number(
        row.unitPrice ||
        0
      );


    const taxPercent =
      Number(
        row.taxPercent ||
        0
      );


    const base =
      quantity *
      price;


    return (
      base +
      (
        base *
        taxPercent /
        100
      )
    );

  }


  /* ============================================================
     DRAFT TOTAL
  ============================================================ */

  draftTotal(): number {

    const itemTotal =
      this.items.reduce(
        (
          sum,
          row
        ) =>
          sum +
          this.amount(
            row
          ),
        0
      );


    return (
      itemTotal +
      Number(
        this.freightCharges ||
        0
      ) +
      Number(
        this.otherCharges ||
        0
      )
    );

  }


  /* ============================================================
     REFERENCE ID
  ============================================================ */

  private referenceId(
    value: unknown
  ): string {

    if (
      typeof value ===
      'string'
    ) {

      return value;

    }


    if (
      value &&
      typeof value ===
        'object' &&
      '_id' in value
    ) {

      return String(
        (
          value as {
            _id?: unknown;
          }
        )._id ||
        ''
      );

    }


    return '';

  }


  /* ============================================================
     DATE INPUT VALUE
  ============================================================ */

  private dateInputValue(
    value: unknown
  ): string {

    if (
      !value
    ) {

      return this.today();

    }


    const date =
      new Date(
        String(
          value
        )
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return this.today();

    }


    return date
      .toISOString()
      .slice(
        0,
        10
      );

  }


  /* ============================================================
     RESET ATTACHMENT FORM
  ============================================================ */

  private resetAttachmentForm(): void {

    this.attachmentDocumentType =
      'vendor_invoice';

    this.attachmentOtherDocumentType =
      '';

    this.selectedAttachmentFile =
      null;

  }


  /* ============================================================
     RESET FORM
  ============================================================ */

  private resetForm(): void {

    this.purchaseOrderId =
      '';

    this.selectedReceiptIds =
      [];

    this.receipts.set(
      []
    );

    this.vendorInvoiceNumber =
      '';

    this.invoiceDate =
      this.today();

    this.receivedDate =
      this.today();

    this.freightCharges =
      0;

    this.otherCharges =
      0;

    this.declaredInvoiceTotal =
      0;

    this.remarks =
      '';

    this.items =
      [];

    this.error.set(
      ''
    );

  }


  /* ============================================================
     TODAY
  ============================================================ */

  private today(): string {

    return new Date()
      .toISOString()
      .slice(
        0,
        10
      );

  }

}