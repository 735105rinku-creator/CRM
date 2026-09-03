
export const LOGISTICS_PERMISSIONS = Object.freeze({

  // Dashboard
  DASHBOARD_READ:
    "logistics:dashboard-read",

  // Shipments
  SHIPMENT_CREATE:
    "logistics:shipment-create",

  SHIPMENT_READ:
    "logistics:shipment-read",

  SHIPMENT_UPDATE:
    "logistics:shipment-update",

  SHIPMENT_DELETE:
    "logistics:shipment-delete",

  // Air Cargo
  AIR_CARGO_CREATE:
    "logistics:air-cargo-create",

  AIR_CARGO_READ:
    "logistics:air-cargo-read",

  AIR_CARGO_UPDATE:
    "logistics:air-cargo-update",

  AIR_CARGO_DELETE:
    "logistics:air-cargo-delete",

  // Sea Freight
  SEA_FREIGHT_CREATE:
    "logistics:sea-freight-create",

  SEA_FREIGHT_READ:
    "logistics:sea-freight-read",

  SEA_FREIGHT_UPDATE:
    "logistics:sea-freight-update",

  SEA_FREIGHT_DELETE:
    "logistics:sea-freight-delete",

  // CHA / Customs
  CHA_CREATE:
    "logistics:cha-create",

  CHA_READ:
    "logistics:cha-read",

  CHA_UPDATE:
    "logistics:cha-update",

  CHA_DELETE:
    "logistics:cha-delete",

  // Transport
  TRANSPORTER_CREATE:
    "logistics:transporter-create",

  TRANSPORTER_READ:
    "logistics:transporter-read",

  TRANSPORTER_UPDATE:
    "logistics:transporter-update",

  TRANSPORTER_DELETE:
    "logistics:transporter-delete",

  // Warehouse
  WAREHOUSE_CREATE:
    "logistics:warehouse-create",

  WAREHOUSE_READ:
    "logistics:warehouse-read",

  WAREHOUSE_UPDATE:
    "logistics:warehouse-update",

  WAREHOUSE_DELETE:
    "logistics:warehouse-delete",

  // Tracking
  TRACKING_CREATE:
    "logistics:tracking-create",

  TRACKING_READ:
    "logistics:tracking-read",

  TRACKING_UPDATE:
    "logistics:tracking-update",

  // Documents
  DOCUMENT_CREATE:
    "logistics:document-create",

  DOCUMENT_READ:
    "logistics:document-read",

  DOCUMENT_UPDATE:
    "logistics:document-update",

  DOCUMENT_DELETE:
    "logistics:document-delete",

  // Customers
  CUSTOMER_CREATE:
    "logistics:customer-create",

  CUSTOMER_READ:
    "logistics:customer-read",

  CUSTOMER_UPDATE:
    "logistics:customer-update",

  CUSTOMER_DELETE:
    "logistics:customer-delete",

  // Vendors
  VENDOR_CREATE:
    "logistics:vendor-create",

  VENDOR_READ:
    "logistics:vendor-read",

  VENDOR_UPDATE:
    "logistics:vendor-update",

  VENDOR_DELETE:
    "logistics:vendor-delete",

  // Products / Services
  PRODUCT_SERVICE_CREATE:
    "logistics:product-service-create",

  PRODUCT_SERVICE_READ:
    "logistics:product-service-read",

  PRODUCT_SERVICE_UPDATE:
    "logistics:product-service-update",

  PRODUCT_SERVICE_DELETE:
    "logistics:product-service-delete",

  // Vendor Payments
  VENDOR_PAYMENT_CREATE:
    "logistics:vendor-payment-create",

  VENDOR_PAYMENT_READ:
    "logistics:vendor-payment-read",

  VENDOR_PAYMENT_UPDATE:
    "logistics:vendor-payment-update",

  VENDOR_PAYMENT_DELETE:
    "logistics:vendor-payment-delete",

  // Invoice
  INVOICE_CREATE:
    "logistics:invoice-create",

  INVOICE_READ:
    "logistics:invoice-read",

  INVOICE_UPDATE:
    "logistics:invoice-update",

  INVOICE_DELETE:
    "logistics:invoice-delete",

  // Reports
  REPORT_READ:
    "logistics:report-read",

  REPORT_EXPORT:
    "logistics:report-export"

});


/**
 * Standard Logistics employee permissions.
 *
 * A normal Logistics employee gets operational
 * functionality but not destructive permissions.
 */
export const LOGISTICS_EMPLOYEE_PERMISSIONS =
  Object.freeze([

    LOGISTICS_PERMISSIONS.DASHBOARD_READ,

    LOGISTICS_PERMISSIONS.SHIPMENT_CREATE,
    LOGISTICS_PERMISSIONS.SHIPMENT_READ,
    LOGISTICS_PERMISSIONS.SHIPMENT_UPDATE,

    LOGISTICS_PERMISSIONS.AIR_CARGO_CREATE,
    LOGISTICS_PERMISSIONS.AIR_CARGO_READ,
    LOGISTICS_PERMISSIONS.AIR_CARGO_UPDATE,

    LOGISTICS_PERMISSIONS.SEA_FREIGHT_CREATE,
    LOGISTICS_PERMISSIONS.SEA_FREIGHT_READ,
    LOGISTICS_PERMISSIONS.SEA_FREIGHT_UPDATE,

    LOGISTICS_PERMISSIONS.CHA_CREATE,
    LOGISTICS_PERMISSIONS.CHA_READ,
    LOGISTICS_PERMISSIONS.CHA_UPDATE,

    LOGISTICS_PERMISSIONS.TRANSPORTER_CREATE,
    LOGISTICS_PERMISSIONS.TRANSPORTER_READ,
    LOGISTICS_PERMISSIONS.TRANSPORTER_UPDATE,

    LOGISTICS_PERMISSIONS.WAREHOUSE_CREATE,
    LOGISTICS_PERMISSIONS.WAREHOUSE_READ,
    LOGISTICS_PERMISSIONS.WAREHOUSE_UPDATE,

    LOGISTICS_PERMISSIONS.TRACKING_CREATE,
    LOGISTICS_PERMISSIONS.TRACKING_READ,
    LOGISTICS_PERMISSIONS.TRACKING_UPDATE,

    LOGISTICS_PERMISSIONS.DOCUMENT_CREATE,
    LOGISTICS_PERMISSIONS.DOCUMENT_READ,
    LOGISTICS_PERMISSIONS.DOCUMENT_UPDATE,

    LOGISTICS_PERMISSIONS.CUSTOMER_CREATE,
    LOGISTICS_PERMISSIONS.CUSTOMER_READ,
    LOGISTICS_PERMISSIONS.CUSTOMER_UPDATE,

    LOGISTICS_PERMISSIONS.VENDOR_CREATE,
    LOGISTICS_PERMISSIONS.VENDOR_READ,
    LOGISTICS_PERMISSIONS.VENDOR_UPDATE,

    LOGISTICS_PERMISSIONS.PRODUCT_SERVICE_CREATE,
    LOGISTICS_PERMISSIONS.PRODUCT_SERVICE_READ,
    LOGISTICS_PERMISSIONS.PRODUCT_SERVICE_UPDATE,

    LOGISTICS_PERMISSIONS.VENDOR_PAYMENT_CREATE,
    LOGISTICS_PERMISSIONS.VENDOR_PAYMENT_READ,
    LOGISTICS_PERMISSIONS.VENDOR_PAYMENT_UPDATE,

    LOGISTICS_PERMISSIONS.INVOICE_CREATE,
    LOGISTICS_PERMISSIONS.INVOICE_READ,
    LOGISTICS_PERMISSIONS.INVOICE_UPDATE,

    LOGISTICS_PERMISSIONS.REPORT_READ
  ]);


/**
 * Logistics Manager permissions.
 *
 * Manager receives every Logistics permission,
 * including delete and export operations.
 */
export const LOGISTICS_MANAGER_PERMISSIONS =
  Object.freeze(
    Object.values(
      LOGISTICS_PERMISSIONS
    )
  );

export const LOGISTICS_SUBMODULES = Object.freeze([
  "airCargo",
  "seaFreight",
  "cha",
  "transporters",
  "warehouse",
  "tracking",
  "documents",
  "customers",
  "vendors",
  "productsServices",
  "vendorPayments",
  "invoices",
  "reports"
]);

const createStructuredPermission = ({
  subModule,
  viewScope,
  view = true,
  create = false,
  edit = false,
  delete: canDelete = false,
  updateStatus = false,
  export: canExport = false,
}) => ({
  module: "logistics",
  subModule,
  view,
  viewScope,
  create,
  edit,
  delete: canDelete,
  updateStatus,
  export: canExport,
});

export const buildStructuredLogisticsPermissions = ({ viewScope = "own", access = "readonly", subModules = LOGISTICS_SUBMODULES } = {}) => {
  const full = access === "full";
  const statusOnly = access === "statusOnly";

  return subModules.map((subModule) =>
    createStructuredPermission({
      subModule,
      viewScope,
      view: true,
      create: full,
      edit: full,
      delete: full,
      updateStatus: full || statusOnly,
      export: full,
    })
  );
};

export const DEFAULT_LOGISTICS_ROLE_PERMISSIONS = Object.freeze({
  company_admin: buildStructuredLogisticsPermissions({ viewScope: "all", access: "full" }),
  hr: buildStructuredLogisticsPermissions({ viewScope: "all", access: "readonly" }),
  hr_manager: buildStructuredLogisticsPermissions({ viewScope: "all", access: "readonly" }),
  manager: buildStructuredLogisticsPermissions({ viewScope: "team", access: "full" }),
  department_head: buildStructuredLogisticsPermissions({ viewScope: "team", access: "full" }),
  team_leader: buildStructuredLogisticsPermissions({ viewScope: "team", access: "full" }),
  employee: buildStructuredLogisticsPermissions({
    viewScope: "own",
    access: "statusOnly",
    subModules: ["airCargo", "seaFreight", "tracking", "documents"]
  })
});

export const withLogisticsRolePermissions = (roleName, permissions = []) => [
  ...permissions,
  ...(DEFAULT_LOGISTICS_ROLE_PERMISSIONS[roleName] || [])
];
