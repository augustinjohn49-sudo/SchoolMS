import express from "express";

import {
  createStreamController,
  getStreamsByClassController,
  getStreamByIdController,
  updateStreamController,
  deleteStreamController,
} from "../controllers/streamController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireSchoolAccess } from "../middleware/schoolAccessMiddleware.js";

const router = express.Router();

router.get(
  "/class/:classId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getStreamsByClassController,
);

router.get(
  "/:streamId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  getStreamByIdController,
);

router.patch(
  "/:streamId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  updateStreamController,
);

router.delete(
  "/:streamId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  deleteStreamController,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  requireSchoolAccess,
  createStreamController,
);

export default router;
