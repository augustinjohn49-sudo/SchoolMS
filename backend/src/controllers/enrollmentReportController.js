import { getEnrollmentReport } from "../services/enrollmentReportService.js";

function handleEnrollmentReportError(error, res) {
  const errorMap = {
    SCHOOL_REQUIRED: {
      status: 400,
      message: "School ID is required.",
    },

    ACADEMIC_YEAR_NOT_FOUND: {
      status: 404,
      message: "Academic year not found.",
    },

    TERM_NOT_FOUND: {
      status: 404,
      message: "Term not found.",
    },

    CLASS_NOT_FOUND: {
      status: 404,
      message: "Class not found.",
    },

    STREAM_NOT_FOUND: {
      status: 404,
      message: "Stream not found.",
    },
  };

  const mappedError = errorMap[error.code];

  if (mappedError) {
    return res.status(mappedError.status).json({
      success: false,
      message: mappedError.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Failed to generate enrollment report.",
  });
}

export async function getEnrollmentReportController(req, res) {
  try {
    const report = await getEnrollmentReport({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
      termId: req.query.termId,
      classId: req.query.classId,
      streamId: req.query.streamId,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Get enrollment report error:", error);

    return handleEnrollmentReportError(error, res);
  }
}
