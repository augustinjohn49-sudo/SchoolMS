import express from "express";

import { getAttendanceReportController } from "../controllers/attendanceReportController.js";

import {
  authenticateToken,
  authorizeRoles,
  requireSchoolAccess,
} from "../middleware/authMiddleware.js";

import { getLowAttendanceAlertsController } from "../controllers/attendanceAlertController.js";
import { generateLowAttendanceNotificationsController } from "../controllers/attendanceNotificationController.js";

const router = express.Router();

router.get(
  "/attendance",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getAttendanceReportController,
);

router.get(
  "/attendance/low-attendance-alerts",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getLowAttendanceAlertsController,
);

router.post(
  "/attendance/low-attendance-alerts/notifications",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  generateLowAttendanceNotificationsController,
);

export default router;
