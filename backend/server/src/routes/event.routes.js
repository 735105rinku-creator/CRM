import { Router } from "express";

import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  getEventDashboard,
} from "../controllers/event.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/* ================= DASHBOARD ================= */

router.get(
  "/dashboard",
  getEventDashboard
);

/* ================= EVENTS ================= */

router.post(
  "/",
  createEvent
);

router.get(
  "/",
  getEvents
);

router.get(
  "/:id",
  getEventById
);

router.patch(
  "/:id",
  updateEvent
);

router.patch(
  "/:id/status",
  updateEventStatus
);

router.delete(
  "/:id",
  deleteEvent
);

export default router;
