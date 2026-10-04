import express from "express";

import {
  createConversationController,
  getConversationsController,
  getConversationByIdController,
  sendMessageController,
  getConversationMessagesController,
  markConversationAsReadController,
} from "../controllers/messagingController.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

const messagingRoles = ["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"];

router.post(
  "/conversations",
  authenticateToken,
  authorizeRoles(...messagingRoles),
  createConversationController,
);

router.get(
  "/conversations",
  authenticateToken,
  authorizeRoles(...messagingRoles),
  getConversationsController,
);

router.get(
  "/conversations/:conversationId",
  authenticateToken,
  authorizeRoles(...messagingRoles),
  getConversationByIdController,
);

router.post(
  "/conversations/:conversationId/messages",
  authenticateToken,
  authorizeRoles(...messagingRoles),
  sendMessageController,
);

router.get(
  "/conversations/:conversationId/messages",
  authenticateToken,
  authorizeRoles(...messagingRoles),
  getConversationMessagesController,
);

router.patch(
  "/conversations/:conversationId/read",
  authenticateToken,
  authorizeRoles(...messagingRoles),
  markConversationAsReadController,
);

export default router;
