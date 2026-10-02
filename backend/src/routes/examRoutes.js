import express from "express";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  createExamController,
  getExamsController,
  getExamByIdController,
  updateExamController,
  deleteExamController,
} from "../controllers/examController.js";

import {
  assignSubjectToExamController,
  getExamSubjectsController,
  removeSubjectFromExamController,
} from "../controllers/examSubjectController.js";

import {
  createExamResultController,
  getExamResultsController,
  getExamResultByIdController,
  updateExamResultController,
  deleteExamResultController,
} from "../controllers/examResultController.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createExamController,
);

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getExamsController,
);

router.post(
  "/:examId/subjects",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  assignSubjectToExamController,
);

router.get(
  "/:examId/subjects",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getExamSubjectsController,
);

router.delete(
  "/:examId/subjects/:examSubjectId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  removeSubjectFromExamController,
);

router.post(
  "/:examId/results",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createExamResultController,
);

router.get(
  "/:examId/results",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getExamResultsController,
);

router.get(
  "/:examId/results/:examResultId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getExamResultByIdController,
);

router.patch(
  "/:examId/results/:examResultId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateExamResultController,
);

router.delete(
  "/:examId/results/:examResultId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  deleteExamResultController,
);

router.get(
  "/:examId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getExamByIdController,
);

router.patch(
  "/:examId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateExamController,
);

router.delete(
  "/:examId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  deleteExamController,
);

export default router;
