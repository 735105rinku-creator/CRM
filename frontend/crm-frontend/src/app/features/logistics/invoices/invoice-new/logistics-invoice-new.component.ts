import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';

interface SelectOption { label: string; value: string; }
interface InvoiceItem {
  itemId: string;
  description: string;
  descriptionOther: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitOther: string;
  rate: number;
  discount: number;
  gstRate: string;
  gstRateOther: string;
}
interface AdditionalCharge {
  description: string;
  descriptionOther: string;
  amount: number;
  taxable: string;
}
interface CustomerRow {
  _id?: string; customerName?: string; companyName?: string; contactPerson?: string;
  mobile?: string; email?: string; gstNumber?: string; currency?: string;
  billingAddress?: { addressLine1?: string; addressLine2?: string; city?: string; state?: string; country?: string; pincode?: string };
  pickupAddress?: { addressLine1?: string; addressLine2?: string; city?: string; state?: string; country?: string; pincode?: string };
}
interface ShipmentRow {
  _id?: string; shipmentNumber?: string; customerName?: string; origin?: string;
  destination?: string; route?: { origin?: string; destination?: string };
}
interface ItemRow {
  _id?: string; name?: string; itemCode?: string; itemType?: string; hsnSacCode?: string;
  unit?: string; unitOther?: string; salePrice?: number; taxPercent?: number; description?: string;
}
interface InvoiceRow {
  _id?: string; invoiceNumber?: string; customerName?: string; invoiceTotal?: number;
}
interface PageResult<T> { data?: T[] | { data?: T[]; records?: T[]; customers?: T[]; shipments?: T[]; productsServices?: T[]; services?: T[]; items?: T[] }; records?: T[]; customers?: T[]; shipments?: T[]; productsServices?: T[]; services?: T[]; items?: T[]; }

@Component({
  selector: 'app-logistics-invoice-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics-invoice-new.component.html',
  styleUrl: './logistics-invoice-new.component.scss'
})
export class LogisticsInvoiceNewComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSaving = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly recentInvoices = signal<InvoiceRow[]>([]);

  private customerRecords: CustomerRow[] = [];
  private shipmentRecords: ShipmentRow[] = [];
  private itemRecords: ItemRow[] = [];

  protected customers: SelectOption[] = [{ label: 'Other', value: 'other' }];
  protected shipmentOptions: SelectOption[] = [{ label: 'Other', value: 'other' }];

  protected readonly invoiceTypes: SelectOption[] = [
    { label: 'Tax Invoice', value: 'tax-invoice' },
    { label: 'Proforma Invoice', value: 'proforma' },
    { label: 'Commercial Invoice', value: 'commercial' },
    { label: 'Debit Note', value: 'debit-note' },
    { label: 'Credit Note', value: 'credit-note' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly currencies: SelectOption[] = [
    { label: 'INR - Indian Rupee', value: 'INR' },
    { label: 'USD - US Dollar', value: 'USD' },
    { label: 'AED - UAE Dirham', value: 'AED' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'GBP - British Pound', value: 'GBP' },
    { label: 'Other', value: 'other' }
  ];

  protected serviceOptions: SelectOption[] = [
    { label: 'Air Freight', value: 'preset:air-freight' },
    { label: 'Sea Freight', value: 'preset:sea-freight' },
    { label: 'CHA Charges', value: 'preset:cha-charges' },
    { label: 'Transportation Charges', value: 'preset:transportation' },
    { label: 'Warehouse Charges', value: 'preset:warehouse' },
    { label: 'Documentation Charges', value: 'preset:documentation' },
    { label: 'Terminal Handling Charges', value: 'preset:terminal-handling' },
    { label: 'Fuel Surcharge', value: 'preset:fuel-surcharge' },
    { label: 'Security Charges', value: 'preset:security' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly units: SelectOption[] = [
    { label: 'Service', value: 'service' }, { label: 'Kg', value: 'kg' },
    { label: 'MT', value: 'mt' }, { label: 'Ton', value: 'ton' },
    { label: 'Piece', value: 'piece' }, { label: 'Shipment', value: 'shipment' },
    { label: 'Container', value: 'container' }, { label: 'Day', value: 'day' },
    { label: 'Package', value: 'package' }, { label: 'Other', value: 'other' }
  ];

  protected readonly gstRates: SelectOption[] = [
    { label: '0%', value: '0' }, { label: '5%', value: '5' },
    { label: '12%', value: '12' }, { label: '18%', value: '18' },
    { label: '28%', value: '28' }, { label: 'Other', value: 'other' }
  ];

  protected readonly paymentModes: SelectOption[] = [
    { label: 'Bank Transfer', value: 'bank-transfer' }, { label: 'NEFT', value: 'neft' },
    { label: 'RTGS', value: 'rtgs' }, { label: 'IMPS', value: 'imps' },
    { label: 'UPI', value: 'upi' }, { label: 'Cheque', value: 'cheque' },
    { label: 'Cash', value: 'cash' }, { label: 'Other', value: 'other' }
  ];

  protected readonly paymentStatuses: SelectOption[] = [
    { label: 'Unpaid', value: 'unpaid' }, { label: 'Partially Paid', value: 'partial' },
    { label: 'Paid', value: 'paid' }, { label: 'Overdue', value: 'overdue' },
    { label: 'Cancelled', value: 'cancelled' }, { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();
  protected items: InvoiceItem[] = [this.emptyItem()];
  protected additionalCharges: AdditionalCharge[] = [];

  ngOnInit(): void {
    this.loadCustomers();
    this.loadShipments();
    this.loadItems();
    this.loadRecentInvoices();

    const invoiceId = this.route.snapshot.queryParamMap.get('invoiceId');
    if (invoiceId) {
      this.loadInvoice(invoiceId);
      return;
    }

    const shipmentNumber = this.route.snapshot.queryParamMap.get('shipmentNumber');
    if (shipmentNumber) this.form.shipment = shipmentNumber;
  }

  protected get itemsSubtotal(): number {
    return this.items.reduce((sum, item) => sum + this.itemTaxableAmount(item), 0);
  }
  protected get itemTaxTotal(): number {
    return this.items.reduce((sum, item) => sum + this.itemTaxAmount(item), 0);
  }
  protected get additionalChargeSubtotal(): number {
    return this.additionalCharges.reduce((sum, charge) => sum + this.number(charge.amount), 0);
  }
  protected get taxableAdditionalCharges(): number {
    return this.additionalCharges.reduce(
      (sum, charge) => sum + (charge.taxable === 'yes' ? this.number(charge.amount) : 0), 0
    );
  }
  protected get additionalChargeTax(): number { return this.taxableAdditionalCharges * 0.18; }
  protected get overallDiscountAmount(): number {
    const subtotal = this.itemsSubtotal + this.additionalChargeSubtotal;
    return this.form.discountType === 'percentage'
      ? Math.min(subtotal, subtotal * this.number(this.form.overallDiscount) / 100)
      : Math.min(subtotal, this.number(this.form.overallDiscount));
  }
  protected get totalBeforeTax(): number {
    return Math.max(0, this.itemsSubtotal + this.additionalChargeSubtotal - this.overallDiscountAmount);
  }
  protected get taxTotal(): number { return this.itemTaxTotal + this.additionalChargeTax; }
  protected get invoiceTotal(): number {
    return Math.max(0, this.totalBeforeTax + this.taxTotal + this.number(this.form.roundOff));
  }
  protected get balanceDue(): number {
    return Math.max(0, this.invoiceTotal - this.number(this.form.amountReceived));
  }

  protected addItem(): void { this.items.push(this.emptyItem()); }
  protected removeItem(index: number): void { if (this.items.length > 1) this.items.splice(index, 1); }
  protected addAdditionalCharge(): void {
    this.additionalCharges.push({ description: '', descriptionOther: '', amount: 0, taxable: 'yes' });
  }
  protected removeAdditionalCharge(index: number): void { this.additionalCharges.splice(index, 1); }

  protected itemBaseAmount(item: InvoiceItem): number {
    return this.number(item.quantity) * this.number(item.rate);
  }
  protected itemDiscountAmount(item: InvoiceItem): number {
    return Math.min(this.itemBaseAmount(item), this.number(item.discount));
  }
  protected itemTaxableAmount(item: InvoiceItem): number {
    return Math.max(0, this.itemBaseAmount(item) - this.itemDiscountAmount(item));
  }
  protected itemGstRate(item: InvoiceItem): number {
    return item.gstRate === 'other' ? this.number(item.gstRateOther) : this.number(item.gstRate);
  }
  protected itemTaxAmount(item: InvoiceItem): number {
    return this.itemTaxableAmount(item) * this.itemGstRate(item) / 100;
  }
  protected itemTotal(item: InvoiceItem): number {
    return this.itemTaxableAmount(item) + this.itemTaxAmount(item);
  }


  protected onCustomerSelected(): void {
    const customer = this.customerRecords.find((row) => row._id === this.form.customer);

    if (!customer) {
      if (!this.form.customer || this.form.customer === 'other') {
        this.form.contactPerson = '';
        this.form.mobile = '';
        this.form.email = '';
        this.form.gstNumber = '';
        this.form.billingAddress = '';
        this.form.shippingAddress = '';
      }
      return;
    }

    this.form.contactPerson = customer.contactPerson || this.form.contactPerson;
    this.form.mobile = customer.mobile || this.form.mobile;
    this.form.email = customer.email || this.form.email;
    this.form.gstNumber = customer.gstNumber || this.form.gstNumber;
    this.form.billingAddress = this.formatAddress(customer.billingAddress) || this.form.billingAddress;
    this.form.shippingAddress = this.formatAddress(customer.pickupAddress) || this.form.shippingAddress;
    this.form.currency = customer.currency || this.form.currency;
  }

  protected onProductServiceSelected(item: InvoiceItem): void {
    const live = this.itemRecords.find((row) => row._id === item.description);

    if (!live) {
      if (!item.description) {
        item.itemId = '';
        item.hsnSac = '';
        item.unit = 'service';
        item.unitOther = '';
        item.rate = 0;
        item.gstRate = '18';
        item.gstRateOther = '';
      }
      return;
    }

    item.itemId = live._id || item.itemId;
    item.descriptionOther = live.description || item.descriptionOther;
    item.hsnSac = live.hsnSacCode || item.hsnSac;
    item.unit = live.unit || item.unit;
    item.unitOther = live.unitOther || item.unitOther;
    item.rate = live.salePrice ?? item.rate;

    if (live.taxPercent !== undefined && live.taxPercent !== null) {
      const gst = String(live.taxPercent);
      item.gstRate = this.gstRates.some((rate) => rate.value === gst) ? gst : 'other';
      item.gstRateOther = item.gstRate === 'other' ? gst : '';
    }
  }
  protected saveDraft(): void { this.persistInvoice('draft'); }
  protected submitInvoice(): void { this.persistInvoice('issued'); }

  protected previewPdf(): void {
    if (!this.form.invoiceId) return this.setError('Save the invoice before PDF Preview.');
    window.print();
  }

  protected downloadPdf(): void {
    if (!this.form.invoiceId) return this.setError('Save the invoice before downloading PDF.');
    window.print();
  }

  protected printInvoice(): void { window.print(); }

  protected sendInvoice(): void {
    if (!this.form.invoiceId) return this.setError('Save the invoice before sending it.');
    if (!this.form.email.trim()) return this.setError('Customer email is required.');
    this.message.set('Invoice saved. Email sending endpoint is not configured yet.');
    this.errorMessage.set('');
  }

  protected resetInvoice(): void {
    if (!window.confirm('Clear all invoice details?')) return;
    this.form = this.emptyForm();
    this.items = [this.emptyItem()];
    this.additionalCharges = [];
    this.message.set(''); this.errorMessage.set('');
  }

  protected formatCurrency(value: number): string {
    const currency = this.form.currency === 'other'
      ? (this.form.currencyOther.trim().toUpperCase() || 'INR')
      : (this.form.currency || 'INR');
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency, minimumFractionDigits: 2
      }).format(this.number(value));
    } catch { return `${currency} ${this.number(value).toFixed(2)}`; }
  }

  private persistInvoice(status: 'draft' | 'issued'): void {
    if (this.isSaving()) return;
    const error = this.validate(status);
    if (error) { this.setError(error); window.alert(error); return; }

    this.isSaving.set(true); this.message.set(''); this.errorMessage.set('');
    const payload = this.buildPayload(status);
    const request = this.form.invoiceId
      ? this.api.patch<InvoiceRow>(`/logistics/invoices/${this.form.invoiceId}`, payload)
      : this.api.post<InvoiceRow>('/logistics/invoices', payload);

    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: (invoice) => {
        this.form.invoiceId = invoice?._id || this.form.invoiceId;
        this.form.invoiceNumber = invoice?.invoiceNumber || this.form.invoiceNumber;
        const text = status === 'draft'
          ? `Invoice ${this.form.invoiceNumber} saved as draft.`
          : `Invoice ${this.form.invoiceNumber} created successfully.`;
        this.message.set(text); window.alert(text); this.loadRecentInvoices();
      },
      error: (e: any) => {
        const text = e?.error?.message || e?.error?.errors?.[0]?.message || 'Unable to save Logistics invoice.';
        this.setError(text); window.alert(text);
      }
    });
  }

  private validate(status: 'draft' | 'issued'): string {
    if (!this.selectedCustomerName()) return 'Customer is required.';
    if (this.form.customer === 'other' && !this.form.customerOther.trim()) return 'Enter Customer Name because Other is selected.';
    if (!this.form.remarks.trim()) return 'Remarks are compulsory.';
    if (status === 'draft') return '';
    if (!this.form.invoiceDate) return 'Invoice Date is required.';
    if (!this.form.dueDate) return 'Due Date is required.';
    if (new Date(this.form.dueDate) < new Date(this.form.invoiceDate)) return 'Due Date cannot be before Invoice Date.';
    if (this.form.invoiceType === 'other' && !this.form.invoiceTypeOther.trim()) return 'Enter Invoice Type because Other is selected.';
    if (this.form.shipment === 'other' && !this.form.shipmentOther.trim()) return 'Enter Shipment Reference because Other is selected.';
    if (this.form.currency === 'other' && !this.form.currencyOther.trim()) return 'Enter Currency because Other is selected.';
    if (this.form.paymentStatus === 'other' && !this.form.paymentStatusOther.trim()) return 'Enter Payment Status because Other is selected.';
    if (this.form.paymentMode === 'other' && !this.form.paymentModeOther.trim()) return 'Enter Payment Mode because Other is selected.';
    if (!this.items.length) return 'Add at least one invoice item.';

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]; const n = i + 1;
      if (!item.description) return `Item ${n}: Service / Charge is required.`;
      if (item.description === 'other' && !item.descriptionOther.trim()) return `Item ${n}: enter Service / Charge because Other is selected.`;
      if (this.number(item.quantity) <= 0) return `Item ${n}: Quantity must be greater than zero.`;
      if (!item.unit) return `Item ${n}: Unit is required.`;
      if (item.unit === 'other' && !item.unitOther.trim()) return `Item ${n}: enter Unit because Other is selected.`;
      if (item.gstRate === 'other' && (this.itemGstRate(item) < 0 || this.itemGstRate(item) > 100)) return `Item ${n}: enter valid GST %.`;
    }
    if (this.number(this.form.amountReceived) > this.invoiceTotal) return 'Amount Received cannot exceed Invoice Total.';
    return '';
  }

  private buildPayload(status: 'draft' | 'issued'): Record<string, unknown> {
    const customer = this.customerRecords.find(x => x._id === this.form.customer);
    const shipment = this.shipmentRecords.find(x => x.shipmentNumber === this.form.shipment);
    return {
      customerId: customer?._id || null,
      customerName: this.selectedCustomerName(),
      contactPerson: this.form.contactPerson.trim(), mobile: this.form.mobile.trim(),
      email: this.form.email.trim(), gstNumber: this.form.gstNumber.trim(),
      billingAddress: this.form.billingAddress.trim(), shippingAddress: this.form.shippingAddress.trim(),
      invoiceDate: this.form.invoiceDate, dueDate: this.form.dueDate,
      invoiceType: this.form.invoiceType,
      invoiceTypeOther: this.form.invoiceType === 'other' ? this.form.invoiceTypeOther.trim() : '',
      shipmentId: shipment?._id || null,
      shipmentNumber: this.form.shipment === 'other' ? this.form.shipmentOther.trim().toUpperCase() : this.form.shipment,
      customerReference: this.form.customerReference.trim(), placeOfSupply: this.form.placeOfSupply.trim(),
      currency: this.form.currency === 'other' ? this.form.currencyOther.trim().toUpperCase() : this.form.currency,
      reverseCharge: this.form.reverseCharge,
      items: this.items.map(item => ({
        productServiceId: item.itemId || null,
        description: this.itemDescription(item), hsnSac: item.hsnSac.trim(),
        quantity: this.number(item.quantity), unit: item.unit,
        unitOther: item.unit === 'other' ? item.unitOther.trim() : '',
        rate: this.number(item.rate), discount: this.number(item.discount), gstRate: this.itemGstRate(item),
        baseAmount: this.itemBaseAmount(item), taxableAmount: this.itemTaxableAmount(item),
        taxAmount: this.itemTaxAmount(item), total: this.itemTotal(item)
      })),
      additionalCharges: this.additionalCharges.map(c => ({
        description: c.description === 'other' ? c.descriptionOther.trim() : c.description,
        amount: this.number(c.amount), taxable: c.taxable === 'yes'
      })),
      discountType: this.form.discountType, overallDiscount: this.number(this.form.overallDiscount),
      roundOff: this.number(this.form.roundOff), paymentStatus: this.form.paymentStatus,
      paymentStatusOther: this.form.paymentStatus === 'other' ? this.form.paymentStatusOther.trim() : '',
      paymentMode: this.form.paymentMode,
      paymentModeOther: this.form.paymentMode === 'other' ? this.form.paymentModeOther.trim() : '',
      paymentReference: this.form.paymentReference.trim(), paymentDate: this.form.paymentDate || null,
      amountReceived: this.number(this.form.amountReceived),
      bankDetails: {
        bankName: this.form.bankName.trim(), accountName: this.form.accountName.trim(),
        accountNumber: this.form.accountNumber.trim(), ifscCode: this.form.ifscCode.trim().toUpperCase(),
        branchName: this.form.branchName.trim()
      },
      termsAndConditions: this.form.termsAndConditions.trim(), remarks: this.form.remarks.trim(), status,
      itemsSubtotal: this.itemsSubtotal, additionalChargeSubtotal: this.additionalChargeSubtotal,
      overallDiscountAmount: this.overallDiscountAmount, taxableAmount: this.totalBeforeTax,
      taxTotal: this.taxTotal, invoiceTotal: this.invoiceTotal, balanceDue: this.balanceDue
    };
  }
  private loadInvoice(invoiceId: string): void {
    this.isSaving.set(true);
    this.errorMessage.set('');

    this.api.get<any>(`/logistics/invoices/${invoiceId}`)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (invoice) => {
          this.form = {
            ...this.emptyForm(),
            invoiceId: invoice?._id || invoiceId,
            customer: invoice?.customerId || 'other',
            customerOther: invoice?.customerName || '',
            contactPerson: invoice?.contactPerson || '',
            mobile: invoice?.mobile || '',
            email: invoice?.email || '',
            gstNumber: invoice?.gstNumber || '',
            billingAddress: invoice?.billingAddress || '',
            shippingAddress: invoice?.shippingAddress || '',
            invoiceNumber: invoice?.invoiceNumber || 'AUTO',
            invoiceDate: this.dateInput(invoice?.invoiceDate) || this.today(),
            dueDate: this.dateInput(invoice?.dueDate) || this.afterDays(15),
            invoiceType: invoice?.invoiceType || 'tax-invoice',
            invoiceTypeOther: invoice?.invoiceTypeOther || '',
            shipment: invoice?.shipmentNumber || '',
            shipmentOther: '',
            customerReference: invoice?.customerReference || '',
            placeOfSupply: invoice?.placeOfSupply || '',
            currency: invoice?.currency || 'INR',
            currencyOther: '',
            reverseCharge: invoice?.reverseCharge || 'no',
            discountType: invoice?.discountType || 'amount',
            overallDiscount: Number(invoice?.overallDiscount || 0),
            roundOff: Number(invoice?.roundOff || 0),
            paymentStatus: invoice?.paymentStatus || 'unpaid',
            paymentStatusOther: invoice?.paymentStatusOther || '',
            paymentMode: invoice?.paymentMode || '',
            paymentModeOther: invoice?.paymentModeOther || '',
            paymentReference: invoice?.paymentReference || '',
            paymentDate: this.dateInput(invoice?.paymentDate),
            amountReceived: Number(invoice?.amountReceived || 0),
            bankName: invoice?.bankDetails?.bankName || '',
            accountName: invoice?.bankDetails?.accountName || '',
            accountNumber: invoice?.bankDetails?.accountNumber || '',
            ifscCode: invoice?.bankDetails?.ifscCode || '',
            branchName: invoice?.bankDetails?.branchName || '',
            termsAndConditions: invoice?.termsAndConditions || '',
            remarks: invoice?.remarks || ''
          };

          this.items = Array.isArray(invoice?.items) && invoice.items.length
            ? invoice.items.map((item: any) => ({
                itemId: item?.productServiceId || '',
                description: item?.productServiceId || 'other',
                descriptionOther: item?.description || '',
                hsnSac: item?.hsnSac || '',
                quantity: Number(item?.quantity || 1),
                unit: item?.unit || 'service',
                unitOther: item?.unitOther || '',
                rate: Number(item?.rate || 0),
                discount: Number(item?.discount || 0),
                gstRate: String(item?.gstRate ?? '18'),
                gstRateOther: ''
              }))
            : [this.emptyItem()];

          this.additionalCharges = Array.isArray(invoice?.additionalCharges)
            ? invoice.additionalCharges.map((charge: any) => ({
                description: 'other',
                descriptionOther: charge?.description || '',
                amount: Number(charge?.amount || 0),
                taxable: charge?.taxable === false ? 'no' : 'yes'
              }))
            : [];
        },
        error: (error: any) => this.setError(error?.error?.message || 'Unable to load invoice.')
      });
  }

  private dateInput(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private loadCustomers(): void {
    this.api.get<PageResult<CustomerRow>>('/logistics/customers', { page: 1, limit: 100, status: 'active' })
      .subscribe({ next: r => {
        this.customerRecords = this.extractRows<CustomerRow>(r);
        this.customers = [
          ...this.customerRecords.filter(x => x._id).map(x => ({
            label: x.customerName || x.companyName || 'Customer', value: x._id!
          })), { label: 'Other', value: 'other' }
        ];
      }});
  }

  private loadShipments(): void {
    this.api.get<PageResult<ShipmentRow>>('/logistics/shipments', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .subscribe({ next: r => {
        this.shipmentRecords = this.extractRows<ShipmentRow>(r);
        this.shipmentOptions = [
          ...this.shipmentRecords.filter(x => x.shipmentNumber).map(x => ({
            label: this.shipmentLabel(x), value: x.shipmentNumber!
          })), { label: 'Other', value: 'other' }
        ];
      }});
  }

  private loadItems(): void {
    this.api.get<PageResult<ItemRow>>('/logistics/products-services', { page: 1, limit: 100, status: 'active' })
      .subscribe({ next: r => {
        this.itemRecords = this.extractRows<ItemRow>(r);
        this.serviceOptions = [
          ...this.itemRecords.filter(x => x._id).map(x => ({
            label: `${x.name || x.itemCode || 'Item'}${x.itemType ? ` (${x.itemType})` : ''}`, value: x._id!
          })), ...this.serviceOptions.filter(x => x.value.startsWith('preset:') || x.value === 'other')
        ];
      }});
  }

  private loadRecentInvoices(): void {
    this.api.get<PageResult<InvoiceRow>>('/logistics/invoices', { page: 1, limit: 3, sortBy: 'createdAt', sortOrder: 'desc' })
      .subscribe({ next: r => this.recentInvoices.set(this.extractRows<InvoiceRow>(r)), error: () => this.recentInvoices.set([]) });
  }


  private extractRows<T>(response: PageResult<T> | T[] | null | undefined): T[] {
    if (Array.isArray(response)) return response;
    const data = response?.data;
    if (Array.isArray(data)) return data;
    return data?.data || data?.records || data?.customers || data?.shipments || data?.productsServices || data?.services || data?.items || response?.records || response?.customers || response?.shipments || response?.productsServices || response?.services || response?.items || [];
  }

  private formatAddress(address: CustomerRow['billingAddress']): string {
    if (!address) return '';
    return [address.addressLine1, address.addressLine2, address.city, address.state, address.country, address.pincode].filter(Boolean).join(', ');
  }
  private selectedCustomerName(): string {
    if (this.form.customer === 'other') return this.form.customerOther.trim();
    const c = this.customerRecords.find(x => x._id === this.form.customer);
    return (c?.customerName || c?.companyName || '').trim();
  }

  private itemDescription(item: InvoiceItem): string {
    if (item.description === 'other') return item.descriptionOther.trim();
    const live = this.itemRecords.find(x => x._id === item.description);
    if (live?.name) return live.name;
    return this.serviceOptions.find(x => x.value === item.description)?.label || item.description;
  }

  private shipmentLabel(s: ShipmentRow): string {
    const from = s.route?.origin || s.origin || '';
    const to = s.route?.destination || s.destination || '';
    return `${s.shipmentNumber || 'Shipment'}${from || to ? ` - ${from || '?'} -> ${to || '?'}` : ''}`;
  }

  private emptyForm() {
    return {
      invoiceId: '', customer: '', customerOther: '', contactPerson: '', mobile: '', email: '', gstNumber: '',
      billingAddress: '', shippingAddress: '', invoiceNumber: 'AUTO', invoiceDate: this.today(), dueDate: this.afterDays(15),
      invoiceType: 'tax-invoice', invoiceTypeOther: '', shipment: '', shipmentOther: '', customerReference: '',
      placeOfSupply: '', currency: 'INR', currencyOther: '', reverseCharge: 'no', discountType: 'amount',
      overallDiscount: 0, roundOff: 0, paymentStatus: 'unpaid', paymentStatusOther: '', paymentMode: '',
      paymentModeOther: '', paymentReference: '', paymentDate: '', amountReceived: 0, bankName: '', accountName: '',
      accountNumber: '', ifscCode: '', branchName: '',
      termsAndConditions: 'Payment is due within the agreed credit period. Subject to applicable jurisdiction.', remarks: ''
    };
  }

  private emptyItem(): InvoiceItem {
    return { itemId: '', description: '', descriptionOther: '', hsnSac: '', quantity: 1, unit: 'service',
      unitOther: '', rate: 0, discount: 0, gstRate: '18', gstRateOther: '' };
  }
  private number(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private afterDays(days: number): string {
    const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
  }
  private setError(text: string): void { this.message.set(''); this.errorMessage.set(text); 
    
  }}
