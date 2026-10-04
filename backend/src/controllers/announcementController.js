import {
  createAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  getAnnouncementRecipients,
  markAnnouncementAsRead,
} from "../services/announcementService.js";

export const createAnnouncementController = async (req, res) => {
  try {
    const announcement = await createAnnouncement({
      schoolId: req.user.schoolId,
      createdByUserId: req.user.userId,
      title: req.body.title,
      content: req.body.content,
      audience: req.body.audience,
    });

    return res.status(201).json({
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    console.error("Create announcement error:", error);

    const statusCode =
      error.code === "REQUIRED_FIELDS" || error.code === "INVALID_AUDIENCE"
        ? 400
        : error.code === "SCHOOL_REQUIRED"
          ? 403
          : 500;

    return res.status(statusCode).json({
      message: error.message || "Failed to create announcement",
      code: error.code,
    });
  }
};

export const getAnnouncementByIdController = async (req, res) => {
  try {
    const announcement = await getAnnouncementById({
      schoolId: req.user.schoolId,
      announcementId: req.params.announcementId,
    });

    return res.status(200).json({
      announcement,
    });
  } catch (error) {
    console.error("Get announcement error:", error);

    const statusCode = error.code === "ANNOUNCEMENT_NOT_FOUND" ? 404 : 500;

    return res.status(statusCode).json({
      message: error.message || "Failed to retrieve announcement",
      code: error.code,
    });
  }
};

export const getAnnouncementsController = async (req, res) => {
  try {
    const announcements = await getAnnouncements({
      schoolId: req.user.schoolId,
      status: req.query.status,
      audience: req.query.audience,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json(announcements);
  } catch (error) {
    console.error("Get announcements error:", error);

    return res.status(500).json({
      message: error.message || "Failed to retrieve announcements",
      code: error.code,
    });
  }
};

export const updateAnnouncementController = async (req, res) => {
  try {
    const announcement = await updateAnnouncement({
      schoolId: req.user.schoolId,
      announcementId: req.params.announcementId,
      title: req.body.title,
      content: req.body.content,
      audience: req.body.audience,
    });

    return res.status(200).json({
      message: "Announcement updated successfully",
      announcement,
    });
  } catch (error) {
    console.error("Update announcement error:", error);

    const statusCode =
      error.code === "ANNOUNCEMENT_NOT_FOUND"
        ? 404
        : error.code === "ANNOUNCEMENT_NOT_EDITABLE" ||
            error.code === "INVALID_AUDIENCE"
          ? 400
          : 500;

    return res.status(statusCode).json({
      message: error.message || "Failed to update announcement",
      code: error.code,
    });
  }
};

export const publishAnnouncementController = async (req, res) => {
  try {
    const announcement = await publishAnnouncement({
      schoolId: req.user.schoolId,
      announcementId: req.params.announcementId,
    });

    return res.status(200).json({
      message: "Announcement published successfully",
      announcement,
    });
  } catch (error) {
    console.error("Publish announcement error:", error);

    const statusCode =
      error.code === "ANNOUNCEMENT_NOT_FOUND"
        ? 404
        : error.code === "INVALID_STATUS_TRANSITION"
          ? 400
          : 500;

    return res.status(statusCode).json({
      message: error.message || "Failed to publish announcement",
      code: error.code,
    });
  }
};

export const archiveAnnouncementController = async (req, res) => {
  try {
    const announcement = await archiveAnnouncement({
      schoolId: req.user.schoolId,
      announcementId: req.params.announcementId,
    });

    return res.status(200).json({
      message: "Announcement archived successfully",
      announcement,
    });
  } catch (error) {
    console.error("Archive announcement error:", error);

    const statusCode =
      error.code === "ANNOUNCEMENT_NOT_FOUND"
        ? 404
        : error.code === "INVALID_STATUS_TRANSITION"
          ? 400
          : 500;

    return res.status(statusCode).json({
      message: error.message || "Failed to archive announcement",
      code: error.code,
    });
  }
};

export const getAnnouncementRecipientsController = async (req, res) => {
  try {
    const recipients = await getAnnouncementRecipients({
      schoolId: req.user.schoolId,
      announcementId: req.params.announcementId,
      isRead: req.query.isRead,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json(recipients);
  } catch (error) {
    console.error("Get announcement recipients error:", error);

    const statusCode = error.code === "ANNOUNCEMENT_NOT_FOUND" ? 404 : 500;

    return res.status(statusCode).json({
      message: error.message || "Failed to retrieve announcement recipients",
      code: error.code,
    });
  }
};

export const markAnnouncementAsReadController = async (req, res) => {
  try {
    const recipient = await markAnnouncementAsRead({
      schoolId: req.user.schoolId,
      announcementId: req.params.announcementId,
      userId: req.user.userId,
    });

    return res.status(200).json({
      message: "Announcement marked as read",
      recipient,
    });
  } catch (error) {
    console.error("Mark announcement as read error:", error);

    const statusCode =
      error.code === "ANNOUNCEMENT_RECIPIENT_NOT_FOUND" ? 404 : 500;

    return res.status(statusCode).json({
      message: error.message || "Failed to mark announcement as read",
      code: error.code,
    });
  }
};
