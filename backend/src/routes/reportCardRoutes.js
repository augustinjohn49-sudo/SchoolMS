import express from "express";

import {
  createReportCardController,
  createReportCardSubjectController,
  getReportCardsController,
  getReportCardByIdController,
  updateClassTeacherCommentController,
  updateHeadTeacherCommentController,
  approveReportCardController,
  publishReportCardController,
  generateReportCardController,
} from "../controllers/reportCardController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Create a report card
 * POST /api/report-cards
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER"),
  createReportCardController,
);

/**
 * Add a subject result to a report card
 * POST /api/report-cards/:reportCardId/subjects
 */
router.post(
  "/:reportCardId/subjects",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER"),
  createReportCardSubjectController,
);

/**
 * Get all report cards for the authenticated school
 *
 * Optional query parameters:
 * ?academicYearId=...
 * ?termId=...
 * ?studentId=...
 *
 * GET /api/report-cards
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER"),
  getReportCardsController,
);

/**
 * Get one report card by ID
 * GET /api/report-cards/:reportCardId
 */
router.get(
  "/:reportCardId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER"),
  getReportCardByIdController,
);

/**
 * Update class teacher comment for a report card
 * PATCH /api/report-cards/:reportCardId/class-teacher-comment
 */
router.patch(
  "/:reportCardId/class-teacher-comment",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER"),
  updateClassTeacherCommentController,
);

/**
 * Update head teacher comment for a report card
 * PATCH /api/report-cards/:reportCardId/head-teacher-comment
 */
router.patch(
  "/:reportCardId/head-teacher-comment",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN", "TEACHER"),
  updateHeadTeacherCommentController,
);

/**
 * Approve a report card
 * PATCH /api/report-cards/:reportCardId/approve
 */
router.patch(
  "/:reportCardId/approve",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  approveReportCardController,
);

/**
 * Publish a report card
 * PATCH /api/report-cards/:reportCardId/publish
 */
router.patch(
  "/:reportCardId/publish",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  publishReportCardController,
);

/**
 * Generate a report card for a student
 * POST /api/report-cards/generate
 */
router.get(
  "/:reportCardId/generate",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  generateReportCardController,
);

export default router;
