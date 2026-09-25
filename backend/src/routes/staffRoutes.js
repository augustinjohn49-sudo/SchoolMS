import express from "express";

import {
  createStaffController,
  getStaffController,
  getStaffByIdController,
  updateStaffController,
  createStaffAccountController,
  updateStaffAccountStatusController,
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
 * Create and link a login account for a staff member
 */
router.post(
  "/:staffId/account",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createStaffAccountController,
);

router.patch(
  "/:staffId/account-status",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateStaffAccountStatusController,
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
