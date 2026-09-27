import {
  createClassSubject,
  getClassSubjects,
  getClassSubjectById,
  deleteClassSubject,
} from "../services/classSubjectService.js";

export async function createClassSubjectController(req, res) {
  try {
    const { classId, subjectId } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "classId and subjectId are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const assignment = await createClassSubject({
      schoolId,
      classId,
      subjectId,
    });

    return res.status(201).json({
      success: true,
      message: "Subject assigned to class successfully.",
      data: assignment,
    });
  } catch (error) {
    console.error("Create class-subject assignment error:", error);

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    if (error.code === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    if (error.code === "SUBJECT_INACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Only active subjects can be assigned to a class.",
      });
    }

    if (error.code === "CLASS_SUBJECT_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "This subject is already assigned to this class.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to assign subject to class.",
    });
  }
}

export async function getClassSubjectsController(req, res) {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const assignments = await getClassSubjects({
      schoolId,
      classId,
    });

    return res.status(200).json({
      success: true,
      message: "Class subjects retrieved successfully.",
      data: assignments,
    });
  } catch (error) {
    console.error("Get class subjects error:", error);

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve class subjects.",
    });
  }
}

export async function getClassSubjectByIdController(req, res) {
  try {
    const { classSubjectId } = req.params;

    if (!classSubjectId) {
      return res.status(400).json({
        success: false,
        message: "classSubjectId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const assignment = await getClassSubjectById({
      schoolId,
      classSubjectId,
    });

    return res.status(200).json({
      success: true,
      message: "Class-subject assignment retrieved successfully.",
      data: assignment,
    });
  } catch (error) {
    console.error("Get class-subject assignment error:", error);

    if (error.code === "CLASS_SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class-subject assignment not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve class-subject assignment.",
    });
  }
}

export async function deleteClassSubjectController(req, res) {
  try {
    const { classSubjectId } = req.params;

    if (!classSubjectId) {
      return res.status(400).json({
        success: false,
        message: "classSubjectId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const deletedAssignment = await deleteClassSubject({
      schoolId,
      classSubjectId,
    });

    return res.status(200).json({
      success: true,
      message: "Subject removed from class successfully.",
      data: deletedAssignment,
    });
  } catch (error) {
    console.error("Delete class-subject assignment error:", error);

    if (error.code === "CLASS_SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class-subject assignment not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to remove subject from class.",
    });
  }
}
