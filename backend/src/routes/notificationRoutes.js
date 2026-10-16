import express from "express";

import {
  createNotificationController,
  getNotificationsController,
  getNotificationByIdController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  getUnreadNotificationCountController,
} from "../controllers/notificationController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createNotificationController,
);

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"),
  getNotificationsController,
);

router.get(
  "/unread-count",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"),
  getUnreadNotificationCountController,
);

router.patch(
  "/read-all",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"),
  markAllNotificationsAsReadController,
);

router.get(
  "/:notificationId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"),
  getNotificationByIdController,
);

router.patch(
  "/:notificationId/read",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"),
  markNotificationAsReadController,
);

export default router;
