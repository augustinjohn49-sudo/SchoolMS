import {
  createStudentEnrollment,
  getStudentEnrollmentsBySchool,
  getStudentEnrollmentById,
  updateStudentEnrollment,
  deleteStudentEnrollment,
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

    // const { academicYearId, classId, streamId, status } = req.query;

    const {
      academicYearId,
      classId,
      streamId,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const parsedPage = page ? Number(page) : 1;
    const parsedLimit = limit ? Number(limit) : 20;

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer.",
      });
    }

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be an integer between 1 and 100.",
      });
    }

    const enrollments = await getStudentEnrollmentsBySchool({
      schoolId,
      academicYearId,
      classId,
      streamId,
      status,
      page: parsedPage,
      limit: parsedLimit,
      sortBy: sortBy || "lastName",
      sortOrder: sortOrder || "asc",
    });

    return res.status(200).json({
      success: true,
      data: enrollments.data,
      pagination: enrollments.pagination,
    });
  } catch (error) {
    console.error("Get student enrollments error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to retrieve student enrollments.",
    });
  }
}

export async function getStudentEnrollmentByIdController(req, res) {
  try {
    const { enrollmentId } = req.params;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const enrollment = await getStudentEnrollmentById({
      schoolId,
      enrollmentId,
    });

    return res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    console.error("Get student enrollment by ID error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to retrieve student enrollment.",
    });
  }
}

export async function updateStudentEnrollmentController(req, res) {
  try {
    const { enrollmentId } = req.params;

    const { academicYearId, classId, streamId, status } = req.body;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const hasUpdate =
      academicYearId !== undefined ||
      classId !== undefined ||
      streamId !== undefined ||
      status !== undefined;

    if (!hasUpdate) {
      return res.status(400).json({
        success: false,
        message: "At least one enrollment field is required for update.",
      });
    }

    const allowedStatuses = ["ACTIVE", "COMPLETED", "TRANSFERRED", "WITHDRAWN"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid enrollment status. Allowed values are: ${allowedStatuses.join(", ")}.`,
      });
    }

    const enrollment = await updateStudentEnrollment({
      schoolId,
      enrollmentId,
      academicYearId,
      classId,
      streamId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Student enrollment updated successfully.",
      data: enrollment,
    });
  } catch (error) {
    console.error("Update student enrollment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to update student enrollment.",
    });
  }
}

export async function deleteStudentEnrollmentController(req, res) {
  try {
    const { enrollmentId } = req.params;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const enrollment = await deleteStudentEnrollment({
      schoolId,
      enrollmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Student enrollment deleted successfully.",
      data: enrollment,
    });
  } catch (error) {
    console.error("Delete student enrollment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to delete student enrollment.",
    });
  }
}
