import express from "express";

import {
  createTermController,
  getTermsByAcademicYearController,
  getTermByIdController,
  updateTermController,
  deleteTermController,
} from "../controllers/termController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/academic-year/:academicYearId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getTermsByAcademicYearController,
);

router.get(
  "/:termId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getTermByIdController,
);

router.delete(
  "/:termId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  deleteTermController,
);

router.patch(
  "/:termId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateTermController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createTermController,
);

export default router;
