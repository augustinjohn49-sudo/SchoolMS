import express from "express";

import {
  createTimetableEntryController,
  getClassTimetableController,
  getTimetableEntryByIdController,
  updateTimetableEntryController,
  deleteTimetableEntryController,
} from "../controllers/timetableController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createTimetableEntryController,
);

router.get(
  "/class/:classId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getClassTimetableController,
);

router.get(
  "/:timetableEntryId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getTimetableEntryByIdController,
);

router.patch(
  "/:timetableEntryId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateTimetableEntryController,
);

router.delete(
  "/:timetableEntryId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  deleteTimetableEntryController,
);

export default router;
