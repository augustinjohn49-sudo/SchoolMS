import express from "express";

import { createStudentEnrollmentController } from "../controllers/studentEnrollmentController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createStudentEnrollmentController,
);

export default router;
