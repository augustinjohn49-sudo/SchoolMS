import express from "express";

import {
  createStudentEnrollmentController,
  getStudentEnrollmentsController,
  getStudentEnrollmentByIdController,
  getCurrentStudentEnrollmentController,
  updateStudentEnrollmentController,
  deleteStudentEnrollmentController,
} from "../controllers/studentEnrollmentController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentEnrollmentsController,
);

router.get(
  "/student/:studentId/current",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getCurrentStudentEnrollmentController,
);

router.get(
  "/:enrollmentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentEnrollmentByIdController,
);

router.patch(
  "/:enrollmentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateStudentEnrollmentController,
);

router.delete(
  "/:enrollmentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  deleteStudentEnrollmentController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createStudentEnrollmentController,
);

export default router;
