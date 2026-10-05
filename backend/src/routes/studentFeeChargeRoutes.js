import express from "express";

import {
  createStudentFeeChargeController,
  getStudentFeeChargesController,
  getStudentFeeChargeByIdController,
  updateStudentFeeChargeController,
  deleteStudentFeeChargeController,
} from "../controllers/studentFeeChargeController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getStudentFeeChargesController,
);

router.get(
  "/:studentFeeChargeId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getStudentFeeChargeByIdController,
);

router.patch(
  "/:studentFeeChargeId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateStudentFeeChargeController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createStudentFeeChargeController,
);

router.delete(
  "/:studentFeeChargeId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  deleteStudentFeeChargeController,
);

export default router;
