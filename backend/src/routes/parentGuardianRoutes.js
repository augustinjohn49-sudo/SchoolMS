import express from "express";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

import {
  createParentGuardianController,
  getParentGuardianByIdController,
  getParentGuardiansController,
  updateParentGuardianController,
  deactivateParentGuardianController,
  linkGuardianToStudentController,
  unlinkGuardianFromStudentController,
  getStudentGuardiansController,
  getGuardianStudentsController,
  activateParentGuardianController,
} from "../controllers/parentGuardianController.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  createParentGuardianController,
);

router.get(
  "/",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getParentGuardiansController,
);

router.get(
  "/student/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getStudentGuardiansController,
);

router.get(
  "/:parentGuardianId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getParentGuardianByIdController,
);

router.get(
  "/:parentGuardianId/students",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  getGuardianStudentsController,
);

router.patch(
  "/:parentGuardianId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  updateParentGuardianController,
);

router.patch(
  "/:parentGuardianId/deactivate",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  deactivateParentGuardianController,
);

router.post(
  "/:parentGuardianId/students",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  linkGuardianToStudentController,
);

router.patch(
  "/:parentGuardianId/activate",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  activateParentGuardianController,
);

router.delete(
  "/:parentGuardianId/students/:studentId",
  authenticateToken,
  authorizeRoles("SCHOOL_ADMIN"),
  unlinkGuardianFromStudentController,
);

export default router;
