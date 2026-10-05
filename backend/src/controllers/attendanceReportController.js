import { getAttendanceReport } from "../services/attendanceReportService.js";

export async function getAttendanceReportController(req, res) {
  try {
    const {
      academicYearId,
      termId,
      classId,
      streamId,
      studentId,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
    } = req.query;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const report = await getAttendanceReport({
      schoolId,
      academicYearId,
      termId,
      classId,
      streamId,
      studentId,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Attendance report retrieved successfully.",
      data: report,
    });
  } catch (error) {
    console.error("Get attendance report error:", error);

    const clientErrors = [
      "SCHOOL_REQUIRED",
      "INVALID_DATE",
      "INVALID_DATE_RANGE",
      "INVALID_STATUS",
      "INVALID_PAGE",
      "INVALID_LIMIT",
    ];

    if (clientErrors.includes(error.code)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance report.",
    });
  }
}
