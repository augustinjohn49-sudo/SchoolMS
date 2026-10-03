import express from "express";

import {
  createGradeController,
  getGradesController,
  getGradeByIdController,
  updateGradeController,
  deleteGradeController,
} from "../controllers/gradeController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/:gradingScaleId/grades",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getGradesController,
);

router.get(
  "/:gradingScaleId/grades/:gradeId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getGradeByIdController,
);

router.post(
  "/:gradingScaleId/grades",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createGradeController,
);

router.patch(
  "/:gradingScaleId/grades/:gradeId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateGradeController,
);

router.delete(
  "/:gradingScaleId/grades/:gradeId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  deleteGradeController,
);

export default router;
