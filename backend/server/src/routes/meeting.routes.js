import { Router } from "express";

import {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  updateMeetingStatus,
  joinMeeting,
  leaveMeeting,
  approveMeetingJoin,
  sendMeetingMessage,
  getMeetingMessages,
  deleteMeeting,
  getMeetingDashboard,
} from "../controllers/meeting.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get(
  "/dashboard",
  getMeetingDashboard
);

router.post(
  "/",
  createMeeting
);

router.get(
  "/",
  getMeetings
);

router.post(
  "/:id/join",
  joinMeeting
);

router.post(
  "/:id/leave",
  leaveMeeting
);

router.patch(
  "/:id/join-request",
  approveMeetingJoin
);

router.post(
  "/:id/messages",
  sendMeetingMessage
);

router.get(
  "/:id/messages",
  getMeetingMessages
);

router.patch(
  "/:id/status",
  updateMeetingStatus
);

router.get(
  "/:id",
  getMeetingById
);

router.patch(
  "/:id",
  updateMeeting
);

router.delete(
  "/:id",
  deleteMeeting
);

export default router;
