import {
  assignSubjectToExam,
  getExamSubjects,
  removeSubjectFromExam,
} from "../services/examSubjectService.js";

export async function assignSubjectToExamController(req, res) {
  try {
    const { examId } = req.params;
    const { classSubjectId } = req.body;

    const result = await assignSubjectToExam({
      schoolId: req.user.schoolId,
      examId,
      classSubjectId,
    });

    return res.status(201).json({
      message: "Class subject assigned to exam successfully.",
      examSubject: result,
    });
  } catch (error) {
    console.error("Assign subject to exam error:", error);

    switch (error.code) {
      case "SCHOOL_REQUIRED":
        return res.status(403).json({
          message: error.message,
        });

      case "EXAM_REQUIRED":
      case "CLASS_SUBJECT_REQUIRED":
        return res.status(400).json({
          message: error.message,
        });

      case "EXAM_NOT_FOUND":
      case "CLASS_SUBJECT_NOT_FOUND":
        return res.status(404).json({
          message: error.message,
        });

      case "ACADEMIC_YEAR_MISMATCH":
        return res.status(400).json({
          message: error.message,
        });

      case "EXAM_SUBJECT_EXISTS":
        return res.status(409).json({
          message: error.message,
        });

      default:
        return res.status(500).json({
          message: "An unexpected error occurred.",
        });
    }
  }
}

export async function getExamSubjectsController(req, res) {
  try {
    const { examId } = req.params;

    const result = await getExamSubjects({
      schoolId: req.user.schoolId,
      examId,
    });

    return res.status(200).json({
      message: "Exam subjects retrieved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Get exam subjects error:", error);

    switch (error.code) {
      case "SCHOOL_REQUIRED":
        return res.status(403).json({
          message: error.message,
        });

      case "EXAM_REQUIRED":
        return res.status(400).json({
          message: error.message,
        });

      case "EXAM_NOT_FOUND":
        return res.status(404).json({
          message: error.message,
        });

      default:
        return res.status(500).json({
          message: "An unexpected error occurred.",
        });
    }
  }
}

export async function removeSubjectFromExamController(req, res) {
  try {
    const { examId, examSubjectId } = req.params;

    const result = await removeSubjectFromExam({
      schoolId: req.user.schoolId,
      examId,
      examSubjectId,
    });

    return res.status(200).json({
      message: "Subject removed from exam successfully.",
      examSubject: result,
    });
  } catch (error) {
    console.error("Remove subject from exam error:", error);

    switch (error.code) {
      case "SCHOOL_REQUIRED":
        return res.status(403).json({
          message: error.message,
        });

      case "EXAM_REQUIRED":
      case "EXAM_SUBJECT_REQUIRED":
        return res.status(400).json({
          message: error.message,
        });

      case "EXAM_NOT_FOUND":
      case "EXAM_SUBJECT_NOT_FOUND":
        return res.status(404).json({
          message: error.message,
        });

      default:
        return res.status(500).json({
          message: "An unexpected error occurred.",
        });
    }
  }
}
