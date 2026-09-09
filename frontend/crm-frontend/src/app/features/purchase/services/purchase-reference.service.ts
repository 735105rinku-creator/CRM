import {
    Injectable
  } from '@angular/core';
  
  import {
    Observable
  } from 'rxjs';
  
  import {
    ApiService,
    QueryParams
  } from '../../../core/services/api.service';
  
  import {
    PurchaseVendorOption,
    PurchaseWarehouseOption
  } from '../models/purchase.models';
  
  
  @Injectable({
    providedIn: 'root'
  })
  export class PurchaseReferenceService {
  
  
    /* ============================================================
       ENDPOINTS
    ============================================================ */
  
    private readonly vendorEndpoint =
      '/purchase/vendors';
  
    private readonly warehouseEndpoint =
      '/purchase/warehouses';
  
  
    constructor(
      private readonly api:
        ApiService
    ) {}
  
  
    /* ============================================================
       VENDORS
  
       Existing LogisticsVendor master is reused.
       Purchase cannot create/update/delete vendor from this service.
    ============================================================ */
  
    getVendors(
      search?:
        string
    ):
      Observable<
        PurchaseVendorOption[]
      > {
  
      const params:
        QueryParams = {
  
        search:
          String(
            search ||
            ''
          )
            .trim() ||
          undefined,
  
        limit:
          200
      };
  
  
      return this.api.get<
        PurchaseVendorOption[]
      >(
        this.vendorEndpoint,
        params
      );
    }
  
  
    /* ============================================================
       WAREHOUSES
  
       Existing LogisticsWarehouse master is reused.
       Purchase cannot create/update/delete warehouse from here.
    ============================================================ */
  
    getWarehouses(
      search?:
        string
    ):
      Observable<
        PurchaseWarehouseOption[]
      > {
  
      const params:
        QueryParams = {
  
        search:
          String(
            search ||
            ''
          )
            .trim() ||
          undefined,
  
        limit:
          100
      };
  
  
      return this.api.get<
        PurchaseWarehouseOption[]
      >(
        this.warehouseEndpoint,
        params
      );
    }
  
  }