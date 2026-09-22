import express from "express";

import {
  createStudentEnrollmentController,
  getStudentEnrollmentsController,
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

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createStudentEnrollmentController,
);

export default router;
