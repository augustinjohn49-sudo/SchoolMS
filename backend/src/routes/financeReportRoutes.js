import express from "express";

import {
  getFinanceSummaryController,
  getStudentBalancesController,
  getPaymentReportController,
} from "../controllers/financeReportController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/summary",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getFinanceSummaryController,
);

router.get(
  "/student-balances",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getStudentBalancesController,
);

router.get(
  "/payments",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getPaymentReportController,
);

export default router;
