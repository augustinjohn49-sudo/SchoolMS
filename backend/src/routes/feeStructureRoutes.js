import express from "express";

import {
  createFeeStructureController,
  getFeeStructuresController,
  getFeeStructureByIdController,
  updateFeeStructureController,
  activateFeeStructureController,
  archiveFeeStructureController,
  addFeeStructureItemController,
  updateFeeStructureItemController,
  deleteFeeStructureItemController,
} from "../controllers/feeStructureController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getFeeStructuresController,
);

router.get(
  "/:feeStructureId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getFeeStructureByIdController,
);

router.patch(
  "/:feeStructureId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateFeeStructureController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createFeeStructureController,
);

router.patch(
  "/:feeStructureId/activate",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  activateFeeStructureController,
);

router.patch(
  "/:feeStructureId/archive",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  archiveFeeStructureController,
);

router.post(
  "/:feeStructureId/items",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  addFeeStructureItemController,
);

router.patch(
  "/:feeStructureId/items/:itemId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateFeeStructureItemController,
);

router.delete(
  "/:feeStructureId/items/:itemId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  deleteFeeStructureItemController,
);

export default router;
