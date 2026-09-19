import express from "express";

import { createSchool, getSchools } from "../controllers/schoolController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Only authenticated Super Admins can manage schools.
router.post(
  "/",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN"),
  createSchool,
);

router.get("/", authenticateToken, authorizeRoles("SUPER_ADMIN"), getSchools);

export default router;
