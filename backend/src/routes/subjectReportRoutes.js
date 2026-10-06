import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";
import { getSubjectReportController } from "../controllers/subjectReportController.js";

const router = express.Router();

router.get(
  "/subjects",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getSubjectReportController,
);

export default router;
