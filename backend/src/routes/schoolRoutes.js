import express from "express";

import {
  createSchool,
  getSchools,
  getSchoolById,
} from "../controllers/schoolController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN"),
  createSchool,
);

router.get("/", authenticateToken, authorizeRoles("SUPER_ADMIN"), getSchools);

router.get("/:schoolId", authenticateToken, requireSchoolAccess, getSchoolById);

export default router;
