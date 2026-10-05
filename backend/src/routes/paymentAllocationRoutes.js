import express from "express";

import {
  createPaymentAllocationController,
  getPaymentAllocationsController,
  getPaymentAllocationByIdController,
} from "../controllers/paymentAllocationController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getPaymentAllocationsController,
);

router.get(
  "/:allocationId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getPaymentAllocationByIdController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createPaymentAllocationController,
);

export default router;
