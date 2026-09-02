import { Router } from "express";


import {
  requireAuth,
} from "../middleware/auth.middleware.js";


import {
  requireTenant,
} from "../middleware/tenant.middleware.js";


import {
  requireLogisticsAccess,
} from "../middleware/logisticsAccess.middleware.js";

import {
  attachLogisticsScope,
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";


import logisticsDocumentRoutes
  from "./logisticsDocument.routes.js";

import logisticsChaRoutes
  from "./logisticsCha.routes.js";

import logisticsTransporterRoutes
  from "./logisticsTransporter.routes.js";

import logisticsWarehouseRoutes
  from "./logisticsWarehouse.routes.js";

import logisticsCustomerRoutes
  from "./logisticsCustomer.routes.js";

import logisticsVendorRoutes
  from "./logisticsVendor.routes.js";

import logisticsProductServiceRoutes
  from "./logisticsProductService.routes.js";

import logisticsVendorPaymentRoutes
  from "./logisticsVendorPayment.routes.js";

import logisticsInvoiceRoutes
  from "./logisticsInvoice.routes.js";

import logisticsReportRoutes
  from "./logisticsReport.routes.js";

  import logisticsImportExportRoutes
  from "./logisticsImportExport.routes.js";


import {
  createLogisticsShipment,

  getLogisticsShipments,

  getAirCargoShipments,

  getSeaFreightShipments,

  getLogisticsDashboard,

  getLogisticsOverview,

  getLogisticsShipmentHistory,

  getLogisticsShipmentById,

  getLogisticsShipmentByNumber,

  updateLogisticsShipment,

  updateLogisticsShipmentStatus,

  deleteLogisticsShipment,
} from "../controllers/logisticsShipment.controller.js";


const router =
  Router();


/* ============================================================
   SECURITY
============================================================ */

router.use(
  requireAuth
);


router.use(
  requireTenant
);


router.use(
  requireLogisticsAccess
);


/* ============================================================
   DOCUMENTS
============================================================ */

router.use(
  "/documents",
  attachLogisticsScope("documents"),
  logisticsDocumentRoutes
);


/* ============================================================
   LOGISTICS SUBMODULES
============================================================ */

router.use(
  "/cha",
  attachLogisticsScope("cha"),
  logisticsChaRoutes
);

router.use(
  "/transporters",
  attachLogisticsScope("transporters"),
  logisticsTransporterRoutes
);

router.use(
  "/warehouse",
  attachLogisticsScope("warehouse"),
  logisticsWarehouseRoutes
);

router.use(
  "/customers",
  logisticsCustomerRoutes
);

router.use(
  "/vendors",
  logisticsVendorRoutes
);

router.use(
  "/products-services",
  logisticsProductServiceRoutes
);

router.use(
  "/vendor-payments",
  logisticsVendorPaymentRoutes
);

router.use(
  "/invoices",
  logisticsInvoiceRoutes
);

router.use(
  "/reports",
  logisticsReportRoutes
);

router.use(
  "/import-export",
  logisticsImportExportRoutes
);
/* ============================================================
   DASHBOARD
============================================================ */

router.get(
  "/dashboard",
  attachLogisticsScope("airCargo"),
  getLogisticsDashboard
);

router.get(
  "/overview",
  attachLogisticsScope("airCargo"),
  getLogisticsOverview
);


/* ============================================================
   MODE-SPECIFIC LISTS
============================================================ */

router.get(
  "/shipments/air-cargo",
  attachLogisticsScope("airCargo"),
  getAirCargoShipments
);


router.get(
  "/shipments/sea-freight",
  attachLogisticsScope("seaFreight"),
  getSeaFreightShipments
);


/* ============================================================
   SHIPMENT NUMBER LOOKUP

   IMPORTANT:
   Keep this ABOVE /shipments/:id
============================================================ */

router.get(
  "/shipments/number/:shipmentNumber",
  attachLogisticsScope("tracking"),
  getLogisticsShipmentByNumber
);


/* ============================================================
   SHIPMENT CRUD
============================================================ */

router
  .route(
    "/shipments"
  )

  .get(
    attachLogisticsScope("airCargo"),
    getLogisticsShipments
  )

  .post(
    requireLogisticsPermission("create", "airCargo"),
    createLogisticsShipment
  );


router
  .route(
    "/shipments/:id"
  )

  .get(
    attachLogisticsScope("tracking"),
    getLogisticsShipmentById
  )

  .patch(
    requireLogisticsPermission("edit", "airCargo"),
    updateLogisticsShipment
  )

  .delete(
    requireLogisticsPermission("delete", "airCargo"),
    deleteLogisticsShipment
  );


/* ============================================================
   STATUS
============================================================ */

router.get(
  "/shipments/:id/history",
  attachLogisticsScope("tracking"),
  getLogisticsShipmentHistory
);

router.patch(
  "/shipments/:id/status",
  requireLogisticsPermission("updateStatus", "tracking"),
  updateLogisticsShipmentStatus
);


export default router;