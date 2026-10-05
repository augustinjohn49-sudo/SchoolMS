import { getStudentPerformanceReport } from "../services/studentPerformanceReportService.js";

export async function getStudentPerformanceReportController(req, res) {
  try {
    const {
      academicYearId,
      termId,
      classId,
      streamId,
      studentId,
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

    const report = await getStudentPerformanceReport({
      schoolId,
      academicYearId,
      termId,
      classId,
      streamId,
      studentId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Student performance report retrieved successfully.",
      data: report,
    });
  } catch (error) {
    console.error("Get student performance report error:", error);

    const clientErrors = ["SCHOOL_REQUIRED", "INVALID_PAGE", "INVALID_LIMIT"];

    if (clientErrors.includes(error.code)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve student performance report.",
    });
  }
}
