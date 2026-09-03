import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option {
  label: string;
  value: string;
}

interface LogisticsDocumentApiRow {
  _id?: string;
  documentNumber?: string;
  shipmentNumber?: string;
  customerName?: string;
  documentType?: string;
  documentTypeOther?: string;
  documentTitle?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuingAuthority?: string;
  referenceNumber?: string;
  fileName?: string;
  originalFileName?: string;
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  status?: string;
  statusOther?: string;
  remarks?: string;
  createdAt?: string;
}

interface LogisticsDocumentListResponse {
  data?: LogisticsDocumentApiRow[] | { data?: LogisticsDocumentApiRow[]; records?: LogisticsDocumentApiRow[]; pagination?: unknown };
  records?: LogisticsDocumentApiRow[];
}

interface LogisticsShipmentApiRow {
  _id?: string;
  shipmentNumber?: string;
  shipmentMode?: 'air_cargo' | 'sea_freight' | 'road' | 'other';
  customerName?: string;
  customerId?: { customerName?: string; companyName?: string; contactPerson?: string; mobile?: string; email?: string } | string | null;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  currentLocation?: string;
  trackingReference?: string;
  origin?: { name?: string; city?: string; country?: string };
  destination?: { name?: string; city?: string; country?: string };
  airFreight?: { awbNumber?: string; airline?: string; flightNumber?: string };
  seaFreight?: { billOfLading?: string; containerNumber?: string; bookingNumber?: string; shippingLine?: string; vesselName?: string };
}

interface ShipmentListResponse {
  data?: LogisticsShipmentApiRow[] | { data?: LogisticsShipmentApiRow[]; records?: LogisticsShipmentApiRow[]; pagination?: unknown };
  records?: LogisticsShipmentApiRow[];
}

interface ShipmentOption {
  label: string;
  value: string;
}

interface LogisticsDocument {
  id: number;
  mongoId: string;
  documentNo: string;
  shipmentNo: string;
  customer: string;
  documentType: string;
  documentTypeOther: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  uploadDate: string;
  expiryDate: string;
  status: string;
  statusOther: string;
  raw: LogisticsDocumentApiRow;
}

@Component({
  selector: 'app-logistics-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics-documents.component.html',
  styleUrl: './logistics-documents.component.scss'
})
export class LogisticsDocumentsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly showForm = signal(false);
  protected readonly search = signal('');
  protected readonly typeFilter = signal('all');

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');

  protected selectedFile: File | null = null;

  protected readonly documentTypes: Option[] = [
    { label: 'Commercial Invoice', value: 'commercial-invoice' },
    { label: 'Packing List', value: 'packing-list' },
    { label: 'Airway Bill', value: 'awb' },
    { label: 'Bill of Lading', value: 'bill-of-lading' },
    { label: 'Shipping Bill', value: 'shipping-bill' },
    { label: 'Bill of Entry', value: 'bill-of-entry' },
    { label: 'Certificate of Origin', value: 'certificate-origin' },
    { label: 'Insurance Certificate', value: 'insurance' },
    { label: 'Fumigation Certificate', value: 'fumigation' },
    { label: 'Phytosanitary Certificate', value: 'phytosanitary' },
    { label: 'Transport LR', value: 'lr' },
    { label: 'Warehouse Receipt', value: 'warehouse-receipt' },
    { label: 'Vendor Invoice', value: 'vendor-invoice' },
    { label: 'Customer Invoice', value: 'customer-invoice' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly statuses: Option[] = [
    { label: 'Valid', value: 'valid' },
    { label: 'Pending Verification', value: 'pending' },
    { label: 'Expired', value: 'expired' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();

  protected readonly records = signal<LogisticsDocument[]>([]);
  protected readonly shipments = signal<LogisticsShipmentApiRow[]>([]);

  protected readonly filteredRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    const type = this.typeFilter();

    return this.records().filter((item) => {
      const matchesSearch =
        !query ||
        item.documentNo.toLowerCase().includes(query) ||
        item.shipmentNo.toLowerCase().includes(query) ||
        item.customer.toLowerCase().includes(query) ||
        item.fileName.toLowerCase().includes(query);

      const matchesType =
        type === 'all' ||
        item.documentType === type;

      return matchesSearch && matchesType;
    });
  });

  protected readonly summary = computed(() => ({
    total: this.records().length,
    valid: this.records().filter((item) => item.status === 'valid').length,
    pending: this.records().filter((item) => item.status === 'pending').length,
    expired: this.records().filter((item) => item.status === 'expired').length
  }));

  ngOnInit(): void {
    this.loadDocuments();
    this.loadShipments();
  }

  protected loadDocuments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api
      .get<LogisticsDocumentListResponse>(
        '/logistics/documents',
        {
          page: 1,
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      )
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.records.set(
            this.extractDocumentRows(result).map((document, index) =>
              this.mapDocument(document, index)
            )
          );
        },
        error: (error: { error?: { message?: string; errors?: Array<{ message?: string }> } }) => {
          this.records.set([]);
          this.errorMessage.set(
            error?.error?.message ||
            error?.error?.errors?.[0]?.message ||
            'Unable to load Logistics documents.'
          );
        }
      });
  }

  protected loadShipments(): void {
    forkJoin({
      all: this.api.get<ShipmentListResponse>('/logistics/shipments', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }).pipe(catchError(() => of(null))),
      airCargo: this.api.get<ShipmentListResponse>('/logistics/shipments/air-cargo', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }).pipe(catchError(() => of(null))),
      seaFreight: this.api.get<ShipmentListResponse>('/logistics/shipments/sea-freight', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ all, airCargo, seaFreight }) => {
        const rows = this.uniqueShipments([
          ...this.extractShipmentRows(all),
          ...this.extractShipmentRows(airCargo),
          ...this.extractShipmentRows(seaFreight)
        ]);
        this.shipments.set(rows);
      },
      error: () => {
        this.shipments.set([]);
      }
    });
  }

  protected shipmentOptions(): ShipmentOption[] {
    return this.shipments()
      .filter((shipment) => Boolean(shipment.shipmentNumber))
      .map((shipment) => ({
        value: shipment.shipmentNumber || '',
        label: `${shipment.shipmentNumber} - ${this.shipmentCustomerName(shipment) || 'Customer'} - ${this.shipmentModeLabel(shipment.shipmentMode)}`
      }));
  }

  protected selectedShipment(): LogisticsShipmentApiRow | null {
    const shipmentNo = this.form.shipmentNo.trim();
    return this.shipments().find((shipment) => shipment.shipmentNumber === shipmentNo) || null;
  }
  protected onShipmentSelected(shipmentNumber: string): void {
    this.form.shipmentNo = shipmentNumber;

    const shipment = this.shipments().find(
      (item) => item.shipmentNumber === shipmentNumber
    );

    if (!shipment) {
      return;
    }

    this.form.customer = this.shipmentCustomerName(shipment);

    const reference =
      shipment.trackingReference ||
      shipment.airFreight?.awbNumber ||
      shipment.seaFreight?.billOfLading ||
      shipment.seaFreight?.containerNumber ||
      shipment.seaFreight?.bookingNumber ||
      shipment.airFreight?.flightNumber ||
      shipment.seaFreight?.vesselName ||
      '';

    if (!this.form.referenceNumber.trim()) {
      this.form.referenceNumber = reference;
    }

    if (!this.form.documentTitle.trim()) {
      const type = this.form.documentType
        ? this.documentTypeLabel(this.form.documentType)
        : 'Shipment Document';

      this.form.documentTitle = `${type} - ${shipmentNumber}`;
    }

    if (!this.form.remarks.trim()) {
      this.form.remarks = `Attached to shipment ${shipmentNumber}.`;
    }
  }

  protected onDocumentTypeChanged(): void {
    if (this.form.shipmentNo && !this.form.documentTitle.trim()) {
      this.form.documentTitle = `${this.documentTypeLabel(this.form.documentType)} - ${this.form.shipmentNo}`;
    }
  }
  protected openForm(): void {
    this.form = this.emptyForm();
    this.selectedFile = null;
    this.message.set('');
    this.errorMessage.set('');
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.selectedFile = null;
    this.form = this.emptyForm();
    this.message.set('');
    this.errorMessage.set('');
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      this.selectedFile = null;
      return;
    }

    const allowedTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png'
    ]);

    const extension =
      file.name.split('.').pop()?.toLowerCase() || '';

    if (
      !allowedTypes.has(file.type) ||
      !['pdf', 'jpg', 'jpeg', 'png'].includes(extension)
    ) {
      this.selectedFile = null;
      this.errorMessage.set(
        'Only PDF, JPG, JPEG and PNG documents are allowed.'
      );
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.selectedFile = null;
      this.errorMessage.set(
        'Document file must be 10 MB or smaller.'
      );
      input.value = '';
      return;
    }

    this.errorMessage.set('');
    this.selectedFile = file;
  }

  protected saveDocument(): void {
    if (this.isSaving()) return;

    const validationError = this.validateForm();

    if (validationError) {
      this.errorMessage.set(validationError);
      window.alert(validationError);
      return;
    }

    if (!this.selectedFile) {
      this.errorMessage.set('Please select a document file.');
      window.alert('Please select a document file.');
      return;
    }

    const formData = new FormData();

    formData.append('file', this.selectedFile);
    formData.append('shipmentNo', this.form.shipmentNo.trim().toUpperCase());
    formData.append('customer', this.form.customer.trim());
    formData.append('documentType', this.form.documentType);
    formData.append(
      'documentTypeOther',
      this.form.documentType === 'other'
        ? this.form.documentTypeOther.trim()
        : ''
    );
    formData.append('documentTitle', this.form.documentTitle.trim());
    formData.append('issueDate', this.form.issueDate || '');
    formData.append('expiryDate', this.form.expiryDate || '');
    formData.append('issuingAuthority', this.form.issuingAuthority.trim());
    formData.append('referenceNumber', this.form.referenceNumber.trim());
    formData.append('status', this.form.status);
    formData.append(
      'statusOther',
      this.form.status === 'other'
        ? this.form.statusOther.trim()
        : ''
    );
    formData.append('remarks', this.form.remarks.trim());

    this.isSaving.set(true);
    this.message.set('');
    this.errorMessage.set('');

    this.api
      .post<LogisticsDocumentApiRow>(
        '/logistics/documents',
        formData
      )
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (document) => {
          const number = document?.documentNumber || 'Document';

          this.message.set(`${number} uploaded successfully.`);
          this.errorMessage.set('');
          window.alert(`${number} uploaded successfully.`);

          this.showForm.set(false);
          this.selectedFile = null;
          this.form = this.emptyForm();

          this.loadDocuments();
        },
        error: (error: { status?: number; error?: { message?: string; errors?: Array<{ message?: string }> } }) => {
          const message =
            error?.status === 0
              ? 'Backend server is not running or API is unreachable. Please start backend and try again.'
              : error?.error?.message ||
              error?.error?.errors?.[0]?.message ||
              'Unable to upload Logistics document.';

          this.errorMessage.set(message);
          window.alert(message);
        }
      });
  }

  protected documentTypeLabel(type: string): string {
    return (
      this.documentTypes.find((option) => option.value === type)?.label ||
      type
    );
  }

  protected statusLabel(status: string): string {
    return (
      this.statuses.find((option) => option.value === status)?.label ||
      status
    );
  }

  protected downloadDocument(
    item: LogisticsDocument
  ): void {

    if (!item.mongoId) {
      this.errorMessage.set(
        'Document ID is not available.'
      );
      return;
    }

    this.errorMessage.set('');

    this.api
      .getBlob(
        `/logistics/documents/${encodeURIComponent(item.mongoId)}/download`
      )
      .subscribe({

        next: (blob) => {

          const url =
            URL.createObjectURL(
              blob
            );

          const anchor =
            document.createElement(
              'a'
            );

          anchor.href =
            url;

          anchor.download =
            item.fileName ||
            item.documentNo ||
            'document';

          anchor.style.display =
            'none';

          document.body
            .appendChild(
              anchor
            );

          anchor.click();

          anchor.remove();

          setTimeout(
            () =>
              URL.revokeObjectURL(
                url
              ),
            0
          );
        },

        error: (error: {
          error?: {
            message?: string;
          };
        }) => {

          console.error(
            'Unable to download Logistics document',
            error
          );

          this.errorMessage.set(
            error?.error?.message ||
            'Unable to download document.'
          );
        }

      });
  }

  protected previewDocument(
    item: LogisticsDocument
  ): void {

    if (!item.mongoId) {
      this.errorMessage.set(
        'Document ID is not available.'
      );
      return;
    }

    this.errorMessage.set('');

    /*
     * Open the tab immediately so popup blockers
     * do not block it after the async API response.
     */
    const previewWindow =
      window.open(
        '',
        '_blank',
        'noopener,noreferrer'
      );

    this.api
      .getBlob(
        `/logistics/documents/${encodeURIComponent(item.mongoId)}/preview`
      )
      .subscribe({

        next: (blob) => {

          const url =
            URL.createObjectURL(
              blob
            );

          if (previewWindow) {

            previewWindow.location.href =
              url;

          } else {

            window.open(
              url,
              '_blank',
              'noopener,noreferrer'
            );
          }

          /*
           * Give the browser enough time to load
           * the object URL before releasing it.
           */
          setTimeout(
            () =>
              URL.revokeObjectURL(
                url
              ),
            60_000
          );
        },

        error: (error: {
          error?: {
            message?: string;
          };
        }) => {

          if (previewWindow) {
            previewWindow.close();
          }

          console.error(
            'Unable to preview Logistics document',
            error
          );

          this.errorMessage.set(
            error?.error?.message ||
            'Unable to preview document.'
          );
        }

      });
  }

  private extractDocumentRows(
    result: LogisticsDocumentListResponse | LogisticsDocumentApiRow[] | null | undefined
  ): LogisticsDocumentApiRow[] {
    if (Array.isArray(result)) {
      return result;
    }

    const data = result?.data;

    if (Array.isArray(data)) {
      return data;
    }

    return data?.data || data?.records || result?.records || [];
  }

  private extractShipmentRows(
    result: ShipmentListResponse | LogisticsShipmentApiRow[] | null | undefined
  ): LogisticsShipmentApiRow[] {
    if (Array.isArray(result)) {
      return result;
    }

    const data = result?.data;

    if (Array.isArray(data)) {
      return data;
    }

    return data?.data || data?.records || result?.records || [];
  }

  private uniqueShipments(rows: LogisticsShipmentApiRow[]): LogisticsShipmentApiRow[] {
    const seen = new Set<string>();
    return rows.filter((shipment, index) => {
      const key = String(shipment._id || shipment.shipmentNumber || index).trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private shipmentCustomerName(shipment: LogisticsShipmentApiRow): string {
    const customer = shipment.customerId;
    if (customer && typeof customer === 'object') {
      return customer.customerName || customer.companyName || shipment.customerName || '';
    }
    return shipment.customerName || '';
  }

  private shipmentModeLabel(value?: string): string {
    const mode = String(value || '').trim().toLowerCase().replace(/_/g, '-');
    if (mode === 'air-cargo') return 'Air Cargo';
    if (mode === 'sea-freight') return 'Sea Freight';
    if (mode === 'road') return 'Road';
    return value || 'Shipment';
  }

  protected shipmentRouteLabel(shipment: LogisticsShipmentApiRow | null): string {
    if (!shipment) return '';
    const from = shipment.origin?.city || shipment.origin?.name || shipment.origin?.country || '';
    const to = shipment.destination?.city || shipment.destination?.name || shipment.destination?.country || '';
    return [from, to].filter(Boolean).join(' to ');
  }
  private validateForm(): string {
    if (!this.form.shipmentNo.trim()) {
      return 'Shipment Number is required.';
    }

    if (!this.form.customer.trim()) {
      return 'Customer is required.';
    }

    if (!this.form.documentType) {
      return 'Document Type is required.';
    }

    if (
      this.form.documentType === 'other' &&
      !this.form.documentTypeOther.trim()
    ) {
      return 'Enter Document Type because Other is selected.';
    }

    if (!this.form.status) {
      return 'Document Status is required.';
    }

    if (
      this.form.status === 'other' &&
      !this.form.statusOther.trim()
    ) {
      return 'Enter Document Status because Other is selected.';
    }

    if (!this.form.remarks.trim()) {
      return 'Remarks are compulsory.';
    }

    if (
      this.form.issueDate &&
      this.form.expiryDate &&
      new Date(this.form.expiryDate).getTime() <
      new Date(this.form.issueDate).getTime()
    ) {
      return 'Expiry Date cannot be before Issue Date.';
    }

    return '';
  }

  private mapDocument(
    document: LogisticsDocumentApiRow,
    index: number
  ): LogisticsDocument {
    return {
      id: index + 1,
      mongoId: document._id || '',
      documentNo: document.documentNumber || '-',
      shipmentNo: document.shipmentNumber || '-',
      customer: document.customerName || '-',
      documentType: document.documentType || 'other',
      documentTypeOther: document.documentTypeOther || '',
      fileName:
        document.originalFileName ||
        document.fileName ||
        '-',
      fileUrl: document.fileUrl || '',
      mimeType: document.mimeType || '',
      uploadDate: this.formatDate(document.createdAt),
      expiryDate: document.expiryDate
        ? this.formatDate(document.expiryDate)
        : '-',
      status: document.status || 'pending',
      statusOther: document.statusOther || '',
      raw: document
    };
  }

  private formatDate(
    value: string | null | undefined
  ): string {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    ).format(date);
  }

  private emptyForm() {
    return {
      documentNo: 'AUTO',
      shipmentNo: '',
      customer: '',
      documentType: '',
      documentTypeOther: '',
      documentTitle: '',
      issueDate: '',
      expiryDate: '',
      issuingAuthority: '',
      referenceNumber: '',
      status: 'valid',
      statusOther: '',
      remarks: ''
    };
  }
}




