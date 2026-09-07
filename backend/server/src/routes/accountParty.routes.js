import {
  Router,
} from "express";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";

import {
  listCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
  listVendors,
  createVendor,
  getVendor,
  updateVendor,
} from "../controllers/accountParty.controller.js";


const router =
  Router();


/* ============================================================
   CUSTOMERS

   Final URLs:

   GET    /accounting/customers
   POST   /accounting/customers
   GET    /accounting/customers/:id
   PATCH  /accounting/customers/:id
============================================================ */

router
  .route(
    "/customers"
  )

  .get(
    asyncHandler(
      listCustomers
    )
  )

  .post(
    asyncHandler(
      createCustomer
    )
  );


router
  .route(
    "/customers/:id"
  )

  .get(
    asyncHandler(
      getCustomer
    )
  )

  .patch(
    asyncHandler(
      updateCustomer
    )
  );


/* ============================================================
   VENDORS

   Final URLs:

   GET    /accounting/vendors
   POST   /accounting/vendors
   GET    /accounting/vendors/:id
   PATCH  /accounting/vendors/:id
============================================================ */

router
  .route(
    "/vendors"
  )

  .get(
    asyncHandler(
      listVendors
    )
  )

  .post(
    asyncHandler(
      createVendor
    )
  );


router
  .route(
    "/vendors/:id"
  )

  .get(
    asyncHandler(
      getVendor
    )
  )

  .patch(
    asyncHandler(
      updateVendor
    )
  );


/*
 * Intentionally NO DELETE route.
 *
 * Historical accounting party ledgers must be preserved.
 * Deactivation is performed by updating status to "inactive".
 */


export default router;
