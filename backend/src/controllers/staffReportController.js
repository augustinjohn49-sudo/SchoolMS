import { getStaffReport } from "../services/staffReportService.js";

export async function getStaffReportController(req, res) {
  try {
    const { status, position, employmentType, gender, page, limit } = req.query;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const report = await getStaffReport({
      schoolId,
      status,
      position,
      employmentType,
      gender,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Staff report retrieved successfully.",
      data: report,
    });
  } catch (error) {
    console.error("Get staff report error:", error);

    const clientErrors = [
      "SCHOOL_REQUIRED",
      "INVALID_PAGE",
      "INVALID_LIMIT",
      "INVALID_STATUS",
      "INVALID_POSITION",
      "INVALID_EMPLOYMENTTYPE",
      "INVALID_GENDER",
    ];

    if (clientErrors.includes(error.code)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff report.",
    });
  }
}
