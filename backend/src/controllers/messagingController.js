import {
  createConversation,
  getConversationsForUser,
  getConversationById,
  sendMessage,
  getConversationMessages,
  markConversationAsRead,
} from "../services/messagingService.js";

export const createConversationController = async (req, res) => {
  try {
    const { participantUserIds } = req.body;

    const conversation = await createConversation({
      schoolId: req.user.schoolId,
      createdByUserId: req.user.userId,
      participantUserIds,
    });

    return res.status(201).json({
      message: "Conversation created successfully",
      conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);

    const statusCodes = {
      SCHOOL_REQUIRED: 400,
      CREATOR_REQUIRED: 400,
      PARTICIPANTS_REQUIRED: 400,
      INVALID_PARTICIPANTS: 400,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to create conversation",
    });
  }
};

export const getConversationsController = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const result = await getConversationsForUser({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get conversations error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve conversations",
    });
  }
};

export const getConversationByIdController = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await getConversationById({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
      conversationId,
    });

    return res.status(200).json({
      conversation,
    });
  } catch (error) {
    console.error("Get conversation by ID error:", error);

    const statusCodes = {
      CONVERSATION_ACCESS_DENIED: 403,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to retrieve conversation",
    });
  }
};

export const sendMessageController = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    const message = await sendMessage({
      schoolId: req.user.schoolId,
      senderUserId: req.user.userId,
      conversationId,
      content,
    });

    return res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);

    const statusCodes = {
      MESSAGE_CONTENT_REQUIRED: 400,
      CONVERSATION_ACCESS_DENIED: 403,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

export const getConversationMessagesController = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const { page, limit } = req.query;

    const result = await getConversationMessages({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
      conversationId,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get conversation messages error:", error);

    const statusCodes = {
      CONVERSATION_ACCESS_DENIED: 403,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to retrieve conversation messages",
    });
  }
};

export const markConversationAsReadController = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const participant = await markConversationAsRead({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
      conversationId,
    });

    return res.status(200).json({
      message: "Conversation marked as read",
      participant,
    });
  } catch (error) {
    console.error("Mark conversation as read error:", error);

    const statusCodes = {
      CONVERSATION_ACCESS_DENIED: 403,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to mark conversation as read",
    });
  }
};
