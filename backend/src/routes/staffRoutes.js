import express from "express";

import {
  createStaffController,
  getStaffController,
  getStaffByIdController,
  updateStaffController,
} from "../controllers/staffController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Create staff member
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createStaffController,
);

/**
 * Get all staff members for the logged-in school
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStaffController,
);

/**
 * Update staff member
 */
router.patch(
  "/:staffId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateStaffController,
);

/**
 * Get one staff member
 */
router.get(
  "/:staffId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStaffByIdController,
);

export default router;
