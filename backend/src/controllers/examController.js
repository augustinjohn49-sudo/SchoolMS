import { createExam } from "../services/examService.js";

export async function createExamController(req, res) {
  try {
    const {
      academicYearId,
      termId,
      name,
      description,
      startDate,
      endDate,
      status,
    } = req.body;

    if (!academicYearId || !termId || !name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message:
          "academicYearId, termId, name, startDate, and endDate are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const exam = await createExam({
      schoolId,
      academicYearId,
      termId,
      name,
      description,
      startDate,
      endDate,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Exam created successfully.",
      data: exam,
    });
  } catch (error) {
    console.error("Create exam error:", error);

    if (error.code === "NAME_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Exam name is required.",
      });
    }

    if (error.code === "INVALID_STATUS") {
      return res.status(400).json({
        success: false,
        message:
          "status must be DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, or CANCELLED.",
      });
    }

    if (error.code === "INVALID_DATE") {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format.",
      });
    }

    if (error.code === "INVALID_DATE_RANGE") {
      return res.status(400).json({
        success: false,
        message: "startDate cannot be later than endDate.",
      });
    }

    if (error.code === "SCHOOL_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "School not found.",
      });
    }

    if (error.code === "ACADEMIC_YEAR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Academic year not found for this school.",
      });
    }

    if (error.code === "TERM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Term not found for this academic year.",
      });
    }

    if (error.code === "EXAM_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "An exam with this name already exists for this academic year.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create exam.",
    });
  }
}
