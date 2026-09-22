import {
  createStudentEnrollment,
  getStudentEnrollmentsBySchool,
} from "../services/studentEnrollmentService.js";

export async function createStudentEnrollmentController(req, res) {
  try {
    const { studentId, academicYearId, classId, streamId } = req.body;

    if (!studentId || !academicYearId || !classId) {
      return res.status(400).json({
        success: false,
        message: "studentId, academicYearId, and classId are required.",
      });
    }

    // The school is always taken from the authenticated user's JWT.
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const enrollment = await createStudentEnrollment({
      schoolId,
      studentId,
      academicYearId,
      classId,
      streamId,
    });

    return res.status(201).json({
      success: true,
      message: "Student enrolled successfully.",
      data: enrollment,
    });
  } catch (error) {
    console.error("Create student enrollment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to enroll student.",
    });
  }
}

export async function getStudentEnrollmentsController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const enrollments = await getStudentEnrollmentsBySchool({
      schoolId,
    });

    return res.status(200).json({
      success: true,
      data: enrollments,
    });
  } catch (error) {
    console.error("Get student enrollments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve student enrollments.",
    });
  }
}
