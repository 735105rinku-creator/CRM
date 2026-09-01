import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';

interface SelectOption {
  label: string;
  value: string;
}

interface CustomerApiRow {
  _id?: string;
  customerCode?: string;
  customerName?: string;
  companyName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  billingAddress?: { addressLine1?: string; city?: string; state?: string; country?: string; pincode?: string };
  pickupAddress?: { addressLine1?: string; city?: string; state?: string; country?: string; pincode?: string };
}

interface CustomerListResponse {
  data?: CustomerApiRow[] | { data?: CustomerApiRow[]; records?: CustomerApiRow[]; customers?: CustomerApiRow[]; items?: CustomerApiRow[] };
  records?: CustomerApiRow[];
}

interface SeaShipment {
  mongoId: string;

  id: number;

  shipmentNo: string;
  customer: string;

  origin: string;
  destination: string;

  vessel: string;
  containerNo: string;

  etd: string;
  eta: string;

  status: string;

  raw: LogisticsShipment;
}

type BackendShipmentStatus =
  | 'draft'
  | 'booking_created'
  | 'container_pending'
  | 'stuffing'
  | 'pickup_pending'
  | 'picked_up'
  | 'at_warehouse'
  | 'documents_pending'
  | 'customs'
  | 'loaded'
  | 'in_transit'
  | 'arrived'
  | 'out_for_delivery'
  | 'delivered'
  | 'hold'
  | 'cancelled'
  | 'other';

interface LogisticsShipment {
  _id?: string;

  shipmentNumber?: string;

  customerName?: string;

  contactPerson?: string;
  mobile?: string;
  email?: string;

  origin?: {
    name?: string;
    city?: string;
  };

  destination?: {
    name?: string;
    city?: string;
  };

  cargo?: {
    commodity?: string;
    commodityOther?: string;
    description?: string;
    packageCount?: number;
    grossWeight?: number;
  };

  seaFreight?: {
    shipmentType?:
      | ''
      | 'fcl'
      | 'lcl'
      | 'break-bulk'
      | 'ro-ro'
      | 'other';

    shipmentTypeOther?: string;

    containerType?: string;
    containerTypeOther?: string;

    containerCount?: number;

    containerNumber?: string;
    sealNumber?: string;

    shippingLine?: string;
    shippingLineOther?: string;

    vesselName?: string;
    voyageNumber?: string;

    bookingNumber?: string;
    billOfLading?: string;

    originPort?: string;
    originPortOther?: string;

    destinationPort?: string;
    destinationPortOther?: string;

    etd?: string | null;
    eta?: string | null;
  };

  charges?: {
    totalAmount?: number;
  };

  status?: BackendShipmentStatus;
  statusOther?: string;

  remarks?: string;

  createdAt?: string;
}

interface ShipmentListResponse {
  data?: LogisticsShipment[] | { data?: LogisticsShipment[]; records?: LogisticsShipment[]; pagination?: unknown };
  records?: LogisticsShipment[];

  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

interface CreateSeaShipmentPayload {
  shipmentMode: 'sea_freight';

  customerName: string;

  contactPerson?: string;
  mobile?: string;
  email?: string;

  origin?: {
    name?: string;
    city?: string;
  };

  destination?: {
    name?: string;
    city?: string;
  };

  cargo?: {
    commodity?: string;
    commodityOther?: string;
    description?: string;
    packageCount?: number;
    grossWeight?: number;
    weightUnit?: 'kg';
  };

  seaFreight?: {
    shipmentType?:
      | ''
      | 'fcl'
      | 'lcl'
      | 'break-bulk'
      | 'ro-ro'
      | 'other';

    shipmentTypeOther?: string;

    containerType?: string;
    containerTypeOther?: string;

    containerCount?: number;

    containerNumber?: string;
    sealNumber?: string;

    shippingLine?: string;
    shippingLineOther?: string;

    vesselName?: string;
    voyageNumber?: string;

    bookingNumber?: string;
    billOfLading?: string;

    originPort?: string;
    originPortOther?: string;

    destinationPort?: string;
    destinationPortOther?: string;

    etd?: string | null;
    eta?: string | null;
  };

  charges?: {
    freightAmount?: number;
    documentationCharge?: number;
    chaCharge?: number;
    transportationCharge?: number;
    otherCharge?: number;
    otherChargeDescription?: string;
    currency?: string;
  };

  estimatedDeparture?: string | null;
  estimatedArrival?: string | null;

  status:
    | 'draft'
    | 'booking_created'
    | 'container_pending'
    | 'stuffing'
    | 'customs'
    | 'loaded'
    | 'in_transit'
    | 'arrived'
    | 'delivered'
    | 'cancelled'
    | 'other';

  statusOther?: string;

  remarks: string;
}

@Component({
  selector: 'app-sea-freight',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl:
    './sea-freight.component.html',
  styleUrl:
    './sea-freight.component.scss'
})
export class SeaFreightComponent
  implements OnInit {

  private readonly api =
    inject(ApiService);


  protected readonly showForm =
    signal(false);

  protected readonly search =
    signal('');

  protected readonly statusFilter =
    signal('all');

  protected readonly fromDate =
    signal('');

  protected readonly toDate =
    signal('');


  protected readonly isLoading =
    signal(false);

  protected readonly isSaving =
    signal(false);

  protected readonly message =
    signal('');

  protected readonly errorMessage =
    signal('');


  protected readonly editingShipmentId =
    signal<string | null>(null);


  protected customers:
    SelectOption[] = [
      {
        label:
          'Global Traders',
        value:
          'global-traders'
      },
      {
        label:
          'Apex Exports',
        value:
          'apex-exports'
      },
      {
        label:
          'Sunrise Enterprises',
        value:
          'sunrise-enterprises'
      },
      {
        label:
          'Royal International',
        value:
          'royal-international'
      },
      {
        label:
          'Other',
        value:
          'other'
      }
    ];


  private readonly customerRows = signal<CustomerApiRow[]>([]);

  protected readonly shipmentTypes:
    SelectOption[] = [
      {
        label:
          'FCL - Full Container Load',
        value:
          'fcl'
      },
      {
        label:
          'LCL - Less Container Load',
        value:
          'lcl'
      },
      {
        label:
          'Break Bulk',
        value:
          'break-bulk'
      },
      {
        label:
          'Ro-Ro',
        value:
          'ro-ro'
      },
      {
        label:
          'Other',
        value:
          'other'
      }
    ];


  protected readonly containerTypes:
    SelectOption[] = [
      {
        label:
          '20 FT Standard',
        value:
          '20-standard'
      },
      {
        label:
          '40 FT Standard',
        value:
          '40-standard'
      },
      {
        label:
          '40 FT High Cube',
        value:
          '40-hc'
      },
      {
        label:
          '20 FT Reefer',
        value:
          '20-reefer'
      },
      {
        label:
          '40 FT Reefer',
        value:
          '40-reefer'
      },
      {
        label:
          'Open Top',
        value:
          'open-top'
      },
      {
        label:
          'Flat Rack',
        value:
          'flat-rack'
      },
      {
        label:
          'Other',
        value:
          'other'
      }
    ];


  protected readonly ports:
    SelectOption[] = [
      {
        label:
          'Mundra Port',
        value:
          'mundra'
      },
      {
        label:
          'Nhava Sheva / JNPT',
        value:
          'jnpt'
      },
      {
        label:
          'Chennai Port',
        value:
          'chennai'
      },
      {
        label:
          'Kolkata Port',
        value:
          'kolkata'
      },
      {
        label:
          'Cochin Port',
        value:
          'cochin'
      },
      {
        label:
          'Jebel Ali Port',
        value:
          'jebel-ali'
      },
      {
        label:
          'Singapore Port',
        value:
          'singapore'
      },
      {
        label:
          'Rotterdam Port',
        value:
          'rotterdam'
      },
      {
        label:
          'Other',
        value:
          'other'
      }
    ];


  protected readonly shippingLines:
    SelectOption[] = [
      {
        label:
          'Maersk',
        value:
          'maersk'
      },
      {
        label:
          'MSC',
        value:
          'msc'
      },
      {
        label:
          'CMA CGM',
        value:
          'cma-cgm'
      },
      {
        label:
          'Hapag-Lloyd',
        value:
          'hapag-lloyd'
      },
      {
        label:
          'COSCO',
        value:
          'cosco'
      },
      {
        label:
          'ONE',
        value:
          'one'
      },
      {
        label:
          'Other',
        value:
          'other'
      }
    ];


  protected readonly commodityTypes:
    SelectOption[] = [
      {
        label:
          'Rice',
        value:
          'rice'
      },
      {
        label:
          'Wheat',
        value:
          'wheat'
      },
      {
        label:
          'Maize',
        value:
          'maize'
      },
      {
        label:
          'Fresh Produce',
        value:
          'fresh-produce'
      },
      {
        label:
          'Machinery',
        value:
          'machinery'
      },
      {
        label:
          'General Cargo',
        value:
          'general-cargo'
      },
      {
        label:
          'Other',
        value:
          'other'
      }
    ];


  protected readonly statusOptions:
    SelectOption[] = [
      {
        label:
          'Booking Created',
        value:
          'booking-created'
      },
      {
        label:
          'Container Pending',
        value:
          'container-pending'
      },
      {
        label:
          'Stuffing',
        value:
          'stuffing'
      },
      {
        label:
          'Customs',
        value:
          'customs'
      },
      {
        label:
          'Loaded on Vessel',
        value:
          'loaded'
      },
      {
        label:
          'In Transit',
        value:
          'in-transit'
      },
      {
        label:
          'Arrived',
        value:
          'arrived'
      },
      {
        label:
          'Delivered',
        value:
          'delivered'
      },
      {
        label:
          'Cancelled',
        value:
          'cancelled'
      },
      {
        label:
          'Other',
        value:
          'other'
      }
    ];


  protected form =
    this.emptyForm();


  protected readonly shipments =
    signal<SeaShipment[]>([]);


  protected readonly filteredShipments =
    computed(() => {

      const search =
        this.search()
          .trim()
          .toLowerCase();

      const status =
        this.statusFilter();


      return this.shipments().filter(
        (
          shipment
        ) => {

          const matchesSearch =
            !search ||
            shipment
              .shipmentNo
              .toLowerCase()
              .includes(search) ||
            shipment
              .customer
              .toLowerCase()
              .includes(search) ||
            shipment
              .containerNo
              .toLowerCase()
              .includes(search) ||
            shipment
              .vessel
              .toLowerCase()
              .includes(search);


          const matchesStatus =
            status ===
              'all' ||
            shipment.status ===
              status;


          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    });


  protected readonly summary =
    computed(() => ({

      total:
        this
          .shipments()
          .length,


      transit:
        this
          .shipments()
          .filter(
            (
              item
            ) =>
              item.status ===
              'in-transit'
          )
          .length,


      customs:
        this
          .shipments()
          .filter(
            (
              item
            ) =>
              item.status ===
              'customs'
          )
          .length,


      delivered:
        this
          .shipments()
          .filter(
            (
              item
            ) =>
              item.status ===
              'delivered'
          )
          .length

    }));


  ngOnInit(): void {
    this.loadShipments();
    this.loadCustomers();
  }


  /* ==========================================================
     LOAD LIVE SEA FREIGHT
  ========================================================== */

  protected loadShipments(): void {

    this.isLoading.set(
      true
    );

    this.errorMessage.set(
      ''
    );


    this.api
      .get<ShipmentListResponse | LogisticsShipment[]>(
        '/logistics/shipments/sea-freight',
        {
          page:
            1,

          limit:
            100,

          sortBy:
            'createdAt',

          sortOrder:
            'desc',

          ...this.dateParams()
        }
      )

      .pipe(
        finalize(() =>
          this.isLoading.set(
            false
          )
        )
      )

      .subscribe({

        next: (
          result
        ) => {

          const rows =
            this.extractShipmentRows(result)
              .map(
                (
                  shipment,
                  index
                ) =>
                  this.mapShipment(
                    shipment,
                    index
                  )
              );


          this.shipments.set(
            rows
          );
        },


        error: (
          error: {
            error?: {
              message?: string;
              errors?: Array<{
                message?: string;
              }>;
            };
          }
        ) => {

          this.shipments.set(
            []
          );


          this.errorMessage.set(
            error?.error
              ?.message ||
            error?.error
              ?.errors?.[0]
              ?.message ||
            'Unable to load Sea Freight shipments.'
          );
        }

      });
  }


  /* ==========================================================
     NEW
  ========================================================== */

  protected openNewShipment(): void {

    this.editingShipmentId.set(
      null
    );

    this.form =
      this.emptyForm();

    this.message.set('');

    this.errorMessage.set('');

    this.showForm.set(
      true
    );


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  protected onCustomerSelected(): void {
    const customer = this.customerRows().find(
      (item) => this.customerValue(item) === this.form.customer
    );

    if (!customer) {
      return;
    }

    this.form.contactPerson = customer.contactPerson || this.form.contactPerson;
    this.form.mobile = customer.mobile || this.form.mobile;
    this.form.email = customer.email || this.form.email;
    this.form.originPortOther = customer.pickupAddress?.city || this.form.originPortOther;
  }

  @HostListener('window:focus')
  protected refreshCustomersOnFocus(): void {
    this.loadCustomers();
  }

  private loadCustomers(): void {
    this.api
      .get<CustomerListResponse>('/logistics/customers', {
        page: 1,
        limit: 100,
        status: 'active',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      .subscribe({
        next: (response) => {
          const rows = this.extractCustomerRows(response);
          this.customerRows.set(rows);

          this.customers = [
            ...rows.map((customer) => ({
              label: customer.customerName || customer.companyName || customer.customerCode || 'Customer',
              value: this.customerValue(customer)
            })),
            { label: 'Other', value: 'other' }
          ];
        },
        error: (error) => this.errorMessage.set(error?.error?.message || 'Unable to load Logistics customers.')
      });
  }

  protected applyDateFilter(): void {
    this.loadShipments();
  }

  protected clearDateFilter(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.loadShipments();
  }

  private dateParams(): Record<string, string> {
    return {
      ...(this.fromDate() ? { fromDate: this.fromDate() } : {}),
      ...(this.toDate() ? { toDate: this.toDate() } : {})
    };
  }

  private extractCustomerRows(
    response: CustomerListResponse | CustomerApiRow[] | null | undefined
  ): CustomerApiRow[] {
    if (Array.isArray(response)) {
      return response;
    }

    const data = response?.data;

    if (Array.isArray(data)) {
      return data;
    }

    return data?.data || data?.records || data?.customers || data?.items || response?.records || [];
  }

  private customerValue(customer: CustomerApiRow): string {
    return customer._id || customer.customerCode || this.slug(customer.customerName || customer.companyName || 'customer');
  }

  private formatCustomerAddress(address: CustomerApiRow['billingAddress']): string {
    if (!address) return '';

    return [address.addressLine1, address.city, address.state, address.country, address.pincode]
      .filter(Boolean)
      .join(', ');
  }

  private slug(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'customer';
  }
  protected closeForm(): void {

    this.showForm.set(
      false
    );

    this.editingShipmentId.set(
      null
    );

    this.form =
      this.emptyForm();

    this.message.set('');

    this.errorMessage.set('');
  }


  /* ==========================================================
     SAVE / UPDATE
  ========================================================== */

  protected saveShipment(): void {

    if (
      this.isSaving()
    ) {
      return;
    }


    this.message.set('');

    this.errorMessage.set('');


    const validationError =
      this.validateForm();


    if (
      validationError
    ) {

      this.errorMessage.set(
        validationError
      );

      window.alert(
        validationError
      );

      return;
    }


    const payload =
      this.buildPayload();


    const editId =
      this.editingShipmentId();


    const request =
      editId
        ? this.api.patch<LogisticsShipment>(
            `/logistics/shipments/${editId}`,
            payload
          )
        : this.api.post<LogisticsShipment>(
            '/logistics/shipments',
            payload
          );


    this.isSaving.set(
      true
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

          const number =
            shipment
              ?.shipmentNumber ||
            this.form.shipmentNo ||
            'Shipment';


          const success =
            editId
              ? `${number} updated successfully.`
              : `${number} created successfully.`;


          this.message.set(
            success
          );

          this.errorMessage.set('');


          window.alert(
            success
          );


          this.showForm.set(
            false
          );

          this.editingShipmentId.set(
            null
          );

          this.form =
            this.emptyForm();


          this.loadShipments();
        },


        error: (
          error: {
            error?: {
              message?: string;
              errors?: Array<{
                message?: string;
              }>;
            };
          }
        ) => {

          const message =
            error?.error
              ?.message ||
            error?.error
              ?.errors?.[0]
              ?.message ||
            (
              editId
                ? 'Unable to update Sea Freight shipment.'
                : 'Unable to create Sea Freight shipment.'
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


  /* ==========================================================
     VIEW
  ========================================================== */

  protected viewShipment(
    shipment:
      SeaShipment
  ): void {

    const raw =
      shipment.raw;


    const text =
      [
        `Shipment: ${shipment.shipmentNo}`,
        `Customer: ${shipment.customer}`,
        `Route: ${shipment.origin} -> ${shipment.destination}`,
        `Vessel: ${shipment.vessel || '-'}`,
        `Container: ${shipment.containerNo || '-'}`,
        `ETD: ${shipment.etd || '-'}`,
        `ETA: ${shipment.eta || '-'}`,
        `Status: ${this.statusLabel(shipment.status)}`,
        '',
        `Remarks: ${raw.remarks || '-'}`
      ]
        .join('\n');


    window.alert(
      text
    );
  }


  /* ==========================================================
     EDIT
  ========================================================== */

  protected editShipment(
    shipment:
      SeaShipment
  ): void {

    this.editingShipmentId.set(
      shipment.mongoId
    );


    this.form =
      this.shipmentToForm(
        shipment.raw
      );


    this.showForm.set(
      true
    );


    this.message.set(
      `Editing ${shipment.shipmentNo}`
    );

    this.errorMessage.set('');


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  /* ==========================================================
     STATUS LABEL
  ========================================================== */

  protected statusLabel(
    status:
      string
  ): string {

    return (
      this
        .statusOptions
        .find(
          (
            option
          ) =>
            option.value ===
            status
        )
        ?.label ||
      status
    );
  }


  /* ==========================================================
     VALIDATION
  ========================================================== */

  private extractShipmentRows(
    result: ShipmentListResponse | LogisticsShipment[] | null | undefined
  ): LogisticsShipment[] {
    if (Array.isArray(result)) {
      return result;
    }

    const data = result?.data;

    if (Array.isArray(data)) {
      return data;
    }

    return data?.data || data?.records || result?.records || [];
  }

  private validateForm(): string {

    const customerName =
      this.selectedLabel(
        this.customers,
        this.form.customer,
        this.form.customerOther
      );


    if (
      !customerName
    ) {
      return 'Customer Name is required.';
    }


    if (
      this.form.customer ===
        'other' &&
      !this.form
        .customerOther
        .trim()
    ) {
      return 'Enter Customer Name because Other is selected.';
    }


    if (
      !this.form
        .contactPerson
        .trim()
    ) {
      return 'Contact Person is required.';
    }


    if (
      !this.form
        .mobile
        .trim()
    ) {
      return 'Mobile Number is required.';
    }


    if (
      !this.form
        .email
        .trim()
    ) {
      return 'Email is required.';
    }


    if (
      !this.form
        .shipmentType
    ) {
      return 'Shipment Type is required.';
    }


    if (
      this.form
        .shipmentType ===
        'other' &&
      !this.form
        .shipmentTypeOther
        .trim()
    ) {
      return 'Enter Shipment Type because Other is selected.';
    }


    if (
      !this.form
        .commodity
    ) {
      return 'Commodity is required.';
    }


    if (
      this.form
        .commodity ===
        'other' &&
      !this.form
        .commodityOther
        .trim()
    ) {
      return 'Enter Commodity because Other is selected.';
    }


    if (
      this.number(
        this.form.quantity
      ) <= 0
    ) {
      return 'Quantity is required.';
    }


    if (
      this.number(
        this.form.grossWeight
      ) <= 0
    ) {
      return 'Gross Weight is required.';
    }


    if (
      !this.form
        .containerType
    ) {
      return 'Container Type is required.';
    }


    if (
      this.form
        .containerType ===
        'other' &&
      !this.form
        .containerTypeOther
        .trim()
    ) {
      return 'Enter Container Type because Other is selected.';
    }


    if (
      this.number(
        this.form.containerCount
      ) <= 0
    ) {
      return 'Container Count is required.';
    }


    if (
      !this.form
        .originPort
    ) {
      return 'Origin Port is required.';
    }


    if (
      this.form
        .originPort ===
        'other' &&
      !this.form
        .originPortOther
        .trim()
    ) {
      return 'Enter Origin Port because Other is selected.';
    }


    if (
      !this.form
        .destinationPort
    ) {
      return 'Destination Port is required.';
    }


    if (
      this.form
        .destinationPort ===
        'other' &&
      !this.form
        .destinationPortOther
        .trim()
    ) {
      return 'Enter Destination Port because Other is selected.';
    }


    if (
      !this.form
        .shippingLine
    ) {
      return 'Shipping Line is required.';
    }


    if (
      this.form
        .shippingLine ===
        'other' &&
      !this.form
        .shippingLineOther
        .trim()
    ) {
      return 'Enter Shipping Line because Other is selected.';
    }


    if (
      !this.form
        .vesselName
        .trim()
    ) {
      return 'Vessel Name is required.';
    }


    if (
      !this.form
        .bookingNumber
        .trim()
    ) {
      return 'Booking Number is required.';
    }


    if (
      !this.form
        .status
    ) {
      return 'Status is required.';
    }


    if (
      this.form.status ===
        'other' &&
      !this.form
        .statusOther
        .trim()
    ) {
      return 'Enter Status because Other is selected.';
    }


    if (
      !this.form
        .remarks
        .trim()
    ) {
      return 'Remarks are compulsory.';
    }


    return '';
  }


  /* ==========================================================
     BUILD API PAYLOAD
  ========================================================== */

  private buildPayload():
    CreateSeaShipmentPayload {

    const customerName =
      this.selectedLabel(
        this.customers,
        this.form.customer,
        this.form.customerOther
      );


    const originPort =
      this.selectedLabel(
        this.ports,
        this.form.originPort,
        this.form.originPortOther
      );


    const destinationPort =
      this.selectedLabel(
        this.ports,
        this.form.destinationPort,
        this.form.destinationPortOther
      );


    const commodity =
      this.selectedLabel(
        this.commodityTypes,
        this.form.commodity,
        this.form.commodityOther
      );


    const shippingLine =
      this.selectedLabel(
        this.shippingLines,
        this.form.shippingLine,
        this.form.shippingLineOther
      );


    const containerType =
      this.selectedLabel(
        this.containerTypes,
        this.form.containerType,
        this.form.containerTypeOther
      );


    return {

      shipmentMode:
        'sea_freight',


      customerName,


      contactPerson:
        this.form
          .contactPerson
          .trim(),


      mobile:
        this.form
          .mobile
          .trim(),


      email:
        this.form
          .email
          .trim(),


      origin: {

        name:
          originPort,

        city:
          originPort

      },


      destination: {

        name:
          destinationPort,

        city:
          destinationPort

      },


      cargo: {

        commodity:
          this.form
            .commodity ===
            'other'
            ? 'other'
            : this.form
                .commodity,


        commodityOther:
          this.form
            .commodity ===
            'other'
            ? this.form
                .commodityOther
                .trim()
            : '',


        description:
          this.cargoDescription(),


        packageCount:
          this.number(
            this.form
              .quantity
          ),


        grossWeight:
          this.number(
            this.form
              .grossWeight
          ),


        weightUnit:
          'kg'

      },


      seaFreight: {

        shipmentType:
          this.form
            .shipmentType as
            CreateSeaShipmentPayload[
              'seaFreight'
            ] extends infer T
              ? T extends {
                  shipmentType?: infer V
                }
                ? V
                : never
              : never,


        shipmentTypeOther:
          this.form
            .shipmentType ===
            'other'
            ? this.form
                .shipmentTypeOther
                .trim()
            : '',


        containerType:
          this.form
            .containerType ===
            'other'
            ? 'other'
            : containerType,


        containerTypeOther:
          this.form
            .containerType ===
            'other'
            ? this.form
                .containerTypeOther
                .trim()
            : '',


        containerCount:
          this.number(
            this.form
              .containerCount
          ),


        containerNumber:
          this.form
            .containerNumber
            .trim(),


        sealNumber:
          this.form
            .sealNumber
            .trim(),


        shippingLine:
          this.form
            .shippingLine ===
            'other'
            ? 'other'
            : shippingLine,


        shippingLineOther:
          this.form
            .shippingLine ===
            'other'
            ? this.form
                .shippingLineOther
                .trim()
            : '',


        vesselName:
          this.form
            .vesselName
            .trim(),


        voyageNumber:
          this.form
            .voyageNumber
            .trim(),


        bookingNumber:
          this.form
            .bookingNumber
            .trim(),


        billOfLading:
          this.form
            .billOfLading
            .trim(),


        originPort:
          this.form
            .originPort ===
            'other'
            ? 'other'
            : originPort,


        originPortOther:
          this.form
            .originPort ===
            'other'
            ? this.form
                .originPortOther
                .trim()
            : '',


        destinationPort:
          this.form
            .destinationPort ===
            'other'
            ? 'other'
            : destinationPort,


        destinationPortOther:
          this.form
            .destinationPort ===
            'other'
            ? this.form
                .destinationPortOther
                .trim()
            : '',


        etd:
          this.dateOrNull(
            this.form.etd
          ),


        eta:
          this.dateOrNull(
            this.form.eta
          )

      },


      charges: {

        freightAmount:
          this.number(
            this.form
              .freightAmount
          ),


        documentationCharge:
          this.number(
            this.form
              .documentationCharge
          ),


        chaCharge:
          this.number(
            this.form
              .chaCharge
          ),


        transportationCharge:
          this.number(
            this.form
              .transportationCharge
          ),


        otherCharge:
          this.number(
            this.form
              .otherCharge
          ),


        otherChargeDescription:
          this.number(
            this.form
              .otherCharge
          )
            ? 'Other Sea Freight charges'
            : '',


        currency:
          'INR'

      },


      estimatedDeparture:
        this.dateOrNull(
          this.form.etd
        ),


      estimatedArrival:
        this.dateOrNull(
          this.form.eta
        ),


      status:
        this.mapStatusToBackend(
          this.form.status
        ),


      statusOther:
        this.form
          .status ===
          'other'
          ? this.form
              .statusOther
              .trim()
          : '',


      remarks:
        this.form
          .remarks
          .trim()

    };
  }


  /* ==========================================================
     BACKEND -> UI TABLE
  ========================================================== */

  private mapShipment(
    shipment:
      LogisticsShipment,

    index:
      number
  ): SeaShipment {

    const sea =
      shipment
        .seaFreight ||
      {};


    return {

      mongoId:
        shipment._id ||
        '',


      id:
        index + 1,


      shipmentNo:
        shipment
          .shipmentNumber ||
        '-',


      customer:
        shipment
          .customerName ||
        '-',


      origin:
        sea.originPort ===
          'other'
          ? (
              sea.originPortOther ||
              '-'
            )
          : (
              sea.originPort ||
              shipment.origin
                ?.name ||
              shipment.origin
                ?.city ||
              '-'
            ),


      destination:
        sea.destinationPort ===
          'other'
          ? (
              sea.destinationPortOther ||
              '-'
            )
          : (
              sea.destinationPort ||
              shipment.destination
                ?.name ||
              shipment.destination
                ?.city ||
              '-'
            ),


      vessel:
        sea.vesselName ||
        '-',


      containerNo:
        sea.containerNumber ||
        '-',


      etd:
        this.dateForInput(
          sea.etd
        ),


      eta:
        this.dateForInput(
          sea.eta
        ),


      status:
        this.mapStatusFromBackend(
          shipment.status ||
          'draft'
        ),


      raw:
        shipment

    };
  }


  /* ==========================================================
     EDIT FORM MAPPING
  ========================================================== */

  private shipmentToForm(
    shipment:
      LogisticsShipment
  ) {

    const sea =
      shipment
        .seaFreight ||
      {};


    const customer =
      this.findValueByLabel(
        this.customers,
        shipment.customerName ||
        ''
      );


    const originPort =
      sea.originPort ===
        'other'
        ? 'other'
        : this.findValueByLabel(
            this.ports,
            sea.originPort ||
            shipment.origin
              ?.name ||
            ''
          );


    const destinationPort =
      sea.destinationPort ===
        'other'
        ? 'other'
        : this.findValueByLabel(
            this.ports,
            sea.destinationPort ||
            shipment.destination
              ?.name ||
            ''
          );


    const shippingLine =
      sea.shippingLine ===
        'other'
        ? 'other'
        : this.findValueByLabel(
            this.shippingLines,
            sea.shippingLine ||
            ''
          );


    const containerType =
      sea.containerType ===
        'other'
        ? 'other'
        : this.findValueByLabel(
            this.containerTypes,
            sea.containerType ||
            ''
          );


    const commodity =
      shipment.cargo
        ?.commodity ===
        'other'
        ? 'other'
        : this.findValueByLabel(
            this.commodityTypes,
            shipment.cargo
              ?.commodity ||
            ''
          );


    return {

      shipmentNo:
        shipment
          .shipmentNumber ||
        '',


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
          : shipment
              .customerName ||
            '',


      contactPerson:
        shipment
          .contactPerson ||
        '',


      mobile:
        shipment.mobile ||
        '',


      email:
        shipment.email ||
        '',


      shipmentType:
        sea.shipmentType ||
        '',


      shipmentTypeOther:
        sea.shipmentTypeOther ||
        '',


      commodity:
        commodity ||
        '',


      commodityOther:
        shipment.cargo
          ?.commodityOther ||
        '',


      quantity:
        this.number(
          shipment.cargo
            ?.packageCount
        ),


      grossWeight:
        this.number(
          shipment.cargo
            ?.grossWeight
        ),


      containerType:
        containerType ||
        (
          sea.containerType
            ? 'other'
            : ''
        ),


      containerTypeOther:
        sea.containerType ===
          'other'
          ? (
              sea.containerTypeOther ||
              ''
            )
          : (
              containerType
                ? ''
                : sea.containerType ||
                  ''
            ),


      containerCount:
        this.number(
          sea.containerCount
        ) || 1,


      containerNumber:
        sea.containerNumber ||
        '',


      sealNumber:
        sea.sealNumber ||
        '',


      originPort:
        originPort ||
        (
          sea.originPort ||
          shipment.origin
            ?.name
            ? 'other'
            : ''
        ),


      originPortOther:
        sea.originPort ===
          'other'
          ? (
              sea.originPortOther ||
              ''
            )
          : (
              originPort
                ? ''
                : sea.originPort ||
                  shipment.origin
                    ?.name ||
                  ''
            ),


      destinationPort:
        destinationPort ||
        (
          sea.destinationPort ||
          shipment.destination
            ?.name
            ? 'other'
            : ''
        ),


      destinationPortOther:
        sea.destinationPort ===
          'other'
          ? (
              sea.destinationPortOther ||
              ''
            )
          : (
              destinationPort
                ? ''
                : sea.destinationPort ||
                  shipment.destination
                    ?.name ||
                  ''
            ),


      shippingLine:
        shippingLine ||
        (
          sea.shippingLine
            ? 'other'
            : ''
        ),


      shippingLineOther:
        sea.shippingLine ===
          'other'
          ? (
              sea.shippingLineOther ||
              ''
            )
          : (
              shippingLine
                ? ''
                : sea.shippingLine ||
                  ''
            ),


      vesselName:
        sea.vesselName ||
        '',


      voyageNumber:
        sea.voyageNumber ||
        '',


      bookingNumber:
        sea.bookingNumber ||
        '',


      billOfLading:
        sea.billOfLading ||
        '',


      etd:
        this.dateForInput(
          sea.etd
        ),


      eta:
        this.dateForInput(
          sea.eta
        ),


      /*
       * Existing backend only returns totalAmount here.
       * Individual components stay at zero unless present
       * in a later expanded response model.
       */
      freightAmount:
        this.number(
          shipment.charges
            ?.totalAmount
        ),


      documentationCharge:
        0,


      chaCharge:
        0,


      transportationCharge:
        0,


      otherCharge:
        0,


      status:
        this.mapStatusFromBackend(
          shipment.status ||
          'draft'
        ),


      statusOther:
        shipment.statusOther ||
        '',


      remarks:
        shipment.remarks ||
        ''

    };
  }


  /* ==========================================================
     DESCRIPTION
  ========================================================== */

  private cargoDescription(): string {

    return [
      `Quantity: ${this.number(this.form.quantity)}`,
      `Container Count: ${this.number(this.form.containerCount)}`,
      `Container Type: ${this.selectedLabel(this.containerTypes, this.form.containerType, this.form.containerTypeOther) || '-'}`,
      `Shipping Line: ${this.selectedLabel(this.shippingLines, this.form.shippingLine, this.form.shippingLineOther) || '-'}`,
      `Booking Number: ${this.form.bookingNumber.trim() || '-'}`,
      `Bill of Lading: ${this.form.billOfLading.trim() || '-'}`,
      `Voyage Number: ${this.form.voyageNumber.trim() || '-'}`
    ]
      .join('\n');
  }


  /* ==========================================================
     STATUS MAP
  ========================================================== */

  private mapStatusToBackend(
    status:
      string
  ):
    CreateSeaShipmentPayload['status'] {

    switch (
      status
    ) {

      case 'booking-created':
        return 'booking_created';


      case 'container-pending':
        return 'container_pending';


      case 'stuffing':
        return 'stuffing';


      case 'customs':
        return 'customs';


      case 'loaded':
        return 'loaded';


      case 'in-transit':
        return 'in_transit';


      case 'arrived':
        return 'arrived';


      case 'delivered':
        return 'delivered';


      case 'cancelled':
        return 'cancelled';


      case 'other':
        return 'other';


      default:
        return 'booking_created';
    }
  }


  private mapStatusFromBackend(
    status:
      BackendShipmentStatus
  ): string {

    switch (
      status
    ) {

      case 'container_pending':
        return 'container-pending';


      case 'stuffing':
        return 'stuffing';


      case 'customs':
      case 'documents_pending':
      case 'hold':
        return 'customs';


      case 'loaded':
        return 'loaded';


      case 'in_transit':
        return 'in-transit';


      case 'arrived':
      case 'out_for_delivery':
        return 'arrived';


      case 'delivered':
        return 'delivered';


      case 'cancelled':
        return 'cancelled';


      case 'other':
        return 'other';


      case 'draft':
      case 'booking_created':
      case 'pickup_pending':
      case 'picked_up':
      case 'at_warehouse':
      default:
        return 'booking-created';
    }
  }


  /* ==========================================================
     HELPERS
  ========================================================== */

  private selectedLabel(
    options:
      SelectOption[],

    value:
      string,

    otherValue =
      ''
  ): string {

    if (
      value ===
      'other'
    ) {
      return otherValue
        .trim();
    }


    return (
      options
        .find(
          (
            option
          ) =>
            option.value ===
            value
        )
        ?.label ||
      value ||
      ''
    )
      .trim();
  }


  private findValueByLabel(
    options:
      SelectOption[],

    label:
      string
  ): string {

    const normalized =
      String(
        label ||
        ''
      )
        .trim()
        .toLowerCase();


    return (
      options
        .find(
          (
            option
          ) =>
            option.label
              .trim()
              .toLowerCase() ===
              normalized ||
            option.value
              .trim()
              .toLowerCase() ===
              normalized
        )
        ?.value ||
      ''
    );
  }


  private dateOrNull(
    value:
      string
  ):
    string | null {

    return value
      ?.trim()
      ? value.trim()
      : null;
  }


  private dateForInput(
    value:
      string | null | undefined
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
      return '';
    }


    return date
      .toISOString()
      .slice(
        0,
        10
      );
  }


  private number(
    value:
      unknown
  ): number {

    const parsed =
      Number(
        value
      );


    return Number.isFinite(
      parsed
    )
      ? parsed
      : 0;
  }


  private emptyForm() {

    return {

      shipmentNo:
        '',


      customer:
        '',

      customerOther:
        '',

      contactPerson:
        '',

      mobile:
        '',

      email:
        '',


      shipmentType:
        '',

      shipmentTypeOther:
        '',


      commodity:
        '',

      commodityOther:
        '',


      quantity:
        0,

      grossWeight:
        0,


      containerType:
        '',

      containerTypeOther:
        '',

      containerCount:
        1,

      containerNumber:
        '',

      sealNumber:
        '',


      originPort:
        '',

      originPortOther:
        '',

      destinationPort:
        '',

      destinationPortOther:
        '',


      shippingLine:
        '',

      shippingLineOther:
        '',

      vesselName:
        '',

      voyageNumber:
        '',


      bookingNumber:
        '',

      billOfLading:
        '',


      etd:
        '',

      eta:
        '',


      freightAmount:
        0,

      documentationCharge:
        0,

      chaCharge:
        0,

      transportationCharge:
        0,

      otherCharge:
        0,


      status:
        'booking-created',

      statusOther:
        '',


      remarks:
        ''

    };
  }
}









