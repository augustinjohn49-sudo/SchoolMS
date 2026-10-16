import express from "express";

import { getAttendanceReportController } from "../controllers/attendanceReportController.js";

import {
  authenticateToken,
  authorizeRoles,
  requireSchoolAccess,
} from "../middleware/authMiddleware.js";

import { getLowAttendanceAlertsController } from "../controllers/attendanceAlertController.js";

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

export default router;
