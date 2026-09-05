import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { finalize } from 'rxjs';

import { ApiService } from '../../../../../core/services/api.service';

interface SelectOption {
  label: string;
  value: string;
}

interface OtherCharge {
  description: string;
  amount: number;
}

interface CustomerApiRow {
  _id?: string;
  customerCode?: string;
  customerName?: string;
  companyName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  billingAddress?: { addressLine1?: string; city?: string; state?: string; country?: string; pincode?: string };
  pickupAddress?: { addressLine1?: string; city?: string; state?: string; country?: string; pincode?: string };
}

interface LogisticsListResponse<T> {
  data?: T[] | { data?: T[]; records?: T[]; customers?: T[]; vendors?: T[]; transporters?: T[]; productsServices?: T[]; services?: T[]; items?: T[]; cha?: T[]; agents?: T[] };
  records?: T[];
  customers?: T[];
  vendors?: T[];
  transporters?: T[];
  productsServices?: T[];
  services?: T[];
  items?: T[];
  cha?: T[];
  agents?: T[];
}

interface VendorApiRow {
  _id?: string;
  vendorCode?: string;
  vendorName?: string;
  companyName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  address?: { addressLine1?: string; addressLine2?: string; city?: string; state?: string; country?: string; pincode?: string };
}

interface TransporterApiRow {
  _id?: string;
  transporterCode?: string;
  transporterName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  defaultDriverName?: string;
  defaultDriverMobile?: string;
  defaultVehicleNumber?: string;
}

interface ProductServiceApiRow {
  _id?: string;
  itemCode?: string;
  itemType?: string;
  name?: string;
  category?: string;
  categoryOther?: string;
  description?: string;
  hsnSacCode?: string;
  unit?: string;
  unitOther?: string;
  salePrice?: number;
  taxPercent?: number;
  serviceMode?: string;
  serviceModeOther?: string;
}

interface LogisticsShipmentResponse {
  _id?: string;
  shipmentNumber?: string;
  shipmentMode?: string;

  customerId?: string | null;
  customerName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  customerReference?: string;
  shipmentDate?: string | null;

  origin?: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
  };

  destination?: {
    name?: string;
    city?: string;
    country?: string;
  };

  cargo?: {
    commodity?: string;
    commodityOther?: string;
    description?: string;
    packageCount?: number;
    packageType?: string;
    packageTypeOther?: string;
    grossWeight?: number;
    chargeableWeight?: number;
    weightUnit?: string;
    weightUnitOther?: string;
  };

  airFreight?: {
    airline?: string;
    airlineOther?: string;
    awbNumber?: string;
    flightNumber?: string;
    departureAirport?: string;
    departureAirportOther?: string;
    arrivalAirport?: string;
    arrivalAirportOther?: string;
    departureDate?: string | null;
    arrivalDate?: string | null;
  };

  customs?: {
    chaRequired?: boolean;
    chaVendorId?: string | null;
    customsLocation?: string;
    customsLocationOther?: string;
    shippingBillNumber?: string;
    billOfEntryNumber?: string;
    status?: string;
    statusOther?: string;
  };

  transport?: {
    required?: boolean;
    transporterId?: string | null;
    pickupDate?: string | null;
    expectedDeliveryDate?: string | null;
  };

  charges?: {
    freightAmount?: number;
    chaCharge?: number;
    documentationCharge?: number;
    transportationCharge?: number;
    warehouseCharge?: number;
    handlingCharge?: number;
    insuranceCharge?: number;
    otherCharge?: number;
    otherChargeDescription?: string;
    subtotal?: number;
    discount?: number;
    taxableAmount?: number;
    gstRate?: number;
    gstAmount?: number;
    otherTax?: number;
    totalAmount?: number;
    currency?: string;
  };

  currentLocation?: string;
  trackingReference?: string;

  estimatedDeparture?: string | null;
  estimatedArrival?: string | null;

  status?: string;
  remarks?: string;

  createdAt?: string;
  updatedAt?: string;
}

interface CreateLogisticsShipmentPayload {
  shipmentNumber?: string;

  shipmentMode: 'air_cargo';

  customerName: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  customerReference?: string;
  shipmentDate?: string | null;

  origin?: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
  };

  destination?: {
    name?: string;
    city?: string;
    country?: string;
  };

  cargo?: {
    commodity?: string;
    commodityOther?: string;
    description?: string;
    packageCount?: number;
    packageType?: string;
    packageTypeOther?: string;
    grossWeight?: number;
    chargeableWeight?: number;
    weightUnit?: 'kg' | 'mt' | 'ton' | 'lb' | 'other';
    weightUnitOther?: string;
  };

  airFreight?: {
    airline?: string;
    airlineOther?: string;
    awbNumber?: string;
    flightNumber?: string;
    departureAirport?: string;
    departureAirportOther?: string;
    arrivalAirport?: string;
    arrivalAirportOther?: string;
    departureDate?: string | null;
    arrivalDate?: string | null;
  };

  customs?: {
    chaRequired?: boolean;
    chaVendorId?: string | null;
    customsLocation?: string;
    customsLocationOther?: string;
    shippingBillNumber?: string;
    billOfEntryNumber?: string;
    status?:
      | 'not_required'
      | 'documents_pending'
      | 'filed'
      | 'assessment'
      | 'examination'
      | 'duty_pending'
      | 'cleared'
      | 'hold'
      | 'other';
    statusOther?: string;
  };

  transport?: {
    required?: boolean;
    transporterId?: string | null;
    pickupDate?: string | null;
    expectedDeliveryDate?: string | null;
  };

  charges?: {
    freightAmount?: number;
    chaCharge?: number;
    documentationCharge?: number;
    transportationCharge?: number;
    warehouseCharge?: number;
    handlingCharge?: number;
    insuranceCharge?: number;
    otherCharge?: number;
    otherChargeDescription?: string;
    subtotal?: number;
    discount?: number;
    taxableAmount?: number;
    gstRate?: number;
    gstAmount?: number;
    otherTax?: number;
    totalAmount?: number;
    currency?: string;
  };

  currentLocation?: string;
  trackingReference?: string;

  estimatedDeparture?: string | null;
  estimatedArrival?: string | null;

  status?: 'draft' | 'booking_created';

  customerId?: string | null;

  remarks: string;
}

@Component({
  selector: 'app-air-cargo-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './air-cargo-new.component.html',
  styleUrl: './air-cargo-new.component.scss'
})
export class AirCargoNewComponent {

  private readonly api =
    inject(ApiService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);


  protected readonly isSaving =
    signal(false);

  protected readonly isLoadingEdit =
    signal(false);

  protected readonly message =
    signal('');

  protected readonly errorMessage =
    signal('');

  protected readonly editingShipmentId =
    signal<string | null>(null);

  protected readonly isEditMode =
    signal(false);

  protected customers: SelectOption[] = [{ label: 'Other', value: 'other' }];

  private readonly customerRows = signal<CustomerApiRow[]>([]);
  private readonly chaRows = signal<VendorApiRow[]>([]);
  private readonly transporterRows = signal<TransporterApiRow[]>([]);
  private readonly productRows = signal<ProductServiceApiRow[]>([]);
  private editLookupLoadsRemaining = 0;
  private editShipmentReady = false;

  constructor() {

    this.loadCustomers();
  
    this.loadChaVendors();
  
    this.loadTransporters();
  
    this.loadProductsServices();
  
  
    const editId =
      this.route
        .snapshot
        .queryParamMap
        .get('editId');
  
  
    if (
      editId
    ) {
      this.editLookupLoadsRemaining = 4;
  
      this.editingShipmentId.set(
        editId
      );
  
      this.isEditMode.set(
        true
      );
  
      this.loadShipmentForEdit(
        editId
      );
    }
  }

  /* ==========================================================
   LOAD EXISTING SHIPMENT FOR EDIT
========================================================== */

private loadShipmentForEdit(
  shipmentId: string
): void {

  if (
    !shipmentId
  ) {

    return;
  }


  this.isLoadingEdit.set(
    true
  );

  this.errorMessage.set(
    ''
  );


  this.api
    .get<LogisticsShipmentResponse>(
      `/logistics/shipments/${shipmentId}`
    )

    .pipe(finalize(() => {
      this.editShipmentReady = true;
      this.finishEditLoadingIfReady();
    }))

    .subscribe({

      next: (
        shipment
      ) => {

        if (
          !shipment?._id
        ) {

          this.errorMessage.set(
            'Unable to load Air Cargo shipment for editing.'
          );

          return;
        }


        this.editingShipmentId.set(
          shipment._id
        );

        this.isEditMode.set(
          true
        );


        this.populateEditForm(
          shipment
        );


        this.message.set(
          `Editing ${shipment.shipmentNumber || 'Air Cargo shipment'}`
        );

        this.errorMessage.set(
          ''
        );
      },


      error: (
        error
      ) => {

        const message =
          error?.error?.message ||
          'Unable to load existing Air Cargo shipment.';


        this.errorMessage.set(
          message
        );


        window.alert(
          message
        );
      }

    });
}

/* ==========================================================
   BACKEND SHIPMENT -> AIR CARGO FORM
========================================================== */

private populateEditForm(
  shipment: LogisticsShipmentResponse
): void {

  const cargo =
    shipment.cargo || {};


  const air =
    shipment.airFreight || {};


  const customs =
    shipment.customs || {};


  const transport =
    shipment.transport || {};


  const charges =
    shipment.charges || {};


  const description =
    this.parseDescription(
      cargo.description || ''
    );


  const customer =
    this.findOptionByLabel(
      this.customers,
      shipment.customerName || ''
    );


  const product =
    cargo.commodity ===
      'other'

      ? 'other'

      : this.findOptionByLabel(
          this.products,
          cargo.commodity || ''
        );


  const sourceValue =
    air.departureAirport ===
      'other'

      ? 'other'

      : this.findOptionByLabel(
          this.locations,
          air.departureAirport ||
          shipment.origin?.name ||
          shipment.origin?.city ||
          ''
        );


  const destinationValue =
    air.arrivalAirport ===
      'other'

      ? 'other'

      : this.findOptionByLabel(
          this.locations,
          air.arrivalAirport ||
          shipment.destination?.name ||
          shipment.destination?.city ||
          ''
        );


  const airlineValue =
    air.airline ===
      'other'

      ? 'other'

      : this.findOptionByLabel(
          this.airlines,
          air.airline || ''
        );


  const packageType =
    cargo.packageType ===
      'other'

      ? 'other'

      : this.findOptionByLabel(
          this.packingTypes,
          cargo.packageType || ''
        );


  const shipmentType =
    this.findOptionByLabel(
      this.shipmentTypes,
      description['Shipment Type'] || ''
    );


  const shipmentMode =
    this.findOptionByLabel(
      this.shipmentModes,
      description['Service Mode'] || ''
    );


  const category =
    this.findOptionByLabel(
      this.productCategories,
      description['Product Category'] || ''
    );


  const unit =
    this.findOptionByLabel(
      this.units,
      cargo.weightUnitOther ||
      cargo.weightUnit ||
      ''
    );


  const dimensions =
    this.parseDimensions(
      description['Dimensions']
    );


  const remarks =
    this.parseRemarks(
      shipment.remarks || ''
    );


  this.form = {

    ...this.emptyForm(),


    /* CUSTOMER */

    customer:
      customer ||
      (
        shipment.customerName
          ? 'other'
          : ''
      ),

    customerOther:
      customer
        ? ''
        : shipment.customerName || '',

    contactPerson:
      shipment.contactPerson || '',

    mobile:
      shipment.mobile || '',

    email:
      shipment.email || '',

    gstNumber:
      description['GST No'] || '',

    billingAddress:
      description['Billing Address'] || '',

    pickupAddress:
      shipment.origin?.address || '',


    /* SHIPMENT */

    shipmentId:
      shipment.shipmentNumber || '',

    bookingDate:
      this.dateInput(
        shipment.createdAt
      ) ||
      this.today(),

    shipmentDate:
      this.dateInput(
        shipment.shipmentDate
      ),


    shipmentType:
      shipmentType ||
      (
        description['Shipment Type']
          ? 'other'
          : ''
      ),

    shipmentTypeOther:
      shipmentType
        ? ''
        : description['Shipment Type'] || '',


    mode:
      shipmentMode ||
      (
        description['Service Mode']
          ? 'other'
          : ''
      ),

    modeOther:
      shipmentMode
        ? ''
        : description['Service Mode'] || '',


    priority:
      (
        description['Priority'] ||
        'normal'
      )
        .trim()
        .toLowerCase(),


    referenceNumber:
      shipment.customerReference || '',

    specialInstructions:
      description['Special Instructions'] || '',


    /* PRODUCT */

    product:
      product ||
      (
        cargo.commodity ||
        cargo.commodityOther
          ? 'other'
          : ''
      ),

    productOther:
      cargo.commodity === 'other'
        ? cargo.commodityOther || ''
        : (
            product
              ? ''
              : cargo.commodity || ''
          ),


    hsnCode:
      description['HSN Code'] || '',


    productCategory:
      category ||
      (
        description['Product Category']
          ? 'other'
          : ''
      ),

    productCategoryOther:
      category
        ? ''
        : description['Product Category'] || '',


    quantity:
      this.numberOrNull(
        this.numberFromText(
          description['Quantity']
        )
      ),


    unit:
      unit ||
      (
        cargo.weightUnit ||
        cargo.weightUnitOther
          ? 'other'
          : ''
      ),

    unitOther:
      unit
        ? ''
        : (
            cargo.weightUnitOther ||
            cargo.weightUnit ||
            ''
          ),


    packages:
      this.numberOrNull(
        cargo.packageCount
      ),


    grossWeight:
      this.numberOrNull(
        cargo.grossWeight
      ),


    chargeableWeight:
      this.numberOrNull(
        cargo.chargeableWeight
      ),


    length:
      dimensions.length,

    width:
      dimensions.width,

    height:
      dimensions.height,


    packingType:
      packageType ||
      (
        cargo.packageType ||
        cargo.packageTypeOther
          ? 'other'
          : ''
      ),

    packingTypeOther:
      cargo.packageType === 'other'
        ? cargo.packageTypeOther || ''
        : (
            packageType
              ? ''
              : cargo.packageType || ''
          ),


    /* ROUTE */

    source:
      sourceValue ||
      (
        air.departureAirport ||
        shipment.origin?.name ||
        shipment.origin?.city
          ? 'other'
          : ''
      ),

    sourceOther:
      air.departureAirport === 'other'
        ? air.departureAirportOther || ''
        : (
            sourceValue
              ? ''
              : (
                  air.departureAirport ||
                  shipment.origin?.name ||
                  shipment.origin?.city ||
                  ''
                )
          ),


    destination:
      destinationValue ||
      (
        air.arrivalAirport ||
        shipment.destination?.name ||
        shipment.destination?.city
          ? 'other'
          : ''
      ),

    destinationOther:
      air.arrivalAirport === 'other'
        ? air.arrivalAirportOther || ''
        : (
            destinationValue
              ? ''
              : (
                  air.arrivalAirport ||
                  shipment.destination?.name ||
                  shipment.destination?.city ||
                  ''
                )
          ),


    pickupDate:
      this.dateInput(
        transport.pickupDate
      ),


    expectedFlightDate:
      this.dateInput(
        shipment.estimatedDeparture ||
        air.departureDate
      ),


    deliveryDate:
      this.dateInput(
        transport.expectedDeliveryDate ||
        shipment.estimatedArrival ||
        air.arrivalDate
      ),


    transitDays:
      null,


    /* AIRLINE */

    airline:
      airlineValue ||
      (
        air.airline ||
        air.airlineOther
          ? 'other'
          : ''
      ),

    airlineOther:
      air.airline === 'other'
        ? air.airlineOther || ''
        : (
            airlineValue
              ? ''
              : air.airline || ''
          ),


    flightNumber:
      air.flightNumber || '',


    flightDate:
      this.dateInput(
        air.departureDate
      ),


    departureTime:
      description['Departure Time'] || '',

    arrivalTime:
      description['Arrival Time'] || '',


    awbNumber:
      air.awbNumber || '',


    airlineBookingReference:
      description['Airline Booking Ref'] ||
      shipment.trackingReference ||
      '',


    /* CHA */

    chaRequired:
      customs.chaRequired
        ? 'yes'
        : 'no',


    cha:
      customs.chaVendorId || '',


    chaOther:
      '',


    chaContact:
      description['CHA Contact'] || '',


    billOfEntryNumber:
      customs.billOfEntryNumber || '',


    shippingBillNumber:
      customs.shippingBillNumber || '',


    customsStatus:
      this.customsStatusFromBackend(
        customs.status
      ),


    customsStatusOther:
      customs.status === 'other'
        ? customs.statusOther || ''
        : '',


    /* TRANSPORT */

    transporter:
      transport.transporterId || '',


    transporterOther:
      '',


    driverName:
      description['Driver'] || '',


    driverMobile:
      description['Driver Mobile'] || '',


    vehicleNumber:
      description['Vehicle'] || '',


    lrNumber:
      description['LR Number'] || '',


    pickupTime:
      description['Pickup Time'] || '',


    deliveryTime:
      description['Delivery Time'] || '',


    /* CHARGES */

    airFreightRate:
      this.number(
        description['Air Freight Rate/Kg']
      ),


    freightAmount:
      this.number(
        charges.freightAmount
      ),


    /*
     * Backend currently stores these three UI fields
     * together as handlingCharge.
     *
     * During edit we keep the complete stored amount
     * visible instead of losing it.
     */
    fuelSurcharge:
      0,


    securityCharge:
      0,


    terminalHandlingCharge:
      this.number(
        charges.handlingCharge
      ),


    documentationCharge:
      this.number(
        charges.documentationCharge
      ),


    currency:
      this.currencyValue(
        charges.currency
      ),


    currencyOther:
      this.currencyOtherValue(
        charges.currency
      ),


    discount:
      this.number(
        description['Discount']
      ),


    gstRate:
      this.gstValue(
        description['GST Rate']
      ),


    gstRateOther:
      this.gstOtherValue(
        description['GST Rate']
      ),


    otherTax:
      this.extractOtherTax(
        charges.otherChargeDescription
      ),


    /* REMARKS */

    internalRemarks:
      remarks.internal,


    customerRemarks:
      remarks.customer

  };


  this.otherCharges =
    this.parseOtherCharges(
      charges.otherChargeDescription
    );


  /*
   * Master/dropdown API calls are asynchronous.
   * Reconcile IDs after the existing shipment has
   * already populated the form.
   */
  this.reconcileEditLookups(
    shipment
  );
}

  protected readonly shipmentTypes: SelectOption[] = [
    { label: 'Export', value: 'export' },
    { label: 'Import', value: 'import' },
    { label: 'Domestic', value: 'domestic' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly shipmentModes: SelectOption[] = [
    { label: 'Airport to Airport', value: 'airport-airport' },
    { label: 'Door to Airport', value: 'door-airport' },
    { label: 'Airport to Door', value: 'airport-door' },
    { label: 'Door to Door', value: 'door-door' },
    { label: 'Other', value: 'other' }
  ];

  protected products: SelectOption[] = [
    { label: 'Rice', value: 'rice' },
    { label: 'Wheat', value: 'wheat' },
    { label: 'Maize', value: 'maize' },
    { label: 'Vegetables', value: 'vegetables' },
    { label: 'General Cargo', value: 'general-cargo' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly productCategories: SelectOption[] = [
    { label: 'Agriculture', value: 'agriculture' },
    { label: 'Food Products', value: 'food-products' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Garments', value: 'garments' },
    { label: 'Machinery', value: 'machinery' },
    { label: 'General Cargo', value: 'general-cargo' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly units: SelectOption[] = [
    { label: 'Kg', value: 'kg' },
    { label: 'MT', value: 'mt' },
    { label: 'Pieces', value: 'pieces' },
    { label: 'Boxes', value: 'boxes' },
    { label: 'Cartons', value: 'cartons' },
    { label: 'Pallets', value: 'pallets' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly packingTypes: SelectOption[] = [
    { label: 'Carton', value: 'carton' },
    { label: 'Pallet', value: 'pallet' },
    { label: 'Wooden Box', value: 'wooden-box' },
    { label: 'Gunny Bag', value: 'gunny-bag' },
    { label: 'Plastic Bag', value: 'plastic-bag' },
    { label: 'Loose', value: 'loose' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly locations: SelectOption[] = [
    { label: 'Delhi', value: 'delhi' },
    { label: 'Mumbai', value: 'mumbai' },
    { label: 'Chennai', value: 'chennai' },
    { label: 'Kolkata', value: 'kolkata' },
    { label: 'Bengaluru', value: 'bengaluru' },
    { label: 'Hyderabad', value: 'hyderabad' },
    { label: 'Dubai', value: 'dubai' },
    { label: 'Singapore', value: 'singapore' },
    { label: 'London', value: 'london' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly airlines: SelectOption[] = [
    { label: 'Air India', value: 'air-india' },
    { label: 'Emirates', value: 'emirates' },
    { label: 'Qatar Airways Cargo', value: 'qatar' },
    { label: 'Etihad Cargo', value: 'etihad' },
    { label: 'Lufthansa Cargo', value: 'lufthansa' },
    { label: 'Other', value: 'other' }
  ];

  protected chaOptions: SelectOption[] = [
    { label: 'Opas CHA Services', value: 'opas-cha' },
    { label: 'Global Customs Solutions', value: 'global-customs' },
    { label: 'Fast Track CHA', value: 'fast-track-cha' },
    { label: 'Other', value: 'other' }
  ];

  protected transporters: SelectOption[] = [
    { label: 'Trans India Logistics', value: 'trans-india' },
    { label: 'Fast Move Transport', value: 'fast-move' },
    { label: 'National Roadways', value: 'national-roadways' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly customsStatuses: SelectOption[] = [
    { label: 'Not Started', value: 'not-started' },
    { label: 'Documents Pending', value: 'documents-pending' },
    { label: 'Under Clearance', value: 'under-clearance' },
    { label: 'Cleared', value: 'cleared' },
    { label: 'Hold', value: 'hold' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly gstRates: SelectOption[] = [
    { label: '0%', value: '0' },
    { label: '5%', value: '5' },
    { label: '12%', value: '12' },
    { label: '18%', value: '18' },
    { label: '28%', value: '28' },
    { label: 'Other', value: 'other' }
  ];

  protected readonly currencyOptions: SelectOption[] = [
    { label: 'INR - Indian Rupee', value: 'INR' },
    { label: 'USD - US Dollar', value: 'USD' },
    { label: 'AED - UAE Dirham', value: 'AED' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'GBP - British Pound', value: 'GBP' },
    { label: 'SAR - Saudi Riyal', value: 'SAR' },
    { label: 'SGD - Singapore Dollar', value: 'SGD' },
    { label: 'JPY - Japanese Yen', value: 'JPY' },
    { label: 'QAR - Qatari Riyal', value: 'QAR' },
    { label: 'OMR - Omani Rial', value: 'OMR' },
    { label: 'BHD - Bahraini Dinar', value: 'BHD' },
    { label: 'KWD - Kuwaiti Dinar', value: 'KWD' },
    { label: 'CNY - Chinese Yuan', value: 'CNY' },
    { label: 'Other', value: 'other' }
  ];

  protected form = this.emptyForm();

  protected otherCharges: OtherCharge[] = [];

  protected uploadedFiles: File[] = [];

  protected get subtotal(): number {
    return (
      this.number(this.form.freightAmount) +
      this.number(this.form.fuelSurcharge) +
      this.number(this.form.securityCharge) +
      this.number(this.form.terminalHandlingCharge) +
      this.number(this.form.documentationCharge) +
      this.otherCharges.reduce(
        (sum, charge) => sum + this.number(charge.amount),
        0
      )
    );
  }

  protected get taxableAmount(): number {
    return Math.max(
      0,
      this.subtotal - this.number(this.form.discount)
    );
  }

  protected get gstPercentage(): number {
    if (this.form.gstRate === 'other') {
      return this.number(this.form.gstRateOther);
    }

    return this.number(this.form.gstRate);
  }

  protected get gstAmount(): number {
    return this.taxableAmount * this.gstPercentage / 100;
  }

  protected get grandTotal(): number {
    return (
      this.taxableAmount +
      this.gstAmount +
      this.number(this.form.otherTax)
    );
  }

  protected addOtherCharge(): void {
    this.otherCharges.push({
      description: '',
      amount: 0
    });
  }

  protected removeOtherCharge(index: number): void {
    this.otherCharges.splice(index, 1);
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    const allowedTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png'
    ]);

    const selected = Array.from(input.files);
    const invalidFile = selected.find(
      (file) => !allowedTypes.has(file.type)
    );

    if (invalidFile) {
      this.errorMessage.set(
        `${invalidFile.name}: only PDF, JPG, JPEG and PNG files are allowed.`
      );
      input.value = '';
      return;
    }

    this.errorMessage.set('');

    this.uploadedFiles = [
      ...this.uploadedFiles,
      ...selected
    ];

    input.value = '';
  }

  protected removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  protected saveDraft(): void {
    this.persistShipment('draft');
  }

  protected resetForm(): void {

    if (
      !window.confirm(
        this.isEditMode()
          ? 'Reload the saved Air Cargo shipment details?'
          : 'Clear all Air Cargo shipment details?'
      )
    ) {
  
      return;
    }
  
  
    const editId =
      this.editingShipmentId();
  
  
    if (
      editId
    ) {
  
      this.loadShipmentForEdit(
        editId
      );
  
      return;
    }
  
  
    this.form =
      this.emptyForm();
  
    this.otherCharges =
      [];
  
    this.uploadedFiles =
      [];
  
    this.message.set(
      ''
    );
  
    this.errorMessage.set(
      ''
    );
  }
  protected submitShipment(): void {
    this.persistShipment('booking_created');
  }

  protected generateAwb(): void {
    if (this.form.awbNumber.trim()) {
      this.message.set(
        `AWB ${this.form.awbNumber.trim()} is already entered.`
      );
      return;
    }

    this.errorMessage.set(
      'AWB generation requires an airline/AWB backend endpoint. Enter the AWB received from the airline for now.'
    );
  }

  protected generateInvoice(): void {
    this.errorMessage.set('');
    void this.router.navigate(['/logistics/invoices/new'], {
      queryParams: {
        shipmentNumber:
          this.form.shipmentId || undefined
      }
    });
  }

  protected printBooking(): void {
    window.print();
  }

  protected sendToCustomer(): void {
    const email = this.form.email.trim();

    if (!email) {
      this.errorMessage.set(
        'Enter the customer email before sending the booking.'
      );
      return;
    }

    this.errorMessage.set(
      'Customer email sending will be enabled after the Logistics notification/email API is connected.'
    );
  }

  protected updateStatus(): void {
    if (
      !this.form.shipmentId ||
      this.form.shipmentId.startsWith('AC-TEMP-')
    ) {
      this.errorMessage.set(
        'Save the shipment first before updating its status.'
      );
      return;
    }

    void this.router.navigate(['/logistics/tracking'], {
      queryParams: {
        shipmentNumber: this.form.shipmentId
      }
    });
  }

  protected formatCurrency(value: number): string {
    const currency = this.selectedCurrency();

    return new Intl.NumberFormat('en-IN', {
      style: currency === 'INR' ? 'currency' : 'decimal',
      currency: currency === 'INR' ? 'INR' : undefined,
      minimumFractionDigits: 2
    }).format(value || 0).replace(/^/, currency === 'INR' ? '' : `${currency} `);
  }

  private persistShipment(
    status: 'draft' | 'booking_created'
  ): void {
    this.message.set('');
    this.errorMessage.set('');

    const validationError =
      this.validateForm(status);

    if (validationError) {
      this.errorMessage.set(validationError);
      window.alert(validationError);
      return;
    }

    const payload =
      this.buildApiPayload(status);

    this.isSaving.set(true);

    const editId =
  this.editingShipmentId();


const request =
  editId

    ? this.api.patch<LogisticsShipmentResponse>(
        `/logistics/shipments/${editId}`,
        payload
      )

    : this.api.post<LogisticsShipmentResponse>(
        '/logistics/shipments',
        payload
      );


request

  .pipe(
    finalize(() =>
      this.isSaving.set(
        false
      )
    )
  )

  .subscribe({

    next: (
      shipment
    ) => {

      const shipmentNumber =
        shipment?.shipmentNumber ||
        this.form.shipmentId;


      this.form.shipmentId =
        shipmentNumber ||
        this.form.shipmentId;


      const successText =
        editId

          ? `Air Cargo shipment ${shipmentNumber || ''} updated successfully.`

          : status === 'draft'

            ? `Draft ${shipmentNumber || ''} saved successfully.`

            : `Air Cargo shipment ${shipmentNumber || ''} created successfully.`;


      this.message.set(
        successText
      );

      this.errorMessage.set(
        ''
      );


      window.alert(
        successText
      );


      if (
        status ===
          'booking_created' ||
        editId
      ) {

        void this.router.navigate(
          [
            '/logistics/air-cargo'
          ],
          {
            queryParams: {

              updated:
                editId
                  ? shipmentNumber ||
                    undefined
                  : undefined,

              created:
                !editId
                  ? shipmentNumber ||
                    undefined
                  : undefined

            }
          }
        );
      }
    },


    error: (
      error: {
        error?: {
          message?: string;
        };
        message?: string;
      }
    ) => {

      const message =
        error?.error
          ?.message ||

        error
          ?.message ||

        (
          editId

            ? 'Unable to update Air Cargo shipment.'

            : 'Unable to save Air Cargo shipment.'
        );


      this.errorMessage.set(
        message
      );


      window.alert(
        message
      );
    }

  });
}

  protected onCustomerSelected(): void {
    const customer = this.customerRows().find(
      (item) => this.customerValue(item) === this.form.customer
    );

    if (!customer) {
      if (!this.form.customer || this.form.customer === 'other') {
        this.clearCustomerFields();
      }
      return;
    }

    this.form.contactPerson = customer.contactPerson || this.form.contactPerson;
    this.form.mobile = customer.mobile || this.form.mobile;
    this.form.email = customer.email || this.form.email;
    this.form.gstNumber = customer.gstNumber || this.form.gstNumber;
    this.form.billingAddress = this.formatAddress(customer.billingAddress) || this.form.billingAddress;
    this.form.pickupAddress = this.formatAddress(customer.pickupAddress) || this.form.pickupAddress;
  }

  protected onProductServiceSelected(): void {
    const item = this.productRows().find((row) => row._id === this.form.product);

    if (!item) {
      if (!this.form.product) {
        this.form.hsnCode = '';
        this.form.productCategory = '';
        this.form.productCategoryOther = '';
        this.form.unit = '';
        this.form.unitOther = '';
        this.form.airFreightRate = 0;
        this.form.gstRate = '';
        this.form.gstRateOther = '';
      }
      return;
    }

    this.form.hsnCode = item.hsnSacCode || this.form.hsnCode;
    this.form.productCategory = item.category || this.form.productCategory;
    this.form.productCategoryOther = item.categoryOther || this.form.productCategoryOther;
    this.form.unit = item.unit || this.form.unit;
    this.form.unitOther = item.unitOther || this.form.unitOther;
    this.form.airFreightRate = item.salePrice ?? this.form.airFreightRate;

    if (item.taxPercent !== undefined && item.taxPercent !== null) {
      const gst = String(item.taxPercent);
      this.form.gstRate = this.gstRates.some((rate) => rate.value === gst) ? gst : 'other';
      this.form.gstRateOther = this.form.gstRate === 'other' ? gst : '';
    }
  }

  protected onChaRequiredChanged(): void {
    if (this.form.chaRequired === 'no') {
      this.form.cha = '';
      this.form.chaOther = '';
      this.form.chaContact = '';
      this.form.customsStatus = '';
      this.form.customsStatusOther = '';
      this.form.billOfEntryNumber = '';
      this.form.shippingBillNumber = '';
    }
  }

  protected onChaSelected(): void {
    const cha = this.chaRows().find((row) => row._id === this.form.cha);

    if (!cha) {
      if (!this.form.cha) {
        this.form.chaContact = '';
      }
      return;
    }

    this.form.chaContact = cha.contactPerson || this.form.chaContact;
  }

  protected onTransporterSelected(): void {
    const transporter = this.transporterRows().find((row) => row._id === this.form.transporter);

    if (!transporter) {
      if (!this.form.transporter) {
        this.form.driverName = '';
        this.form.driverMobile = '';
        this.form.vehicleNumber = '';
      }
      return;
    }

    this.form.driverName = transporter.defaultDriverName || this.form.driverName;
    this.form.driverMobile = transporter.defaultDriverMobile || this.form.driverMobile;
    this.form.vehicleNumber = transporter.defaultVehicleNumber || this.form.vehicleNumber;
  }

  private loadCustomers(): void {
    this.api
      .get<LogisticsListResponse<CustomerApiRow>>('/logistics/customers', {
        page: 1,
        limit: 100,
        status: 'active',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      .pipe(finalize(() => this.completeEditLookup()))
      .subscribe({
        next: (response) => {
          const rows = this.extractRows(response);
          this.customerRows.set(rows);

          this.customers = [
            ...rows.map((customer) => ({
              label: customer.customerName || customer.companyName || customer.customerCode || 'Customer',
              value: this.customerValue(customer)
            })),
            { label: 'Other', value: 'other' }
          ];
          this.reconcileEditLookups();
        },
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load Logistics customers.')
      });
  }
  private loadChaVendors(): void {
    this.api
      .get<LogisticsListResponse<VendorApiRow>>('/logistics/cha/masters', {
        page: 1,
        limit: 100,
        status: 'active',
        vendorType: 'cha',
        sortBy: 'vendorName',
        sortOrder: 'asc'
      })
      .pipe(finalize(() => this.completeEditLookup()))
      .subscribe({
        next: (response) => {
          const rows = this.extractRows(response);
          this.chaRows.set(rows);

          if (rows.length) {
            this.chaOptions = [
              ...rows.filter((row) => row._id).map((row) => ({
                label: row.vendorName || row.companyName || row.vendorCode || 'CHA',
                value: row._id!
              })),
              { label: 'Other', value: 'other' }
            ];
            this.reconcileEditLookups();
          }
        },
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load CHA options.')
      });
  }

  private loadTransporters(): void {
    this.api
      .get<LogisticsListResponse<TransporterApiRow>>('/logistics/transporters', {
        page: 1,
        limit: 100,
        status: 'active',
        sortBy: 'transporterName',
        sortOrder: 'asc'
      })
      .pipe(finalize(() => this.completeEditLookup()))
      .subscribe({
        next: (response) => {
          const rows = this.extractRows(response);
          this.transporterRows.set(rows);

          if (rows.length) {
            this.transporters = [
              ...rows.filter((row) => row._id).map((row) => ({
                label: row.transporterName || row.transporterCode || 'Transporter',
                value: row._id!
              })),
              { label: 'Other', value: 'other' }
            ];
            this.reconcileEditLookups();
          }
        },
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load transporter options.')
      });
  }

  private loadProductsServices(): void {
    this.api
      .get<LogisticsListResponse<ProductServiceApiRow>>('/logistics/products-services', {
        page: 1,
        limit: 100,
        status: 'active',
        sortBy: 'name',
        sortOrder: 'asc'
      })
      .pipe(finalize(() => this.completeEditLookup()))
      .subscribe({
        next: (response) => {
          const rows = this.extractRows(response);
          this.productRows.set(rows);

          if (rows.length) {
            this.products = [
              ...rows.filter((row) => row._id).map((row) => ({
                label: row.name || row.itemCode || 'Product / Service',
                value: row._id!
              })),
              { label: 'Other', value: 'other' }
            ];
            this.reconcileEditLookups();
          }
        },
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load product/service options.')
      });
  }

  private extractRows<T>(
    response: LogisticsListResponse<T> | T[] | null | undefined
  ): T[] {
    if (Array.isArray(response)) {
      return response;
    }

    const data = response?.data;

    if (Array.isArray(data)) {
      return data;
    }

    return data?.data || data?.records || data?.customers || data?.vendors || data?.transporters || data?.productsServices || data?.services || data?.items || data?.cha || data?.agents || response?.records || response?.customers || response?.vendors || response?.transporters || response?.productsServices || response?.services || response?.items || response?.cha || response?.agents || [];
  }

  private completeEditLookup(): void {
    if (!this.isEditMode()) return;
    this.editLookupLoadsRemaining = Math.max(0, this.editLookupLoadsRemaining - 1);
    this.finishEditLoadingIfReady();
  }

  private finishEditLoadingIfReady(): void {
    if (this.editShipmentReady && this.editLookupLoadsRemaining === 0) {
      this.reconcileEditLookups();
      this.isLoadingEdit.set(false);
    }
  }
  private customerValue(customer: CustomerApiRow): string {
    return customer._id || '';
  }

  private formatAddress(address: CustomerApiRow['billingAddress']): string {
    if (!address) return '';

    return [
      address.addressLine1,
      address.city,
      address.state,
      address.country,
      address.pincode
    ]
      .filter(Boolean)
      .join(', ');
  }


  private clearCustomerFields(): void {
    this.form.contactPerson = '';
    this.form.mobile = '';
    this.form.email = '';
    this.form.gstNumber = '';
    this.form.billingAddress = '';
    this.form.pickupAddress = '';
  }
  private slug(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'customer';
  }
  private validateForm(
    status: 'draft' | 'booking_created'
  ): string {
    /*
     * A draft intentionally has lighter validation,
     * but Customer Name + Remarks are still required by
     * the current backend shipment schema.
     */
    const customer =
      this.selectedLabel(
        this.customers,
        this.form.customer,
        this.form.customerOther
      );

    if (!customer) {
      return 'Customer Name is required.';
    }

    const remarks =
      this.combinedRemarks();

    if (!remarks) {
      return 'Remarks are compulsory. Enter Internal Remarks or Customer Remarks.';
    }

    if (this.form.customer === 'other' && !this.form.customerOther.trim()) {
      return 'Enter Customer Name because Other is selected.';
    }

    if (status === 'draft') {
      return '';
    }

    if (!this.form.shipmentDate) {
      return 'Shipment Date is required.';
    }

    if (this.form.currency === 'other' && !/^[A-Za-z]{3}$/.test(this.form.currencyOther.trim())) {
      return 'Enter a valid 3-letter Currency Code.';
    }

    const requiredTextFields: Array<
      [string, string]
    > = [
      [this.form.contactPerson, 'Contact Person'],
      [this.form.mobile, 'Mobile Number'],
      [this.form.email, 'Email'],
      [this.form.billingAddress, 'Billing Address'],
      [this.form.pickupAddress, 'Pickup Address'],
      [this.form.shipmentType, 'Shipment Type'],
      [this.form.mode, 'Mode'],
      [this.form.product, 'Product Name'],
      [this.form.productCategory, 'Product Category'],
      [this.form.unit, 'Unit'],
      [this.form.source, 'Source Airport / City'],
      [this.form.destination, 'Destination Airport / City'],
      [this.form.airline, 'Airline Name'],
      [this.form.flightNumber, 'Flight Number'],
      [this.form.awbNumber, 'AWB Number'],
      [this.form.transporter, 'Transporter Name'],
      [this.form.driverName, 'Driver Name'],
      [this.form.driverMobile, 'Driver Mobile'],
      [this.form.vehicleNumber, 'Vehicle Number'],
      [this.form.gstRate, 'GST']
    ];

    for (const [value, label] of requiredTextFields) {
      if (!String(value || '').trim()) {
        return `${label} is required.`;
      }
    }

    if (!this.number(this.form.quantity)) {
      return 'Quantity is required.';
    }

    if (!this.number(this.form.grossWeight)) {
      return 'Gross Weight is required.';
    }

    if (!this.number(this.form.chargeableWeight)) {
      return 'Chargeable Weight is required.';
    }

    const otherChecks: Array<
      [boolean, string, string]
    > = [
      [
        this.form.shipmentType === 'other',
        this.form.shipmentTypeOther,
        'Shipment Type'
      ],
      [
        this.form.mode === 'other',
        this.form.modeOther,
        'Shipment Mode'
      ],
      [
        this.form.product === 'other',
        this.form.productOther,
        'Product Name'
      ],
      [
        this.form.productCategory === 'other',
        this.form.productCategoryOther,
        'Product Category'
      ],
      [
        this.form.unit === 'other',
        this.form.unitOther,
        'Unit'
      ],
      [
        this.form.packingType === 'other',
        this.form.packingTypeOther,
        'Packing Type'
      ],
      [
        this.form.source === 'other',
        this.form.sourceOther,
        'Source'
      ],
      [
        this.form.destination === 'other',
        this.form.destinationOther,
        'Destination'
      ],
      [
        this.form.airline === 'other',
        this.form.airlineOther,
        'Airline'
      ],
      [
        this.form.chaRequired === 'yes' &&
          this.form.cha === 'other',
        this.form.chaOther,
        'CHA Name'
      ],
      [
        this.form.customsStatus === 'other',
        this.form.customsStatusOther,
        'Customs Status'
      ],
      [
        this.form.transporter === 'other',
        this.form.transporterOther,
        'Transporter Name'
      ],
      [
        this.form.gstRate === 'other',
        String(this.form.gstRateOther ?? ''),
        'GST Percentage'
      ]
    ];

    for (
      const [
        required,
        value,
        label
      ] of otherChecks
    ) {
      if (
        required &&
        !String(value || '').trim()
      ) {
        return `Enter ${label} because Other is selected.`;
      }
    }

    return '';
  }

  private buildApiPayload(
    status: 'draft' | 'booking_created'
  ): CreateLogisticsShipmentPayload {
    const selectedCustomer = this.customerRows().find((row) => this.customerValue(row) === this.form.customer);
    const selectedCha = this.chaRows().find((row) => row._id === this.form.cha);
    const selectedTransporter = this.transporterRows().find((row) => row._id === this.form.transporter);

    const customerName =
      this.selectedLabel(
        this.customers,
        this.form.customer,
        this.form.customerOther
      );

    const sourceName =
      this.selectedLabel(
        this.locations,
        this.form.source,
        this.form.sourceOther
      );

    const destinationName =
      this.selectedLabel(
        this.locations,
        this.form.destination,
        this.form.destinationOther
      );

    const product =
      this.selectedLabel(
        this.products,
        this.form.product,
        this.form.productOther
      );

    const packingType =
      this.selectedLabel(
        this.packingTypes,
        this.form.packingType,
        this.form.packingTypeOther
      );

    const airline =
      this.selectedLabel(
        this.airlines,
        this.form.airline,
        this.form.airlineOther
      );

    const additionalChargeAmount =
      this.otherCharges.reduce(
        (sum, charge) =>
          sum +
          this.number(charge.amount),
        0
      );

    const operationalCharge =
      this.number(this.form.fuelSurcharge) +
      this.number(this.form.securityCharge) +
      this.number(this.form.terminalHandlingCharge);

    const transportCharge =
      0;

    const otherChargeTotal = additionalChargeAmount;

    const otherChargeDescription =
      this.otherCharges
        .filter(
          (charge) =>
            charge.description.trim() ||
            this.number(charge.amount)
        )
        .map(
          (charge) =>
            `${charge.description.trim() || 'Other Charge'}: ${this.number(charge.amount)}`
        )
        .join('; ');

    return {
      shipmentMode:
        'air_cargo',

      shipmentDate:
        this.dateOrNull(
          this.form.shipmentDate
        ),

      customerId:
        selectedCustomer?._id || null,

      customerName,

      contactPerson:
        this.form.contactPerson.trim(),

      mobile:
        this.form.mobile.trim(),

      email:
        this.form.email.trim(),

      customerReference:
        this.form.referenceNumber.trim(),

      origin: {
        name:
          sourceName,

        address:
          this.form.pickupAddress.trim(),

        city:
          sourceName,

        country:
          ''
      },

      destination: {
        name:
          destinationName,

        city:
          destinationName,

        country:
          ''
      },

      cargo: {
        commodity:
          this.form.product === 'other'
            ? 'other'
            : this.form.product,

        commodityOther:
          this.form.product === 'other'
            ? this.form.productOther.trim()
            : '',

        description:
          this.cargoDescription(),

        packageCount:
          this.number(this.form.packages),

        packageType:
          this.form.packingType === 'other'
            ? 'other'
            : packingType,

        packageTypeOther:
          this.form.packingType === 'other'
            ? this.form.packingTypeOther.trim()
            : '',

        grossWeight:
          this.number(this.form.grossWeight),

        chargeableWeight:
          this.number(this.form.chargeableWeight),

        weightUnit:
          this.backendWeightUnit(),

        weightUnitOther:
          this.backendWeightUnit() === 'other'
            ? this.selectedLabel(
                this.units,
                this.form.unit,
                this.form.unitOther
              )
            : ''
      },

      airFreight: {
        airline:
          this.form.airline === 'other'
            ? 'other'
            : airline,

        airlineOther:
          this.form.airline === 'other'
            ? this.form.airlineOther.trim()
            : '',

        awbNumber:
          this.form.awbNumber.trim(),

        flightNumber:
          this.form.flightNumber.trim(),

        departureAirport:
          this.form.source === 'other'
            ? 'other'
            : sourceName,

        departureAirportOther:
          this.form.source === 'other'
            ? this.form.sourceOther.trim()
            : '',

        arrivalAirport:
          this.form.destination === 'other'
            ? 'other'
            : destinationName,

        arrivalAirportOther:
          this.form.destination === 'other'
            ? this.form.destinationOther.trim()
            : '',

        departureDate:
          this.dateOrNull(
            this.form.flightDate ||
            this.form.expectedFlightDate
          ),

        arrivalDate:
          this.dateOrNull(
            this.form.deliveryDate
          )
      },

      customs: {
        chaRequired:
          this.form.chaRequired === 'yes',

        chaVendorId:
          selectedCha?._id || null,

        customsLocation:
          sourceName,

        customsLocationOther:
          '',

        shippingBillNumber:
          this.form.shippingBillNumber.trim(),

        billOfEntryNumber:
          this.form.billOfEntryNumber.trim(),

        status:
          this.mapCustomsStatus(),

        statusOther:
          this.form.customsStatus === 'other'
            ? this.form.customsStatusOther.trim()
            : ''
      },

      transport: {
        required:
          Boolean(
            this.form.transporter ||
            this.form.driverName ||
            this.form.vehicleNumber
          ),

        transporterId:
          selectedTransporter?._id || null,

        pickupDate:
          this.dateOrNull(
            this.form.pickupDate
          ),

        expectedDeliveryDate:
          this.dateOrNull(
            this.form.deliveryDate
          )
      },

      charges: {
        freightAmount:
          this.number(this.form.freightAmount),

        chaCharge:
          0,

        documentationCharge:
          this.number(
            this.form.documentationCharge
          ),

        transportationCharge:
          transportCharge,

        warehouseCharge:
          0,

        handlingCharge:
          operationalCharge,

        insuranceCharge:
          0,

        otherCharge:
          otherChargeTotal,

        subtotal: this.subtotal,
        discount: this.number(this.form.discount),
        taxableAmount: this.taxableAmount,
        gstRate: this.gstPercentage,
        gstAmount: this.gstAmount,
        otherTax: this.number(this.form.otherTax),
        totalAmount: this.grandTotal,

        otherChargeDescription:
          otherChargeDescription ||
          (
            this.number(this.form.otherTax)
              ? `Other tax/charges: ${this.number(this.form.otherTax)}`
              : ''
          ),

        currency:
          this.selectedCurrency()
      },

      currentLocation:
        sourceName,

      trackingReference:
        this.form.awbNumber.trim() ||
        this.form.airlineBookingReference.trim(),

      estimatedDeparture:
        this.dateOrNull(
          this.form.expectedFlightDate ||
          this.form.flightDate
        ),

      estimatedArrival:
        this.dateOrNull(
          this.form.deliveryDate
        ),

      status,

      remarks:
        this.combinedRemarks()
    };
  }

  private cargoDescription(): string {
    const category =
      this.selectedLabel(
        this.productCategories,
        this.form.productCategory,
        this.form.productCategoryOther
      );

    const unit =
      this.selectedLabel(
        this.units,
        this.form.unit,
        this.form.unitOther
      );

    const shipmentType =
      this.selectedLabel(
        this.shipmentTypes,
        this.form.shipmentType,
        this.form.shipmentTypeOther
      );

    const shipmentMode =
      this.selectedLabel(
        this.shipmentModes,
        this.form.mode,
        this.form.modeOther
      );

    const dimension =
      [
        this.form.length,
        this.form.width,
        this.form.height
      ].some(
        (value) =>
          this.number(value)
      )
        ? `${this.number(this.form.length)} -> ${this.number(this.form.width)} -> ${this.number(this.form.height)} cm`
        : '';

    const lines = [
      `Shipment Type: ${shipmentType || '-'}`,
      `Service Mode: ${shipmentMode || '-'}`,
      `Priority: ${this.form.priority || '-'}`,
      `Product Category: ${category || '-'}`,
      `HSN Code: ${this.form.hsnCode.trim() || '-'}`,
      `Quantity: ${this.number(this.form.quantity)} ${unit || ''}`.trim(),
      `Dimensions: ${dimension || '-'}`,
      `GST No: ${this.form.gstNumber.trim() || '-'}`,
      `Billing Address: ${this.form.billingAddress.trim() || '-'}`,
      `Air Freight Rate/Kg: ${this.number(this.form.airFreightRate)}`,
      `GST Rate: ${this.gstPercentage}%`,
      `Discount: ${this.number(this.form.discount)}`,
      `Calculated GST: ${this.gstAmount}`,
      `Calculated Grand Total: ${this.grandTotal}`,
      `Special Instructions: ${this.form.specialInstructions.trim() || '-'}`,
      `CHA: ${this.selectedLabel(this.chaOptions, this.form.cha, this.form.chaOther) || '-'}`,
      `CHA Contact: ${this.form.chaContact.trim() || '-'}`,
      `Transporter: ${this.selectedLabel(this.transporters, this.form.transporter, this.form.transporterOther) || '-'}`,
      `Driver: ${this.form.driverName.trim() || '-'}`,
      `Driver Mobile: ${this.form.driverMobile.trim() || '-'}`,
      `Vehicle: ${this.form.vehicleNumber.trim() || '-'}`,
      `LR Number: ${this.form.lrNumber.trim() || '-'}`,
      `Pickup Time: ${this.form.pickupTime || '-'}`,
      `Delivery Time: ${this.form.deliveryTime || '-'}`,
      `Departure Time: ${this.form.departureTime || '-'}`,
      `Arrival Time: ${this.form.arrivalTime || '-'}`,
      `Airline Booking Ref: ${this.form.airlineBookingReference.trim() || '-'}`,
      `Selected Documents: ${
        this.uploadedFiles.length
          ? this.uploadedFiles.map((file) => file.name).join(', ')
          : 'None'
      }`
    ];

    return lines.join('\n');
  }

  private combinedRemarks(): string {
    const internal =
      this.form.internalRemarks.trim();

    const customer =
      this.form.customerRemarks.trim();

    const parts: string[] = [];

    if (internal) {
      parts.push(
        `Internal Remarks: ${internal}`
      );
    }

    if (customer) {
      parts.push(
        `Customer Remarks: ${customer}`
      );
    }

    return parts.join('\n');
  }

  private selectedLabel(
    options: SelectOption[],
    value: string,
    otherValue = ''
  ): string {
    if (value === 'other') {
      return otherValue.trim();
    }

    return (
      options.find(
        (option) =>
          option.value === value
      )?.label ||
      value ||
      ''
    ).trim();
  }

  private mapCustomsStatus():
    | 'not_required'
    | 'documents_pending'
    | 'filed'
    | 'assessment'
    | 'examination'
    | 'duty_pending'
    | 'cleared'
    | 'hold'
    | 'other' {
    switch (
      this.form.customsStatus
    ) {
      case 'documents-pending':
        return 'documents_pending';

      case 'under-clearance':
        return 'assessment';

      case 'cleared':
        return 'cleared';

      case 'hold':
        return 'hold';

      case 'other':
        return 'other';

      case 'not-started':
      case '':
      default:
        return this.form.chaRequired === 'yes'
          ? 'documents_pending'
          : 'not_required';
    }
  }

  private backendWeightUnit():
    | 'kg'
    | 'mt'
    | 'ton'
    | 'lb'
    | 'other' {
    switch (this.form.unit) {
      case 'kg':
        return 'kg';

      case 'mt':
        return 'mt';

      default:
        return 'other';
    }
  }

  private dateOrNull(
    value: string
  ): string | null {
    return value?.trim()
      ? value.trim()
      : null;
  }

  /* ==========================================================
   EDIT HELPERS
========================================================== */

private findOptionByLabel(
  options: SelectOption[],
  value: string
): string {

  const normalized =
    String(
      value || ''
    )
      .trim()
      .toLowerCase();


  if (!normalized) {
    return '';
  }


  return (
    options.find(
      option =>
        option.value
          .trim()
          .toLowerCase() ===
          normalized ||

        option.label
          .trim()
          .toLowerCase() ===
          normalized
    )?.value ||
    ''
  );
}


private parseDescription(
  description: string
): Record<string, string> {

  const result:
    Record<string, string> = {};


  String(
    description || ''
  )
    .split(/\r?\n/)
    .forEach(
      line => {

        const index =
          line.indexOf(':');


        if (
          index <= 0
        ) {

          return;
        }


        const key =
          line
            .slice(
              0,
              index
            )
            .trim();


        const value =
          line
            .slice(
              index + 1
            )
            .trim();


        if (
          key
        ) {

          result[key] =
            value === '-'
              ? ''
              : value;
        }
      }
    );


  return result;
}


private parseDimensions(
  value?: string
): {
  length: number | null;
  width: number | null;
  height: number | null;
} {

  const values =
    String(
      value || ''
    )
      .replace(
        /cm/gi,
        ''
      )
      .split(
        /\s*(?:->|x|×)\s*/i
      )
      .map(
        item =>
          this.numberOrNull(
            item
          )
      );


  return {

    length:
      values[0] ?? null,

    width:
      values[1] ?? null,

    height:
      values[2] ?? null

  };
}


private parseRemarks(
  remarks: string
): {
  internal: string;
  customer: string;
} {

  const text =
    String(
      remarks || ''
    );


  const internalMatch =
    text.match(
      /Internal Remarks:\s*([\s\S]*?)(?=\nCustomer Remarks:|$)/i
    );


  const customerMatch =
    text.match(
      /Customer Remarks:\s*([\s\S]*)$/i
    );


  if (
    internalMatch ||
    customerMatch
  ) {

    return {

      internal:
        internalMatch?.[1]
          ?.trim() || '',

      customer:
        customerMatch?.[1]
          ?.trim() || ''

    };
  }


  return {
    internal:
      text.trim(),

    customer:
      ''
  };
}


private customsStatusFromBackend(
  status?: string
): string {

  switch (
    status
  ) {

    case 'documents_pending':
      return 'documents-pending';

    case 'filed':
    case 'assessment':
    case 'examination':
    case 'duty_pending':
      return 'under-clearance';

    case 'cleared':
      return 'cleared';

    case 'hold':
      return 'hold';

    case 'other':
      return 'other';

    case 'not_required':
    default:
      return 'not-started';
  }
}


private currencyValue(
  currency?: string
): string {

  const value =
    String(
      currency ||
      'INR'
    )
      .trim()
      .toUpperCase();


  return this.currencyOptions
    .some(
      option =>
        option.value ===
        value
    )

    ? value

    : 'other';
}


private currencyOtherValue(
  currency?: string
): string {

  const value =
    String(
      currency || ''
    )
      .trim()
      .toUpperCase();


  return this.currencyOptions
    .some(
      option =>
        option.value ===
        value
    )

    ? ''

    : value;
}


private gstValue(
  value?: string
): string {

  const numeric =
    String(
      value || ''
    )
      .replace(
        '%',
        ''
      )
      .trim();


  if (
    !numeric
  ) {

    return '';
  }


  return this.gstRates.some(
    rate =>
      rate.value ===
      numeric
  )
    ? numeric
    : 'other';
}


private gstOtherValue(
  value?: string
): string {

  const numeric =
    String(
      value || ''
    )
      .replace(
        '%',
        ''
      )
      .trim();


  return this.gstRates.some(
    rate =>
      rate.value ===
      numeric
  )
    ? ''
    : numeric;
}


private numberFromText(
  value?: string
): number {

  const match =
    String(
      value || ''
    )
      .match(
        /-?\d+(?:\.\d+)?/
      );


  return match
    ? this.number(
        match[0]
      )
    : 0;
}


private numberOrNull(
  value: unknown
): number | null {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return null;
  }


  const parsed =
    Number(
      value
    );


  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


private dateInput(
  value?: string | null
): string {

  if (
    !value
  ) {

    return '';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(
      value
    )
      .slice(
        0,
        10
      );
  }


  return date
    .toISOString()
    .slice(
      0,
      10
    );
}


private extractOtherTax(
  description?: string
): number {

  const match =
    String(
      description || ''
    )
      .match(
        /Other tax\/charges:\s*(-?\d+(?:\.\d+)?)/i
      );


  return match
    ? this.number(
        match[1]
      )
    : 0;
}


private parseOtherCharges(
  description?: string
): OtherCharge[] {

  return String(
    description || ''
  )
    .split(';')
    .map(
      item =>
        item.trim()
    )
    .filter(
      item =>
        Boolean(
          item
        ) &&
        !/^Other tax\/charges:/i
          .test(
            item
          )
    )
    .map(
      item => {

        const separator =
          item.lastIndexOf(
            ':'
          );


        if (
          separator === -1
        ) {

          return {
            description:
              item,
            amount:
              0
          };
        }


        return {

          description:
            item
              .slice(
                0,
                separator
              )
              .trim(),

          amount:
            this.number(
              item
                .slice(
                  separator + 1
                )
                .trim()
            )

        };
      }
    );
}


private reconcileEditLookups(
  shipment?: LogisticsShipmentResponse
): void {

  if (
    !this.isEditMode()
  ) {

    return;
  }


  /*
   * CUSTOMER
   */
  if (
    shipment?.customerId &&
    this.customerRows()
      .some(
        row =>
          row._id ===
          shipment.customerId
      )
  ) {

    this.form.customer =
      shipment.customerId;

    this.form.customerOther =
      '';
  }

  else if (
    this.form.customer === 'other' &&
    this.form.customerOther
  ) {

    const value =
      this.findOptionByLabel(
        this.customers,
        this.form.customerOther
      );


    if (
      value
    ) {

      this.form.customer =
        value;

      this.form.customerOther =
        '';
    }
  }


  /*
   * CHA
   */
  if (
    shipment?.customs
      ?.chaVendorId &&
    this.chaRows()
      .some(
        row =>
          row._id ===
          shipment.customs
            ?.chaVendorId
      )
  ) {

    this.form.cha =
      shipment.customs
        .chaVendorId;
  }


  /*
   * TRANSPORTER
   */
  if (
    shipment?.transport
      ?.transporterId &&
    this.transporterRows()
      .some(
        row =>
          row._id ===
          shipment.transport
            ?.transporterId
      )
  ) {

    this.form.transporter =
      shipment.transport
        .transporterId;
  }


  /*
   * PRODUCT
   */
  const productId =
    this.productRows()
      .find(
        row =>
          (
            row.name ||
            row.itemCode ||
            ''
          )
            .trim()
            .toLowerCase() ===
          (
            shipment?.cargo
              ?.commodityOther ||
            shipment?.cargo
              ?.commodity ||
            this.form.productOther ||
            ''
          )
            .trim()
            .toLowerCase()
      )
      ?._id;


  if (
    productId
  ) {

    this.form.product =
      productId;

    this.form.productOther =
      '';
  }
}

  private emptyForm() {
    return {
      customer: '',
      customerOther: '',
      contactPerson: '',
      mobile: '',
      email: '',
      gstNumber: '',
      billingAddress: '',
      pickupAddress: '',

      shipmentId:
        `AC-TEMP-${Date.now()}`,

      bookingDate:
        this.today(),

      shipmentDate:
        '',

      shipmentType: '',
      shipmentTypeOther: '',

      mode: '',
      modeOther: '',

      priority:
        'normal',

      referenceNumber: '',
      specialInstructions: '',

      product: '',
      productOther: '',

      hsnCode: '',

      productCategory: '',
      productCategoryOther: '',

      quantity:
        null as number | null,

      unit: '',
      unitOther: '',

      packages:
        null as number | null,

      grossWeight:
        null as number | null,

      chargeableWeight:
        null as number | null,

      length:
        null as number | null,

      width:
        null as number | null,

      height:
        null as number | null,

      packingType: '',
      packingTypeOther: '',

      source: '',
      sourceOther: '',

      destination: '',
      destinationOther: '',

      pickupDate: '',
      expectedFlightDate: '',
      deliveryDate: '',

      transitDays:
        null as number | null,

      airline: '',
      airlineOther: '',

      flightNumber: '',
      flightDate: '',

      departureTime: '',
      arrivalTime: '',

      awbNumber: '',

      airlineBookingReference: '',

      chaRequired:
        'yes',

      cha: '',
      chaOther: '',

      chaContact: '',

      billOfEntryNumber: '',
      shippingBillNumber: '',

      customsStatus: '',
      customsStatusOther: '',

      transporter: '',
      transporterOther: '',

      driverName: '',
      driverMobile: '',
      vehicleNumber: '',
      lrNumber: '',

      pickupTime: '',
      deliveryTime: '',

      airFreightRate: 0,
      freightAmount: 0,
      fuelSurcharge: 0,
      securityCharge: 0,
      terminalHandlingCharge: 0,
      documentationCharge: 0,
      currency: 'INR',
      currencyOther: '',

      discount: 0,

      gstRate: '',
      gstRateOther: '',

      otherTax: 0,

      internalRemarks: '',
      customerRemarks: ''
    };
  }

  private selectedCurrency(): string {
    return this.form.currency === 'other'
      ? this.form.currencyOther.trim().toUpperCase()
      : this.form.currency || 'INR';
  }

  private number(
    value: unknown
  ): number {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  private today(): string {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }
}






