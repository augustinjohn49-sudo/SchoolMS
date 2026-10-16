import { getLowAttendanceAlerts } from "../services/attendanceAlertService.js";

export async function getLowAttendanceAlertsController(req, res) {
  try {
    const {
      dateFrom,
      dateTo,
      threshold = 75,
      academicYearId,
      classId,
    } = req.query;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: "dateFrom and dateTo are required (YYYY-MM-DD).",
      });
    }

    const data = await getLowAttendanceAlerts({
      schoolId,
      dateFrom,
      dateTo,
      threshold,
      academicYearId,
      classId,
    });

    return res.status(200).json({
      success: true,
      message: "Low-attendance alerts retrieved successfully.",
      data,
    });
  } catch (error) {
    console.error("Get low-attendance alerts error:", error);

    if (
      [
        "SCHOOL_REQUIRED",
        "INVALID_DATE",
        "INVALID_DATE_RANGE",
        "INVALID_THRESHOLD",
      ].includes(error.code)
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve low-attendance alerts.",
    });
  }
}
