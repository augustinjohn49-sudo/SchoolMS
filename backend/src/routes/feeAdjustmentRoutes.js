import express from "express";

import {
  createFeeAdjustmentController,
  getFeeAdjustmentsController,
  getFeeAdjustmentByIdController,
} from "../controllers/feeAdjustmentController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getFeeAdjustmentsController,
);

router.get(
  "/:adjustmentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getFeeAdjustmentByIdController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createFeeAdjustmentController,
);

export default router;
