import express from "express";

import {
  createAcademicYearController,
  getAcademicYearsController,
  getAcademicYearByIdController,
  updateAcademicYearController,
} from "../controllers/academicYearController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getAcademicYearsController,
);

router.get(
  "/:academicYearId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getAcademicYearByIdController,
);

router.patch(
  "/:academicYearId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateAcademicYearController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createAcademicYearController,
);

export default router;
