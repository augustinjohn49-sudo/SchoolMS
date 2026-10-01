import express from "express";

import {
  createAttendanceController,
  getClassAttendanceByDateController,
  getStudentAttendanceByDateRangeController,
  getStudentAttendanceSummaryController,
  updateAttendanceController,
  deleteAttendanceController,
} from "../controllers/attendanceController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createAttendanceController,
);

router.get(
  "/class/:classId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getClassAttendanceByDateController,
);

router.get(
  "/student/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentAttendanceByDateRangeController,
);

router.get(
  "/student/:studentId/summary",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentAttendanceSummaryController,
);

router.patch(
  "/:attendanceId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateAttendanceController,
);

router.delete(
  "/:attendanceId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  deleteAttendanceController,
);

export default router;
