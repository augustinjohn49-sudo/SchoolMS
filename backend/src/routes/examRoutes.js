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
