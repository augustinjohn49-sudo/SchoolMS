import express from "express";

import {
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController,
} from "../controllers/studentController.js";

import {
  authenticateToken,
  authorizeRoles,
  requireSchoolAccess,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentsController,
);

router.get(
  "/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentByIdController,
);

router.patch(
  "/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateStudentController,
);

router.delete(
  "/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  deleteStudentController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createStudentController,
);

export default router;
