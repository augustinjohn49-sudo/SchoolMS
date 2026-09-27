import {
  createTeacherClassSubject,
  getTeacherClassSubjects,
  getTeacherClassSubjectById,
  deleteTeacherClassSubject,
} from "../services/teacherClassSubjectService.js";

export async function createTeacherClassSubjectController(req, res) {
  try {
    const { staffId, classSubjectId } = req.body;

    if (!staffId || !classSubjectId) {
      return res.status(400).json({
        success: false,
        message: "staffId and classSubjectId are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const assignment = await createTeacherClassSubject({
      schoolId,
      staffId,
      classSubjectId,
    });

    return res.status(201).json({
      success: true,
      message: "Teacher assigned to class subject successfully.",
      data: assignment,
    });
  } catch (error) {
    console.error("Create teacher-class-subject assignment error:", error);

    if (error.code === "STAFF_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    if (error.code === "STAFF_NOT_TEACHER") {
      return res.status(400).json({
        success: false,
        message:
          "Only staff members with the TEACHER position can be assigned to a class subject.",
      });
    }

    if (error.code === "STAFF_INACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Only active teachers can be assigned to a class subject.",
      });
    }

    if (error.code === "CLASS_SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class-subject assignment not found.",
      });
    }

    if (error.code === "SUBJECT_INACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Only active subjects can have a teacher assigned.",
      });
    }

    if (error.code === "TEACHER_CLASS_SUBJECT_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "This teacher is already assigned to this class subject.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to assign teacher to class subject.",
    });
  }
}

export async function getTeacherClassSubjectsController(req, res) {
  try {
    const { staffId } = req.params;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "staffId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const assignments = await getTeacherClassSubjects({
      schoolId,
      staffId,
    });

    return res.status(200).json({
      success: true,
      message: "Teacher class subjects retrieved successfully.",
      data: assignments,
    });
  } catch (error) {
    console.error("Get teacher class subjects error:", error);

    if (error.code === "STAFF_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve teacher class subjects.",
    });
  }
}

export async function getTeacherClassSubjectByIdController(req, res) {
  try {
    const { assignmentId } = req.params;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "assignmentId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const assignment = await getTeacherClassSubjectById({
      schoolId,
      assignmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Teacher-class-subject assignment retrieved successfully.",
      data: assignment,
    });
  } catch (error) {
    console.error("Get teacher-class-subject assignment error:", error);

    if (error.code === "TEACHER_CLASS_SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Teacher-class-subject assignment not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve teacher-class-subject assignment.",
    });
  }
}

export async function deleteTeacherClassSubjectController(req, res) {
  try {
    const { assignmentId } = req.params;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "assignmentId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const deletedAssignment = await deleteTeacherClassSubject({
      schoolId,
      assignmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Teacher removed from class subject successfully.",
      data: deletedAssignment,
    });
  } catch (error) {
    console.error("Delete teacher-class-subject assignment error:", error);

    if (error.code === "TEACHER_CLASS_SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Teacher-class-subject assignment not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to remove teacher from class subject.",
    });
  }
}
