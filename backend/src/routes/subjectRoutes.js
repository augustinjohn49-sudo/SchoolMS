import express from "express";

import {
  createSubjectController,
  getSubjectsController,
  getSubjectByIdController,
  updateSubjectController,
} from "../controllers/subjectController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getSubjectsController,
);

router.get(
  "/:subjectId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getSubjectByIdController,
);

router.patch(
  "/:subjectId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateSubjectController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createSubjectController,
);

export default router;
