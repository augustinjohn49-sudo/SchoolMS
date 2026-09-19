import express from "express";

import { createSchoolAdminController } from "../controllers/schoolAdminController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN"),
  createSchoolAdminController,
);

export default router;
