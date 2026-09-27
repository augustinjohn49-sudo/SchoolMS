import express from "express";

import {
  createClassSubjectController,
  getClassSubjectsController,
  getClassSubjectByIdController,
  deleteClassSubjectController,
} from "../controllers/classSubjectController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/class/:classId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getClassSubjectsController,
);

router.get(
  "/:classSubjectId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getClassSubjectByIdController,
);

router.delete(
  "/:classSubjectId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  deleteClassSubjectController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createClassSubjectController,
);

export default router;
