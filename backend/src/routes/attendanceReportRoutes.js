import express from "express";

import { getAttendanceReportController } from "../controllers/attendanceReportController.js";

import {
  authenticateToken,
  authorizeRoles,
  requireSchoolAccess,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/attendance",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getAttendanceReportController,
);

export default router;
