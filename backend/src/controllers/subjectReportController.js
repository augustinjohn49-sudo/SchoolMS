import { getSubjectReport } from "../services/subjectReportService.js";

export async function getSubjectReportController(req, res) {
  try {
    const { status, page, limit } = req.query;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const report = await getSubjectReport({
      schoolId,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Subject report retrieved successfully.",
      data: report,
    });
  } catch (error) {
    console.error("Get subject report error:", error);

    const clientErrors = [
      "SCHOOL_REQUIRED",
      "INVALID_PAGE",
      "INVALID_LIMIT",
      "INVALID_STATUS",
    ];

    if (clientErrors.includes(error.code)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve subject report.",
    });
  }
}
