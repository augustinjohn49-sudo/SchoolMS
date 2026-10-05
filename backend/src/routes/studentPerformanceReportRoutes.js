import express from "express";

import { getStudentPerformanceReportController } from "../controllers/studentPerformanceReportController.js";

import {
  authenticateToken,
  authorizeRoles,
  requireSchoolAccess,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/student-performance",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getStudentPerformanceReportController,
);

export default router;
