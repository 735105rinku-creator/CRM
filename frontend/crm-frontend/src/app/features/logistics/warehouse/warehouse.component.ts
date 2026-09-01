import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

interface Option { label: string; value: string; }
interface PageResult<T> { data?: T[] | { data?: T[]; records?: T[]; items?: T[]; warehouses?: T[]; shipments?: T[] }; records?: T[]; items?: T[]; warehouses?: T[]; shipments?: T[]; }
interface WarehouseMaster { _id?: string; warehouseCode?: string; warehouseName?: string; address?: any; contact?: any; storage?: any; rates?: any; status?: string; receipts?: any[]; }
interface ShipmentRow { _id?: string; shipmentNumber?: string; shipmentMode?: string; shipmentModeOther?: string; customerName?: string; origin?: any; destination?: any; cargo?: any; transport?: any; warehouse?: any; estimatedArrival?: string; status?: string; }
interface WarehouseReceipt { id: string; warehouseId: string; receiptId: string; receiptNo: string; shipmentNo: string; customer: string; warehouse: string; entryDate: string; entryDateRaw: string; packages: number; weight: number; status: string; cargo: string; rack: string; bin: string; raw: any; }
type WarehouseView = 'dashboard' | 'receipt' | 'stock' | 'inspection' | 'ready' | 'history';

@Component({
  selector: 'app-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse.component.html',
  styleUrl: './warehouse.component.scss'
})
export class WarehouseComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly currentView = signal<WarehouseView>('dashboard');
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly shipmentSearch = signal('');
  protected readonly warehouses = signal<WarehouseMaster[]>([]);
  protected readonly shipments = signal<ShipmentRow[]>([]);
  protected readonly receipts = signal<WarehouseReceipt[]>([]);
  protected form = this.emptyForm();

  protected readonly movementTypes: Option[] = [
    { label: 'Inbound', value: 'inbound' },
    { label: 'Outbound', value: 'outbound' },
    { label: 'Transfer', value: 'transfer' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly storageTypes: Option[] = [
    { label: 'General Storage', value: 'general' },
    { label: 'Cold Storage', value: 'cold_storage' },
    { label: 'Bonded Warehouse', value: 'bonded' },
    { label: 'Hazardous Storage', value: 'dry' },
    { label: 'Temperature Controlled', value: 'reefer' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly statusOptions: Option[] = [
    { label: 'Expected', value: 'expected' },
    { label: 'Received', value: 'received' },
    { label: 'Inspection Pending', value: 'inspection_pending' },
    { label: 'Inspected', value: 'inspected' },
    { label: 'Stored', value: 'stored' },
    { label: 'Ready for Dispatch', value: 'ready_for_dispatch' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'Hold', value: 'hold' },
    { label: 'Damaged', value: 'damaged' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Other', value: 'other' }
  ];

  ngOnInit(): void {
    this.route.url.subscribe(() => {
      this.currentView.set(this.viewFromUrl(this.router.url));
      if (this.currentView() === 'receipt') this.openForm(false);
      if (this.currentView() !== 'receipt') this.showForm.set(false);
    });
    this.loadWarehouseData();
    this.loadShipments();
  }

  protected readonly warehouseOptions = computed(() => this.warehouses().filter((row) => row.status === 'active'));

  protected readonly shipmentOptions = computed(() => {
    const query = this.shipmentSearch().trim().toLowerCase();
    return this.shipments()
      .filter((row) => !['delivered', 'cancelled'].includes(String(row.status || '').toLowerCase()))
      .filter((row) => !query || this.shipmentLabel(row).toLowerCase().includes(query))
      .slice(0, 80);
  });

  protected readonly viewReceipts = computed(() => {
    const view = this.currentView();
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.receipts().filter((item) => {
      if (view === 'stock' && ['dispatched', 'cancelled'].includes(item.status)) return false;
      if (view === 'inspection' && item.status !== 'inspection_pending') return false;
      if (view === 'ready' && item.status !== 'ready_for_dispatch') return false;
      if (view === 'history' && item.status !== 'dispatched') return false;
      const matchesSearch = !query || [item.receiptNo, item.shipmentNo, item.customer, item.warehouse, item.cargo].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === 'all' || item.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  protected readonly filteredReceipts = computed(() => this.viewReceipts());

  protected readonly summary = computed(() => ({
    warehouses: this.warehouses().length,
    total: this.receipts().length,
    stored: this.receipts().filter((x) => x.status === 'stored').length,
    inspection: this.receipts().filter((x) => x.status === 'inspection_pending' || x.status === 'quality_check').length,
    ready: this.receipts().filter((x) => x.status === 'ready_for_dispatch').length,
    hold: this.receipts().filter((x) => x.status === 'hold' || x.status === 'damaged').length
  }));

  protected get totalStorageCharge(): number {
    const storageDays =
      Number(this.form.storageDays || 0);
  
    const storageRatePerDay =
      Number(this.form.storageRatePerDay || 0);
  
    return storageDays * storageRatePerDay;
  }
  
  
  protected get totalWarehouseCharge(): number {
    return (
      this.totalStorageCharge +
  
      Number(
        this.form.handlingCharge ||
        0
      ) +
  
      Number(
        this.form.loadingCharge ||
        0
      ) +
  
      Number(
        this.form.unloadingCharge ||
        0
      ) +
  
      Number(
        this.form.labourCharge ||
        0
      ) +
  
      Number(
        this.form.miscellaneousCharge ||
        0
      )
    );
  }

  protected readonly packageMismatch = computed(() => Number(this.form.expectedPackages || 0) !== Number(this.form.receivedPackages || 0));
  protected readonly weightMismatch = computed(() => Number(this.form.expectedWeight || 0) !== Number(this.form.actualWeight || 0));

  protected loadWarehouseData(): void {
    this.isLoading.set(true);
    this.api.get<PageResult<WarehouseMaster>>('/logistics/warehouse', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const masters = this.extractRows(response);
          this.warehouses.set(masters);
          this.receipts.set(this.flattenReceipts(masters));
        },
        error: (error: any) => window.alert(error?.error?.message || 'Unable to load warehouse data.')
      });
  }

  protected loadShipments(): void {
    this.api.get<PageResult<ShipmentRow>>('/logistics/shipments', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      .subscribe({ next: (response) => this.shipments.set(this.extractRows(response)), error: () => this.shipments.set([]) });
  }

  protected openForm(reset = true): void {
    if (reset) this.form = this.emptyForm();
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    if (this.currentView() === 'receipt') this.router.navigateByUrl('/logistics/warehouse');
  }

  protected go(path: string): void { this.router.navigateByUrl(path); }

  protected onShipmentSelected(): void {
    const shipment = this.shipments().find((item) => item._id === this.form.shipmentId);
    if (!shipment) {
      this.form.shipmentNo = '';
      return;
    }
    this.form.shipmentNo = shipment.shipmentNumber || '';
    this.form.customer = shipment.customerName || '';
    this.form.shipmentMode = this.shipmentModeLabel(shipment);
    this.form.origin = this.locationText(shipment.origin);
    this.form.destination = this.locationText(shipment.destination);
    this.form.productName =
  shipment.cargo?.commodityOther ||
  shipment.cargo?.commodity ||
  '';
    this.form.expectedPackages = Number(shipment.cargo?.packageCount || 0);
    this.form.receivedPackages = this.form.expectedPackages;
    this.form.expectedWeight = Number(shipment.cargo?.grossWeight || shipment.cargo?.chargeableWeight || 0);
    this.form.actualWeight = this.form.expectedWeight;
    this.form.weightUnit = shipment.cargo?.weightUnit || 'kg';
    this.form.entryDate = this.dateInput(shipment.warehouse?.entryDate || shipment.estimatedArrival || shipment.transport?.expectedDeliveryDate);
  }

  protected onWarehouseSelected(): void {
    const warehouse = this.warehouses().find((item) => item._id === this.form.warehouseId);
    if (!warehouse) return;
    this.form.warehouseCode = warehouse.warehouseCode || '';
    this.form.warehouseType = this.storageTypeLabel(warehouse.storage?.storageType || '');
    this.form.warehouseCity = warehouse.address?.city || '';
    this.form.warehouseAddress = [warehouse.address?.addressLine1, warehouse.address?.city, warehouse.address?.state].filter(Boolean).join(', ');
    this.form.warehouseCapacity = `${warehouse.storage?.totalCapacity || 0} ${this.capacityUnitLabel(warehouse.storage?.capacityUnit, warehouse.storage?.capacityUnitOther)}`;
    this.form.warehouseCapabilities = this.storageTypeLabel(warehouse.storage?.storageType || '');
    this.form.storageType = warehouse.storage?.storageType || this.form.storageType;
    this.form.storageRatePerDay = Number(warehouse.rates?.storageRate || this.form.storageRatePerDay || 0);
  }

  protected saveReceipt(): void {
    if (!this.form.shipmentId || !this.form.shipmentNo) { window.alert('Please select a valid shipment.'); return; }
    if (!this.form.warehouseId) { window.alert('Please select a warehouse.'); return; }
    if (!this.form.remarks.trim()) { window.alert('Warehouse remarks are required.'); return; }
    const payload = {
      shipmentId: this.form.shipmentId,
      shipmentNo: this.form.shipmentNo,
      commodity: String(this.form.productName || '')
        .trim()
        .slice(0, 200),
      receivedDate: this.form.entryDate || this.form.receiptDate || null,
      inwardReference: this.form.lrNumber || '',
      movementType: this.form.movementType === 'other' ? this.form.movementTypeOther : this.form.movementType,
      storageType: this.form.storageType === 'other' ? this.form.storageTypeOther : this.form.storageType,
      zone: this.form.zone,
      rackLocation: this.form.rackLocation,
      binLocation: this.form.binLocation,
      expectedQuantity: Number(this.form.expectedPackages || 0),
      receivedQuantity: Number(this.form.receivedPackages || 0),
      acceptedQuantity: Math.max(0, Number(this.form.receivedPackages || 0) - Number(this.form.damagedPackages || 0) - Number(this.form.shortageQuantity || 0)),
      rejectedQuantity: Number(this.form.shortageQuantity || 0),
      damagedQuantity: Number(this.form.damagedPackages || 0),
      quantityUnit: 'packages',
      expectedWeight: Number(this.form.expectedWeight || 0),
      receivedWeight: Number(this.form.actualWeight || 0),
      weightUnit: this.form.weightUnit || 'kg',
      batchNumber: this.form.batchNo,
      lotNumber: this.form.lotNo,
      qualityRemarks: this.form.inspectionRemarks || '',

      storageDays: Number(this.form.storageDays || 0),
      storageRatePerDay: Number(this.form.storageRatePerDay || 0),
      storageCharge:
  Number(
    this.totalStorageCharge || 0
  ),
      handlingCharge: Number(this.form.handlingCharge || 0),
      loadingCharge: Number(this.form.loadingCharge || 0),
      unloadingCharge: Number(this.form.unloadingCharge || 0),
      labourCharge: Number(this.form.labourCharge || 0),
      miscellaneousCharge: Number(this.form.miscellaneousCharge || 0),
      totalCharge:
  Number(
    this.totalWarehouseCharge || 0
  ),

      status: this.form.status,
      statusOther: this.form.statusOther,
      remarks: this.form.remarks.trim()
    };
    this.isSaving.set(true);
    this.api.post('/logistics/warehouse/' + this.form.warehouseId + '/receipts', payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => { this.showForm.set(false); this.form = this.emptyForm(); this.loadWarehouseData(); window.alert('Warehouse receipt saved successfully.'); this.router.navigateByUrl('/logistics/warehouse'); },
        error: (error: any) => window.alert(error?.error?.message || 'Unable to save warehouse receipt.')
      });
  }

  protected updateReceiptStatus(item: WarehouseReceipt, status: string): void {
    if (!item.warehouseId || !item.receiptId) return;
    this.api.patch('/logistics/warehouse/' + item.warehouseId + '/receipts/' + item.receiptId, { status, remarks: item.raw?.remarks || 'Warehouse status updated.' })
      .subscribe({ next: () => this.loadWarehouseData(), error: (error: any) => window.alert(error?.error?.message || 'Unable to update warehouse receipt.') });
  }

  protected shipmentLabel(row: ShipmentRow): string { return `${row.shipmentNumber || '-'} | ${row.customerName || '-'} | ${this.locationText(row.origin) || '-'} -> ${this.locationText(row.destination) || '-'}`; }
  protected statusLabel(status: string): string { return this.statusOptions.find((x) => x.value === status)?.label || status; }
  protected storageTypeLabel(value: string): string { return this.storageTypes.find((x) => x.value === value)?.label || value || '-'; }
  protected daysStored(item: WarehouseReceipt): number { const time = item.entryDateRaw ? new Date(item.entryDateRaw).getTime() : Date.now(); return Math.max(0, Math.floor((Date.now() - time) / 86400000)); }
  protected tableTitle(): string { const titles = { dashboard: 'Warehouse Receipts', receipt: 'Warehouse Receipts', stock: 'Current Stock', inspection: 'Inspection Pending', ready: 'Ready for Dispatch', history: 'Dispatch History' }; return titles[this.currentView()]; }

  private flattenReceipts(warehouses: WarehouseMaster[]): WarehouseReceipt[] {
    const rows: WarehouseReceipt[] = [];
    warehouses.forEach((warehouse) => (warehouse.receipts || []).forEach((receipt, index) => rows.push({
      id: String(receipt._id || `${warehouse._id}-${index}`),
      warehouseId: warehouse._id || '',
      receiptId: receipt._id || '',
      receiptNo: receipt.receiptNumber || '-',
      shipmentNo: receipt.shipmentNumber || '-',
      customer: receipt.customerName || '-',
      warehouse: warehouse.warehouseName || '-',
      entryDate: receipt.receivedDate ? new Date(receipt.receivedDate).toLocaleDateString('en-IN') : '-',
      entryDateRaw: receipt.receivedDate || '',
      packages: Number(receipt.quality?.receivedQuantity || 0),
      weight: Number(receipt.quality?.receivedWeight || 0),
      status: receipt.status || 'received',
      cargo: receipt.commodity || '-',
      rack: receipt.rackLocation || '-',
      bin: receipt.binLocation || '-',
      raw: receipt
    })));
    return rows.sort((a, b) => String(b.receiptNo).localeCompare(String(a.receiptNo)));
  }

  private extractRows<T>(response: PageResult<T> | T[] | null | undefined): T[] {
    if (Array.isArray(response)) return response;
    const data = response?.data;
    if (Array.isArray(data)) return data;
    return data?.data || data?.records || data?.items || data?.warehouses || data?.shipments || response?.records || response?.items || response?.warehouses || response?.shipments || [];
  }

  private shipmentModeLabel(row: ShipmentRow): string { return row.shipmentMode === 'air_cargo' ? 'Air Cargo' : row.shipmentMode === 'sea_freight' ? 'Sea Freight' : row.shipmentModeOther || row.shipmentMode || ''; }
  private locationText(value: any): string { return typeof value === 'string' ? value : value?.name || value?.city || value?.port || value?.address || ''; }
  private dateInput(value?: string): string { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
  private capacityUnitLabel(value?: string, other?: string): string { return value === 'other' ? other || 'Other' : value === 'sq_ft' ? 'Sq Ft' : String(value || '').toUpperCase(); }
  private viewFromUrl(url: string): WarehouseView { if (url.includes('/receipt/new')) return 'receipt'; if (url.includes('/stock')) return 'stock'; if (url.includes('/inspection')) return 'inspection'; if (url.includes('/ready-dispatch')) return 'ready'; if (url.includes('/dispatch-history')) return 'history'; return 'dashboard'; }

  private emptyForm() {
    return {
      receiptNo: 'Auto generated', receiptDate: new Date().toISOString().slice(0, 10), shipmentId: '', shipmentNo: '', customer: '', shipmentMode: '', origin: '', destination: '',
      warehouseId: '', warehouseCode: '', warehouseType: '', warehouseCity: '', warehouseAddress: '', warehouseCapacity: '', warehouseCapabilities: '', movementType: 'inbound', movementTypeOther: '', storageType: 'general', storageTypeOther: '',
      entryDate: new Date().toISOString().slice(0, 10), exitDate: '', actualExitDate: '', productName: '', batchNo: '', lotNo: '', expectedPackages: 0, receivedPackages: 0,
      damagedPackages: 0, shortageQuantity: 0, expectedWeight: 0, actualWeight: 0, weightUnit: 'kg', palletCount: 0, zone: '', rackLocation: '', binLocation: '',
      storageDays: 0, storageRatePerDay: 0, handlingCharge: 0, loadingCharge: 0, unloadingCharge: 0, labourCharge: 0, miscellaneousCharge: 0,
      receivedBy: '', inspectedBy: '', dispatchedBy: '', transporter: '', driver: '', vehicle: '', lrNumber: '', inspectionRemarks: '', status: 'received', statusOther: '', remarks: ''
    };
  }
}