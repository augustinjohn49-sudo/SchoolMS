import express from "express";

import { createAcademicYearController } from "../controllers/academicYearController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createAcademicYearController,
);

export default router;
