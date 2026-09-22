import express from "express";

import {
  createStudentEnrollmentController,
  getStudentEnrollmentsController,
  getStudentEnrollmentByIdController,
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
  "/:enrollmentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentEnrollmentByIdController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createStudentEnrollmentController,
);

export default router;
