import {
  createNotification,
  getNotificationsForUser,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from "../services/notificationService.js";

export const createNotificationController = async (req, res) => {
  try {
    const { title, message, type, recipientUserIds } = req.body;

    const notification = await createNotification({
      schoolId: req.user.schoolId,
      title,
      message,
      type,
      recipientUserIds,
    });

    return res.status(201).json({
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);

    const statusCodes = {
      SCHOOL_REQUIRED: 400,
      REQUIRED_FIELDS: 400,
      INVALID_NOTIFICATION_TYPE: 400,
      RECIPIENTS_REQUIRED: 400,
      INVALID_RECIPIENTS: 400,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to create notification",
    });
  }
};

export const getNotificationsController = async (req, res) => {
  try {
    const { isRead, type, page, limit } = req.query;

    const result = await getNotificationsForUser({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
      isRead,
      type,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get notifications error:", error);

    const statusCodes = {
      INVALID_NOTIFICATION_TYPE: 400,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to retrieve notifications",
    });
  }
};

export const getNotificationByIdController = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await getNotificationById({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
      notificationId,
    });

    return res.status(200).json({
      notification,
    });
  } catch (error) {
    console.error("Get notification by ID error:", error);

    const statusCodes = {
      NOTIFICATION_NOT_FOUND: 404,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to retrieve notification",
    });
  }
};

export const markNotificationAsReadController = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const recipient = await markNotificationAsRead({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
      notificationId,
    });

    return res.status(200).json({
      message: "Notification marked as read",
      recipient,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    const statusCodes = {
      NOTIFICATION_RECIPIENT_NOT_FOUND: 404,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to mark notification as read",
    });
  }
};

export const markAllNotificationsAsReadController = async (req, res) => {
  try {
    const result = await markAllNotificationsAsRead({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
    });

    return res.status(200).json({
      message: "All notifications marked as read",
      ...result,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark all notifications as read",
    });
  }
};

export const getUnreadNotificationCountController = async (req, res) => {
  try {
    const result = await getUnreadNotificationCount({
      schoolId: req.user.schoolId,
      userId: req.user.userId,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get unread notification count error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve unread notification count",
    });
  }
};
