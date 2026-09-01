import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option { label: string; value: string; }
interface PageResult<T> { data?: T[] | { data?: T[]; records?: T[]; vendors?: T[]; shipments?: T[]; items?: T[] }; records?: T[]; vendors?: T[]; shipments?: T[]; items?: T[]; }
interface ChaVendor { _id?: string; vendorName?: string; contactPerson?: string; mobile?: string; email?: string; chaLicenseNumber?: string; serviceLocations?: Array<{ locationName?: string; locationCode?: string; city?: string }>; }
interface ShipmentRow { _id?: string; shipmentNumber?: string; shipmentMode?: string; customerName?: string; origin?: any; destination?: any; customs?: any; airFreight?: any; seaFreight?: any; cargo?: any; }
interface ChaCase { _id?: string; caseNumber?: string; shipmentNumber?: string; shipmentNo?: string; customerName?: string; customer?: string; chaAgent?: string; chaAgentOther?: string; chaVendorId?: any; customsLocation?: string; customsLocationOther?: string; status?: string; statusOther?: string; assignedDate?: string; expectedClearanceDate?: string; tradeType?: string; shipmentType?: string; origin?: string; destination?: string; awbBlNumber?: string; shippingBillNo?: string; shippingBillDate?: string; billOfEntryNo?: string; billOfEntryDate?: string; assessableValue?: number; documents?: any; charges?: any; remarks?: string; } 

@Component({ selector: 'app-cha', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './cha.component.html', styleUrl: './cha.component.scss' })
export class ChaComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly selectedCase = signal<ChaCase | null>(null);
  protected editingCaseId = '';
  protected readonly cases = signal<ChaCase[]>([]);
  protected readonly chaVendors = signal<ChaVendor[]>([]);
  protected readonly shipments = signal<ShipmentRow[]>([]);

  protected chaAgents: Option[] = [{ label: 'Other', value: 'other' }];
  protected shipmentOptions: Option[] = [];
  protected customsLocations: Option[] = [{ label: 'Other', value: 'other' }];

  protected readonly statusOptions: Option[] = [
    { label: 'Documents Pending', value: 'documents_pending' },
    { label: 'Documents Ready', value: 'documents_ready' },
    { label: 'Submitted to CHA', value: 'submitted_to_cha' },
    { label: 'Filed', value: 'filed' },
    { label: 'Under Assessment', value: 'assessment' },
    { label: 'Examination', value: 'examination' },
    { label: 'Duty Pending', value: 'duty_pending' },
    { label: 'Cleared', value: 'cleared' },
    { label: 'On Hold', value: 'hold' },
    { label: 'Query Raised', value: 'query_raised' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => this.statusFilter.set(params.get('status') || 'all'));
    this.loadAll();
    if (this.route.snapshot.routeConfig?.path === 'cha/clearance/new') this.newCase();
  }

  protected loadAll(): void { this.loadCases(); this.loadChaVendors(); this.loadShipments(); }

  protected loadCases(): void {
    this.isLoading.set(true);
    this.api.get<PageResult<ChaCase>>('/logistics/cha', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({ next: (response) => this.cases.set(this.extractRows(response)), error: (error) => window.alert(error?.error?.message || 'Unable to load clearance jobs.') });
  }

  protected loadChaVendors(): void {
    this.api.get<PageResult<ChaVendor>>('/logistics/vendors', { page: 1, limit: 100, vendorType: 'cha', status: 'active', sortBy: 'vendorName', sortOrder: 'asc' })
      .subscribe({ next: (response) => {
        const rows = this.extractRows(response);
        this.chaVendors.set(rows);
        this.chaAgents = [...rows.filter((row) => row._id).map((row) => ({ label: row.vendorName || 'CHA', value: row._id! })), { label: 'Other', value: 'other' }];
        const locations = new Map<string, string>();
        rows.forEach((row) => (row.serviceLocations || []).forEach((loc) => { if (loc.locationName) locations.set(loc.locationName, loc.locationName); }));
        this.customsLocations = [...Array.from(locations).map(([label, value]) => ({ label, value })), { label: 'Other', value: 'other' }];
      }, error: () => undefined });
  }

  protected loadShipments(): void {
    this.api.get<PageResult<ShipmentRow>>('/logistics/shipments', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .subscribe({ next: (response) => {
        const rows = this.extractRows(response);
        this.shipments.set(rows);
        this.shipmentOptions = rows.filter((row) => row._id || row.shipmentNumber).map((row) => ({ label: `${row.shipmentNumber || 'Shipment'} - ${row.customerName || ''}`.trim(), value: row._id || row.shipmentNumber || '' }));
      }, error: () => undefined });
  }

  protected readonly filteredCases = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.cases().filter((item) => {
      const matchesSearch = !query || [item.caseNumber, item.shipmentNumber, item.shipmentNo, item.customerName, item.customer, item.chaAgent, item.customsLocation].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = status === 'all' || item.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  protected readonly summary = computed(() => {
    const rows = this.cases();
    return {
      totalCha: this.chaVendors().length,
      activeJobs: rows.filter((row) => !['cleared', 'cancelled'].includes(String(row.status || ''))).length,
      documentsPending: rows.filter((row) => ['documents_pending', 'documents_ready', 'submitted_to_cha'].includes(String(row.status || ''))).length,
      assessment: rows.filter((row) => row.status === 'assessment').length,
      hold: rows.filter((row) => ['hold', 'query_raised'].includes(String(row.status || ''))).length,
      cleared: rows.filter((row) => row.status === 'cleared').length
    };
  });

  protected newCase(): void { this.editingCaseId = ''; this.selectedCase.set(null); this.form = this.emptyForm(); this.showForm.set(true); }
  protected closeForm(): void { this.showForm.set(false); this.editingCaseId = ''; }
  protected goMaster(): void { void this.router.navigate(['/logistics/cha/master']); }
  protected goNewClearance(): void { this.newCase(); }

  protected onShipmentSelected(): void {
    const shipment = this.shipments().find((row) => row._id === this.form.shipmentId || row.shipmentNumber === this.form.shipmentId);
    if (!shipment) return;
    this.form.shipmentNo = shipment.shipmentNumber || '';
    this.form.customer = shipment.customerName || '';
    this.form.shipmentType = shipment.shipmentMode || 'air_cargo';
    this.form.origin = this.locationText(shipment.origin);
    this.form.destination = this.locationText(shipment.destination);
    this.form.tradeType = this.detectTradeType(shipment);
    this.form.chaRequired = shipment.customs?.chaRequired ? 'Yes' : 'No';
    this.form.customsLocation = shipment.customs?.customsLocation || this.form.origin || '';
    this.form.awbBlNumber = shipment.airFreight?.awbNumber || shipment.seaFreight?.blNumber || '';
    const chaId = typeof shipment.customs?.chaVendorId === 'object' ? shipment.customs.chaVendorId?._id : shipment.customs?.chaVendorId;
    if (chaId) { this.form.chaAgent = chaId; this.onChaSelected(); }
  }

  protected onChaSelected(): void {
    const cha = this.chaVendors().find((row) => row._id === this.form.chaAgent);
    if (!cha) return;
    this.form.chaVendorId = cha._id || '';
    this.form.chaContact = cha.contactPerson || this.form.chaContact;
    this.form.chaMobile = cha.mobile || this.form.chaMobile;
    this.form.chaEmail = cha.email || this.form.chaEmail;
    this.form.chaLicenseNumber = cha.chaLicenseNumber || this.form.chaLicenseNumber;
    this.form.customsLocation = cha.serviceLocations?.[0]?.locationName || this.form.customsLocation;
  }

  protected saveCase(): void {
    if (!this.form.shipmentNo.trim() || !this.form.customer.trim() || !this.form.chaAgent || !this.form.customsLocation) {
      window.alert('Shipment, Customer, CHA and Customs Location are required.'); return;
    }
    const payload = {
      shipmentId: this.form.shipmentId,
      shipmentType: this.form.shipmentType,
      shipmentNo: this.form.shipmentNo.trim(),
      customer: this.form.customer.trim(),
      chaVendorId: this.form.chaVendorId || (this.form.chaAgent !== 'other' ? this.form.chaAgent : ''),
      chaAgent: this.form.chaAgent,
      chaAgentOther: this.form.chaAgentOther,
      customsLocation: this.form.customsLocation,
      customsLocationOther: this.form.customsLocationOther,
      assignedDate: this.form.assignedDate || null,
      expectedClearanceDate: this.form.expectedClearanceDate || null,
      shippingBillNo: this.form.tradeType === 'export' ? this.form.shippingBillNo : '',
      shippingBillDate: this.form.tradeType === 'export' ? this.form.shippingBillDate || null : null,
      billOfEntryNo: this.form.tradeType === 'import' ? this.form.billOfEntryNo : '',
      billOfEntryDate: this.form.tradeType === 'import' ? this.form.billOfEntryDate || null : null,
      assessableValue: this.form.tradeType === 'import' ? Number(this.form.assessableValue || 0) : 0,
      charges: { customsDuty: Number(this.form.customsDuty || 0), igst: Number(this.form.igst || 0), cess: Number(this.form.cess || 0), chaCharge: Number(this.form.chaCharge || 0), examinationCharge: Number(this.form.examinationCharge || 0), miscellaneousCharge: Number(this.form.miscellaneousCharge || 0) },
      documents: { invoice: this.form.documentInvoice, packingList: this.form.documentPackingList, certificateOfOrigin: this.form.documentCertificateOrigin, shippingBill: this.form.documentShippingBill, billOfEntry: this.form.documentBillOfEntry, airwayBill: this.form.documentAirwayBill, billOfLading: this.form.documentBillOfLading, other: this.form.documentOther },
      status: this.form.status,
      statusOther: this.form.statusOther,
      remarks: this.form.remarks.trim() || 'Created from clearance job form.'
    };
    this.isSaving.set(true);
    const request = this.editingCaseId
      ? this.api.patch('/logistics/cha/' + this.editingCaseId, payload)
      : this.api.post('/logistics/cha', payload);
    request.pipe(finalize(() => this.isSaving.set(false))).subscribe({ next: () => { this.showForm.set(false); this.editingCaseId = ''; this.loadCases(); window.alert('Clearance job saved successfully.'); }, error: (error: any) => window.alert(error?.error?.message || 'Unable to save clearance job.') });
  }

  protected viewCase(item: ChaCase): void { this.selectedCase.set(item); this.showForm.set(false); this.editingCaseId = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }

  protected editCase(item: ChaCase): void { this.selectedCase.set(null); this.editingCaseId = item._id || ''; this.form = this.formFromCase(item); this.showForm.set(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  protected deleteCase(item: ChaCase): void {
    if (!item._id) return;
    if (!window.confirm('Delete this clearance job?')) return;
    this.api.delete('/logistics/cha/' + item._id).subscribe({ next: () => { this.selectedCase.set(null); this.loadCases(); window.alert('Clearance job deleted successfully.'); }, error: (error: any) => window.alert(error?.error?.message || 'Unable to delete clearance job.') });
  }

  protected statusLabel(status: string | undefined): string { return this.statusOptions.find((option) => option.value === status)?.label || String(status || '-').replace(/_/g, ' '); }

  private formFromCase(row: ChaCase): any {
    const chaId = typeof row.chaVendorId === 'object' && row.chaVendorId ? row.chaVendorId._id || '' : String(row.chaVendorId || '');
    const docs = row.documents || {};
    const charges = row.charges || {};
    return {
      ...this.emptyForm(),
      shipmentId: String((row as any).shipmentId?._id || (row as any).shipmentId || ''),
      shipmentNo: row.shipmentNumber || row.shipmentNo || '',
      shipmentType: row.shipmentType || '',
      customer: row.customerName || row.customer || '',
      origin: row.origin || '',
      destination: row.destination || '',
      tradeType: row.tradeType || 'export',
      awbBlNumber: row.awbBlNumber || '',
      chaAgent: chaId || row.chaAgent || '',
      chaVendorId: chaId,
      chaAgentOther: row.chaAgentOther || '',
      customsLocation: row.customsLocation || '',
      customsLocationOther: row.customsLocationOther || '',
      assignedDate: this.dateInput(row.assignedDate),
      expectedClearanceDate: this.dateInput(row.expectedClearanceDate),
      shippingBillNo: row.shippingBillNo || '',
      shippingBillDate: this.dateInput(row.shippingBillDate),
      billOfEntryNo: row.billOfEntryNo || '',
      billOfEntryDate: this.dateInput(row.billOfEntryDate),
      assessableValue: Number(row.assessableValue || 0),
      customsDuty: Number(charges.customsDuty || (row as any).customsDuty || 0),
      igst: Number(charges.igst || (row as any).igst || 0),
      cess: Number(charges.cess || (row as any).cess || 0),
      chaCharge: Number(charges.chaCharge || (row as any).chaCharge || 0),
      examinationCharge: Number(charges.examinationCharge || (row as any).examinationCharge || 0),
      miscellaneousCharge: Number(charges.miscellaneousCharge || (row as any).miscellaneousCharge || 0),
      documentInvoice: Boolean(docs.invoice),
      documentPackingList: Boolean(docs.packingList),
      documentCertificateOrigin: Boolean(docs.certificateOfOrigin),
      documentShippingBill: Boolean(docs.shippingBill),
      documentBillOfEntry: Boolean(docs.billOfEntry),
      documentAirwayBill: Boolean(docs.airwayBill),
      documentBillOfLading: Boolean(docs.billOfLading),
      documentOther: Boolean(docs.other),
      status: row.status || 'documents_pending',
      statusOther: row.statusOther || '',
      remarks: row.remarks || ''
    };
  }

  private normalizeCase(row: ChaCase): ChaCase { return row; }
  private extractRows<T>(response: PageResult<T> | T[] | null | undefined): T[] { if (Array.isArray(response)) return response; const data = response?.data; if (Array.isArray(data)) return data; return data?.data || data?.records || data?.vendors || data?.shipments || data?.items || response?.records || response?.vendors || response?.shipments || response?.items || []; }
  private locationText(value: any): string { return typeof value === 'string' ? value : value?.name || value?.city || value?.address || ''; }
  private dateInput(value?: string): string { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
  private detectTradeType(shipment: ShipmentRow): string { const text = `${shipment.cargo?.description || ''} ${shipment.customs?.shippingBillNumber || ''} ${shipment.customs?.billOfEntryNumber || ''}`.toLowerCase(); if (text.includes('import') || shipment.customs?.billOfEntryNumber) return 'import'; return 'export'; }
  private emptyForm() { return { shipmentId: '', shipmentNo: '', shipmentType: '', customer: '', origin: '', destination: '', tradeType: 'export', chaRequired: '', awbBlNumber: '', chaAgent: '', chaVendorId: '', chaAgentOther: '', chaContact: '', chaMobile: '', chaEmail: '', chaLicenseNumber: '', customsLocation: '', customsLocationOther: '', assignedDate: '', expectedClearanceDate: '', shippingBillNo: '', shippingBillDate: '', billOfEntryNo: '', billOfEntryDate: '', assessableValue: 0, customsDuty: 0, igst: 0, cess: 0, chaCharge: 0, examinationCharge: 0, miscellaneousCharge: 0, documentInvoice: false, documentPackingList: false, documentCertificateOrigin: false, documentShippingBill: false, documentBillOfEntry: false, documentAirwayBill: false, documentBillOfLading: false, documentOther: false, status: 'documents_pending', statusOther: '', remarks: '' }; }
}



