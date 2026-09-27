import express from "express";

import {
  createTeacherClassSubjectController,
  getTeacherClassSubjectsController,
  getTeacherClassSubjectByIdController,
  deleteTeacherClassSubjectController,
} from "../controllers/teacherClassSubjectController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/teacher/:staffId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getTeacherClassSubjectsController,
);

router.get(
  "/:assignmentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getTeacherClassSubjectByIdController,
);

router.delete(
  "/:assignmentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  deleteTeacherClassSubjectController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createTeacherClassSubjectController,
);

export default router;
