import express from "express";

import {
  admitStudentController,
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
  bulkUpdateStatus,
  getStudentEnrollmentHistoryController,
} from "../controllers/studentController.js";

import {
  authenticateToken,
  authorizeRoles,
  requireSchoolAccess,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentsController,
);

router.patch(
  "/bulk-status",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  bulkUpdateStatus,
);

router.get(
  "/:studentId/enrollments",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentEnrollmentHistoryController,
);

router.get(
  "/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentByIdController,
);

router.post(
  "/admit",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  admitStudentController,
);

router.patch(
  "/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateStudentController,
);

router.delete(
  "/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  deleteStudentController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createStudentController,
);

export default router;
