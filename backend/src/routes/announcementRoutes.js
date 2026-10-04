import express from "express";

import {
  createAnnouncementController,
  getAnnouncementByIdController,
  getAnnouncementsController,
  updateAnnouncementController,
  publishAnnouncementController,
  archiveAnnouncementController,
  getAnnouncementRecipientsController,
  markAnnouncementAsReadController,
} from "../controllers/announcementController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
 * School Admin Management Routes
 */

// Create a new announcement
router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createAnnouncementController,
);

// Get all announcements
router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getAnnouncementsController,
);

// Get a single announcement
router.get(
  "/:announcementId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getAnnouncementByIdController,
);

// Update a draft announcement
router.patch(
  "/:announcementId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateAnnouncementController,
);

// Publish a draft announcement
router.patch(
  "/:announcementId/publish",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  publishAnnouncementController,
);

// Archive a published announcement
router.patch(
  "/:announcementId/archive",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  archiveAnnouncementController,
);

// Get announcement recipients
router.get(
  "/:announcementId/recipients",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getAnnouncementRecipientsController,
);

/*
 * Recipient Routes
 *
 * Teachers, parents, and students can mark
 * announcements they received as read.
 */

// Mark an announcement as read
router.patch(
  "/:announcementId/read",
  authenticateToken,
  authorizeRoles("TEACHER", "PARENT", "STUDENT"),
  markAnnouncementAsReadController,
);

export default router;
