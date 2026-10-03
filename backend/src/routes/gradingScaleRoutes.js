import express from "express";

import {
  createGradingScaleController,
  getGradingScalesController,
  getGradingScaleByIdController,
  updateGradingScaleController,
  deleteGradingScaleController,
} from "../controllers/gradingScaleController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getGradingScalesController,
);

router.get(
  "/:gradingScaleId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getGradingScaleByIdController,
);

router.patch(
  "/:gradingScaleId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateGradingScaleController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createGradingScaleController,
);

router.delete(
  "/:gradingScaleId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  deleteGradingScaleController,
);

export default router;
