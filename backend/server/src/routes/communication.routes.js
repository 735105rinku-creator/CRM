import { Router } from "express";

import {
  sendMessage,
  getEmployeeMessageRecipients,
  getMessages,
  getMessageById,
  markMessageRead,

  sendNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/communication.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireTenant } from "../middleware/tenant.middleware.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(requireAuth);
router.use(requireTenant);

/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
*/

router.post("/messages", sendMessage);

router.get("/messages/employee-recipients", getEmployeeMessageRecipients);

router.get("/messages", getMessages);

router.get("/messages/:id", getMessageById);

router.patch("/messages/:id/read", markMessageRead);

/*
|--------------------------------------------------------------------------
| Notifications
|--------------------------------------------------------------------------
*/

router.post("/notifications", sendNotification);

router.get("/notifications", getNotifications);

router.get("/notifications/unread-count", getUnreadNotificationCount);

// IMPORTANT: Static route before dynamic route
router.patch("/notifications/read-all", markAllNotificationsRead);

router.patch("/notifications/:id/read", markNotificationRead);

export default router;


