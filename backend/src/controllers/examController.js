import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
} from "../services/examService.js";

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

export async function getExamsController(req, res) {
  try {
    const { academicYearId, termId, status } = req.query;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const exams = await getExams({
      schoolId,
      academicYearId,
      termId,
      status,
    });

    return res.status(200).json({
      success: true,
      data: exams,
    });
  } catch (error) {
    console.error("Get exams error:", error);

    if (error.code === "INVALID_STATUS") {
      return res.status(400).json({
        success: false,
        message:
          "status must be DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, or CANCELLED.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve exams.",
    });
  }
}

export async function getExamByIdController(req, res) {
  try {
    const { examId } = req.params;
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Exam ID is required.",
      });
    }

    const exam = await getExamById({
      schoolId,
      examId,
    });

    return res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error("Get exam by ID error:", error);

    if (error.code === "EXAM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve exam.",
    });
  }
}

export async function updateExamController(req, res) {
  try {
    const { examId } = req.params;

    const {
      academicYearId,
      termId,
      name,
      description,
      startDate,
      endDate,
      status,
    } = req.body;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Exam ID is required.",
      });
    }

    const exam = await updateExam({
      schoolId,
      examId,
      academicYearId,
      termId,
      name,
      description,
      startDate,
      endDate,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Exam updated successfully.",
      data: exam,
    });
  } catch (error) {
    console.error("Update exam error:", error);

    if (error.code === "EXAM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

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
      message: "Failed to update exam.",
    });
  }
}

export async function deleteExamController(req, res) {
  try {
    const { examId } = req.params;
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Exam ID is required.",
      });
    }

    const exam = await deleteExam({
      schoolId,
      examId,
    });

    return res.status(200).json({
      success: true,
      message: "Exam deleted successfully.",
      data: exam,
    });
  } catch (error) {
    console.error("Delete exam error:", error);

    if (error.code === "EXAM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete exam.",
    });
  }
}
