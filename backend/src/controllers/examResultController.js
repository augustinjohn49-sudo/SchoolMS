import {
  createExamResult,
  getExamResults,
  getExamResultById,
  updateExamResult,
  deleteExamResult,
} from "../services/examResultService.js";

export async function createExamResultController(req, res) {
  try {
    const result = await createExamResult({
      schoolId: req.user.schoolId,
      studentId: req.body.studentId,
      examSubjectId: req.body.examSubjectId,
      marks: req.body.marks,
      maxMarks: req.body.maxMarks,
      remarks: req.body.remarks,
    });

    return res.status(201).json({
      message: "Exam result created successfully.",
      examResult: result,
    });
  } catch (error) {
    console.error("Create exam result error:", error);

    if (
      [
        "SCHOOL_REQUIRED",
        "STUDENT_REQUIRED",
        "EXAM_SUBJECT_REQUIRED",
        "INVALID_SCHOOL_ID",
        "INVALID_STUDENT_ID",
        "INVALID_EXAM_SUBJECT_ID",
        "MARKS_REQUIRED",
        "MAX_MARKS_REQUIRED",
        "INVALID_MARKS",
        "INVALID_MAX_MARKS",
        "NEGATIVE_MARKS",
        "MARKS_EXCEED_MAX",
        "EXAM_REQUIRED",
        "STUDENT_ENROLLMENT_INVALID",
      ].includes(error.code)
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (
      error.code === "STUDENT_NOT_FOUND" ||
      error.code === "EXAM_SUBJECT_NOT_FOUND"
    ) {
      return res.status(404).json({ message: error.message });
    }

    if (error.code === "EXAM_RESULT_EXISTS") {
      return res.status(409).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to create exam result.",
    });
  }
}

export async function getExamResultsController(req, res) {
  try {
    const result = await getExamResults({
      schoolId: req.user.schoolId,
      examId: req.params.examId,
      studentId: req.query.studentId || null,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get exam results error:", error);

    if (
      error.code === "INVALID_SCHOOL_ID" ||
      error.code === "INVALID_EXAM_ID"
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === "EXAM_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to retrieve exam results.",
    });
  }
}

export async function getExamResultByIdController(req, res) {
  try {
    const result = await getExamResultById({
      schoolId: req.user.schoolId,
      examId: req.params.examId,
      examResultId: req.params.examResultId,
    });

    return res.status(200).json({
      examResult: result,
    });
  } catch (error) {
    console.error("Get exam result error:", error);

    if (
      error.code === "INVALID_SCHOOL_ID" ||
      error.code === "INVALID_EXAM_ID" ||
      error.code === "INVALID_EXAM_RESULT_ID"
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === "EXAM_RESULT_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to retrieve exam result.",
    });
  }
}

export async function updateExamResultController(req, res) {
  try {
    const result = await updateExamResult({
      schoolId: req.user.schoolId,
      examId: req.params.examId,
      examResultId: req.params.examResultId,
      marks: req.body.marks,
      maxMarks: req.body.maxMarks,
      remarks: req.body.remarks,
    });

    return res.status(200).json({
      message: "Exam result updated successfully.",
      examResult: result,
    });
  } catch (error) {
    console.error("Update exam result error:", error);

    if (
      [
        "SCHOOL_REQUIRED",
        "EXAM_REQUIRED",
        "EXAM_RESULT_REQUIRED",
        "INVALID_SCHOOL_ID",
        "INVALID_EXAM_ID",
        "INVALID_EXAM_RESULT_ID",
        "MARKS_REQUIRED",
        "MAX_MARKS_REQUIRED",
        "INVALID_MARKS",
        "INVALID_MAX_MARKS",
        "NEGATIVE_MARKS",
        "MARKS_EXCEED_MAX",
        "NO_UPDATE_FIELDS",
        "STUDENT_ENROLLMENT_INVALID",
      ].includes(error.code)
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === "EXAM_RESULT_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to update exam result.",
    });
  }
}

export async function deleteExamResultController(req, res) {
  try {
    const result = await deleteExamResult({
      schoolId: req.user.schoolId,
      examId: req.params.examId,
      examResultId: req.params.examResultId,
    });

    return res.status(200).json({
      message: "Exam result deleted successfully.",
      examResult: result,
    });
  } catch (error) {
    console.error("Delete exam result error:", error);

    if (
      error.code === "INVALID_SCHOOL_ID" ||
      error.code === "INVALID_EXAM_ID" ||
      error.code === "INVALID_EXAM_RESULT_ID"
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === "EXAM_RESULT_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to delete exam result.",
    });
  }
}
