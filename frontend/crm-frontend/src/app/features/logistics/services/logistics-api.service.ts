import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

/* ============================================================
   COMMON TYPES
============================================================ */

export type LogisticsShipmentMode =
  | 'air_cargo'
  | 'sea_freight'
  | 'road'
  | 'other';

export type LogisticsShipmentStatus =
  | 'draft'
  | 'booking_created'
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


/* ============================================================
   API RESPONSE
============================================================ */

export interface ApiResponse<T> {
  statusCode?: number;
  data?: T;
  message?: string;
  success?: boolean;
}


/* ============================================================
   LOCATION
============================================================ */

export interface LogisticsLocation {
  name?: string;
  code?: string;

  address?: string;

  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}


/* ============================================================
   CARGO
============================================================ */

export interface LogisticsCargo {
  commodity?: string;
  commodityOther?: string;

  description?: string;

  packageCount?: number;

  packageType?: string;
  packageTypeOther?: string;

  grossWeight?: number;
  netWeight?: number;

  weightUnit?:
    | 'kg'
    | 'mt'
    | 'ton'
    | 'lb'
    | 'other';

  weightUnitOther?: string;

  volume?: number;

  volumeUnit?:
    | 'cbm'
    | 'cft'
    | 'other';

  volumeUnitOther?: string;

  chargeableWeight?: number;

  hazardous?: boolean;

  temperatureControlled?: boolean;

  minTemperature?: number | null;

  maxTemperature?: number | null;
}


/* ============================================================
   AIR CARGO
============================================================ */

export interface AirFreightDetails {
  airline?: string;
  airlineOther?: string;

  awbNumber?: string;

  masterAwbNumber?: string;
  houseAwbNumber?: string;

  flightNumber?: string;

  departureAirport?: string;
  departureAirportOther?: string;

  arrivalAirport?: string;
  arrivalAirportOther?: string;

  departureDate?: string | null;

  arrivalDate?: string | null;
}


/* ============================================================
   SEA FREIGHT
============================================================ */

export interface SeaFreightDetails {
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
}


/* ============================================================
   CUSTOMS
============================================================ */

export interface LogisticsCustoms {
  chaRequired?: boolean;

  chaVendorId?: string | null;

  customsLocation?: string;
  customsLocationOther?: string;

  shippingBillNumber?: string;

  shippingBillDate?: string | null;

  billOfEntryNumber?: string;

  billOfEntryDate?: string | null;

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
}


/* ============================================================
   TRANSPORT
============================================================ */

export interface LogisticsTransport {
  required?: boolean;

  transporterId?: string | null;

  driverId?: string | null;

  vehicleId?: string | null;

  pickupDate?: string | null;

  expectedDeliveryDate?: string | null;
}


/* ============================================================
   WAREHOUSE
============================================================ */

export interface LogisticsWarehouse {
  required?: boolean;

  warehouseId?: string | null;

  warehouseReceiptId?: string | null;

  entryDate?: string | null;

  exitDate?: string | null;
}


/* ============================================================
   CHARGES
============================================================ */

export interface LogisticsCharges {
  freightAmount?: number;

  chaCharge?: number;

  documentationCharge?: number;

  transportationCharge?: number;

  warehouseCharge?: number;

  handlingCharge?: number;

  insuranceCharge?: number;

  otherCharge?: number;

  otherChargeDescription?: string;

  currency?: string;

  totalAmount?: number;
}


/* ============================================================
   STATUS HISTORY
============================================================ */

export interface LogisticsStatusHistory {
  status?: LogisticsShipmentStatus;

  location?: string;

  remarks?: string;

  changedBy?: string | null;

  changedAt?: string;
}


/* ============================================================
   EMPLOYEE REF
============================================================ */

export interface LogisticsEmployeeRef {
  _id?: string;

  employeeCode?: string;

  firstName?: string;

  lastName?: string;

  displayName?: string;
}


/* ============================================================
   MAIN SHIPMENT
============================================================ */

export interface LogisticsShipment {
  _id?: string;

  companyId?: string;

  branchId?: string | null;

  shipmentNumber?: string;

  shipmentMode?:
    LogisticsShipmentMode;

  shipmentModeOther?: string;

  customerId?: string | null;

  customerName?: string;

  contactPerson?: string;

  mobile?: string;

  email?: string;

  customerReference?: string;

  origin?: LogisticsLocation;

  destination?: LogisticsLocation;

  cargo?: LogisticsCargo;

  airFreight?: AirFreightDetails;

  seaFreight?: SeaFreightDetails;

  customs?: LogisticsCustoms;

  transport?: LogisticsTransport;

  warehouse?: LogisticsWarehouse;

  charges?: LogisticsCharges;

  currentLocation?: string;

  trackingReference?: string;

  estimatedDeparture?: string | null;

  estimatedArrival?: string | null;

  actualDeparture?: string | null;

  actualArrival?: string | null;

  status?: LogisticsShipmentStatus;

  statusOther?: string;

  statusHistory?:
    LogisticsStatusHistory[];

  assignedTo?:
    | string
    | LogisticsEmployeeRef
    | null;

  createdByEmployeeId?:
    | string
    | LogisticsEmployeeRef
    | null;

  remarks?: string;

  isActive?: boolean;

  createdAt?: string;

  updatedAt?: string;
}


/* ============================================================
   CREATE PAYLOAD
============================================================ */

export interface CreateLogisticsShipmentPayload {
  shipmentNumber?: string;

  shipmentMode:
    LogisticsShipmentMode;

  shipmentModeOther?: string;

  customerId?: string | null;

  customerName: string;

  contactPerson?: string;

  mobile?: string;

  email?: string;

  customerReference?: string;

  origin?: LogisticsLocation;

  destination?: LogisticsLocation;

  cargo?: LogisticsCargo;

  airFreight?: AirFreightDetails;

  seaFreight?: SeaFreightDetails;

  customs?: LogisticsCustoms;

  transport?: LogisticsTransport;

  warehouse?: LogisticsWarehouse;

  charges?: LogisticsCharges;

  currentLocation?: string;

  trackingReference?: string;

  estimatedDeparture?: string | null;

  estimatedArrival?: string | null;

  status?: LogisticsShipmentStatus;

  statusOther?: string;

  assignedTo?: string | null;

  remarks: string;
}


/* ============================================================
   STATUS PAYLOAD
============================================================ */

export interface LogisticsStatusPayload {
  status:
    LogisticsShipmentStatus;

  statusOther?: string;

  currentLocation?: string;

  remarks: string;
}


/* ============================================================
   PAGINATION
============================================================ */

export interface LogisticsPagination {
  page: number;

  limit: number;

  total: number;

  totalPages: number;

  hasNextPage: boolean;

  hasPreviousPage: boolean;
}


export interface LogisticsShipmentListResponse {
  data: LogisticsShipment[];

  pagination:
    LogisticsPagination;
}


/* ============================================================
   QUERY
============================================================ */

export interface LogisticsShipmentQuery {
  page?: number;

  limit?: number;

  search?: string;

  shipmentMode?:
    LogisticsShipmentMode;

  status?:
    LogisticsShipmentStatus;

  customerId?: string;

  assignedTo?: string;

  fromDate?: string;

  toDate?: string;

  sortBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'shipmentNumber'
    | 'estimatedArrival'
    | 'status';

  sortOrder?:
    | 'asc'
    | 'desc';
}


/* ============================================================
   DASHBOARD
============================================================ */

export interface LogisticsDashboardData {
  totalShipments?: number;

  totalRevenue?: number;

  airCargo?: number;

  seaFreight?: number;

  road?: number;

  draft?: number;

  pending?: number;

  inTransit?: number;

  customs?: number;

  delivered?: number;

  hold?: number;

  cancelled?: number;

  byMode?: Record<
    string,
    number
  >;

  byStatus?: Record<
    string,
    number
  >;

  recentShipments?:
    LogisticsShipment[];
}


/* ============================================================
   SERVICE
============================================================ */

@Injectable({
  providedIn: 'root'
})
export class LogisticsApiService {

  private readonly api =
    inject(ApiService);


  /* ==========================================================
     DASHBOARD
  ========================================================== */

  getDashboard():
    Observable<LogisticsDashboardData> {

    return this.api
      .get<
        ApiResponse<
          LogisticsDashboardData
        >
      >(
        '/logistics/dashboard'
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {}
        )
      );
  }


  /* ==========================================================
     ALL SHIPMENTS
  ========================================================== */

  getShipments(
    query: LogisticsShipmentQuery = {}
  ): Observable<
    LogisticsShipmentListResponse
  > {

    return this.api
      .get<
        ApiResponse<
          LogisticsShipmentListResponse
        >
      >(
        '/logistics/shipments',
        this.queryParams(query)
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {
              data: [],
              pagination:
                this.emptyPagination()
            }
        )
      );
  }


  /* ==========================================================
     AIR CARGO
  ========================================================== */

  getAirCargo(
    query: LogisticsShipmentQuery = {}
  ): Observable<
    LogisticsShipmentListResponse
  > {

    return this.api
      .get<
        ApiResponse<
          LogisticsShipmentListResponse
        >
      >(
        '/logistics/shipments/air-cargo',
        this.queryParams(query)
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {
              data: [],
              pagination:
                this.emptyPagination()
            }
        )
      );
  }


  /* ==========================================================
     SEA FREIGHT
  ========================================================== */

  getSeaFreight(
    query: LogisticsShipmentQuery = {}
  ): Observable<
    LogisticsShipmentListResponse
  > {

    return this.api
      .get<
        ApiResponse<
          LogisticsShipmentListResponse
        >
      >(
        '/logistics/shipments/sea-freight',
        this.queryParams(query)
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {
              data: [],
              pagination:
                this.emptyPagination()
            }
        )
      );
  }


  /* ==========================================================
     GET BY ID
  ========================================================== */

  getShipment(
    shipmentId: string
  ): Observable<LogisticsShipment> {

    return this.api
      .get<
        ApiResponse<
          LogisticsShipment
        >
      >(
        `/logistics/shipments/${shipmentId}`
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {}
        )
      );
  }


  /* ==========================================================
     GET BY SHIPMENT NUMBER
  ========================================================== */

  getByShipmentNumber(
    shipmentNumber: string
  ): Observable<LogisticsShipment> {

    const value =
      encodeURIComponent(
        shipmentNumber
          .trim()
          .toUpperCase()
      );

    return this.api
      .get<
        ApiResponse<
          LogisticsShipment
        >
      >(
        `/logistics/shipments/number/${value}`
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {}
        )
      );
  }


  /* ==========================================================
     CREATE
  ========================================================== */

  createShipment(
    payload:
      CreateLogisticsShipmentPayload
  ): Observable<LogisticsShipment> {

    return this.api
      .post<
        ApiResponse<
          LogisticsShipment
        >
      >(
        '/logistics/shipments',
        payload
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {}
        )
      );
  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  updateShipment(
    shipmentId: string,
    payload:
      Partial<
        CreateLogisticsShipmentPayload
      >
  ): Observable<LogisticsShipment> {

    return this.api
      .patch<
        ApiResponse<
          LogisticsShipment
        >
      >(
        `/logistics/shipments/${shipmentId}`,
        payload
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {}
        )
      );
  }


  /* ==========================================================
     STATUS
  ========================================================== */

  updateStatus(
    shipmentId: string,
    payload:
      LogisticsStatusPayload
  ): Observable<LogisticsShipment> {

    return this.api
      .patch<
        ApiResponse<
          LogisticsShipment
        >
      >(
        `/logistics/shipments/${shipmentId}/status`,
        payload
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {}
        )
      );
  }


  /* ==========================================================
     DELETE
  ========================================================== */

  deleteShipment(
    shipmentId: string
  ): Observable<{
    shipmentId?: string;

    shipmentNumber?: string;

    deleted?: boolean;
  }> {

    return this.api
      .delete<
        ApiResponse<{
          shipmentId?: string;

          shipmentNumber?: string;

          deleted?: boolean;
        }>
      >(
        `/logistics/shipments/${shipmentId}`
      )
      .pipe(
        map(
          (response) =>
            response?.data ?? {}
        )
      );
  }


  /* ==========================================================
     PRIVATE QUERY MAPPER
  ========================================================== */

  private queryParams(
    query:
      LogisticsShipmentQuery
  ): Record<
    string,
    string | number
  > {

    const params:
      Record<
        string,
        string | number
      > = {};


    if (query.page) {
      params['page'] =
        query.page;
    }


    if (query.limit) {
      params['limit'] =
        query.limit;
    }


    if (query.search?.trim()) {
      params['search'] =
        query.search.trim();
    }


    if (query.shipmentMode) {
      params['shipmentMode'] =
        query.shipmentMode;
    }


    if (query.status) {
      params['status'] =
        query.status;
    }


    if (query.customerId) {
      params['customerId'] =
        query.customerId;
    }


    if (query.assignedTo) {
      params['assignedTo'] =
        query.assignedTo;
    }


    if (query.fromDate) {
      params['fromDate'] =
        query.fromDate;
    }


    if (query.toDate) {
      params['toDate'] =
        query.toDate;
    }


    if (query.sortBy) {
      params['sortBy'] =
        query.sortBy;
    }


    if (query.sortOrder) {
      params['sortOrder'] =
        query.sortOrder;
    }


    return params;
  }


  private emptyPagination():
    LogisticsPagination {

    return {
      page: 1,

      limit: 20,

      total: 0,

      totalPages: 1,

      hasNextPage: false,

      hasPreviousPage: false
    };
  }
}