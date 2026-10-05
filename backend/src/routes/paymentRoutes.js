import express from "express";

import {
  createPaymentController,
  getPaymentsController,
  getPaymentByIdController,
  updatePaymentStatusController,
} from "../controllers/paymentController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

/**
 * Get all payments.
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getPaymentsController,
);

/**
 * Get payment by ID.
 */
router.get(
  "/:paymentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getPaymentByIdController,
);

/**
 * Create payment.
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createPaymentController,
);

/**
 * Update payment status.
 */
router.patch(
  "/:paymentId/status",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updatePaymentStatusController,
);

export default router;
