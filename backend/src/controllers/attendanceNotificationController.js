import { generateLowAttendanceNotifications } from "../services/attendanceNotificationService.js";

export async function generateLowAttendanceNotificationsController(req, res) {
  try {
    const {
      dateFrom,
      dateTo,
      threshold = 75,
      academicYearId = null,
      classId = null,
    } = req.body;

    const result = await generateLowAttendanceNotifications({
      schoolId: req.user.schoolId,
      dateFrom,
      dateTo,
      threshold,
      academicYearId,
      classId,
    });

    return res.status(200).json({
      message: "Attendance notifications processed successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Generate attendance notifications error:", error);

    const statusCodes = {
      SCHOOL_REQUIRED: 400,
      INVALID_DATE: 400,
      INVALID_DATE_RANGE: 400,
      INVALID_THRESHOLD: 400,
      NO_ACTIVE_SCHOOL_ADMIN: 409,
    };

    return res.status(statusCodes[error.code] || 500).json({
      success: false,
      message: error.message || "Failed to generate attendance notifications.",
    });
  }
}
