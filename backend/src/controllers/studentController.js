import {
  createStudent,
  getStudentsBySchool,
  getStudentById,
  updateStudent,
  deleteStudent,
  bulkUpdateStudentStatus,
} from "../services/studentService.js";

import { getStudentEnrollmentHistory } from "../services/studentEnrollmentService.js";

export async function createStudentController(req, res) {
  try {
    const {
      admissionNumber,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
    } = req.body;

    // Validate required fields
    if (!admissionNumber || !firstName || !lastName || !gender) {
      return res.status(400).json({
        success: false,
        message:
          "admissionNumber, firstName, lastName, and gender are required.",
      });
    }

    // School ID comes from the authenticated user's JWT.
    // We do NOT trust schoolId from the request body.
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const student = await createStudent({
      schoolId,
      admissionNumber,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
    });

    return res.status(201).json({
      success: true,
      message: "Student created successfully.",
      data: student,
    });
  } catch (error) {
    console.error("Create student error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create student.",
    });
  }
}

export async function getStudentsController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    // const { search } = req.query;
    // const { search, status, page, limit } = req.query;
    const { search, status, page, limit, sortBy, sortOrder } = req.query;

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

    const allowedStatuses = [
      "ACTIVE",
      "INACTIVE",
      "GRADUATED",
      "TRANSFERRED",
      "SUSPENDED",
    ];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid student status. Allowed values are: ${allowedStatuses.join(", ")}.`,
      });
    }

    const result = await getStudentsBySchool({
      schoolId,
      search,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      sortBy: sortBy || "lastName",
      sortOrder: sortOrder || "asc",
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get students error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to retrieve students.",
    });
  }
}

export async function getStudentByIdController(req, res) {
  try {
    const { studentId } = req.params;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const student = await getStudentById({
      schoolId,
      studentId,
    });

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Get student by ID error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve student.",
    });
  }
}

export async function updateStudentController(req, res) {
  try {
    const { studentId } = req.params;

    const {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
      status,
    } = req.body;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const hasUpdate =
      firstName !== undefined ||
      middleName !== undefined ||
      lastName !== undefined ||
      dateOfBirth !== undefined ||
      gender !== undefined ||
      phone !== undefined ||
      email !== undefined ||
      address !== undefined ||
      status !== undefined;

    if (!hasUpdate) {
      return res.status(400).json({
        success: false,
        message: "At least one student field is required for update.",
      });
    }

    const student = await updateStudent({
      schoolId,
      studentId,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Student updated successfully.",
      data: student,
    });
  } catch (error) {
    console.error("Update student error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update student.",
    });
  }
}

export async function deleteStudentController(req, res) {
  try {
    const { studentId } = req.params;

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const student = await deleteStudent({
      schoolId,
      studentId,
    });

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully.",
      data: student,
    });
  } catch (error) {
    console.error("Delete student error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to delete student.",
    });
  }
}

export async function bulkUpdateStatus(req, res) {
  try {
    const { studentIds, status } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "studentIds must be a non-empty array.",
      });
    }

    const allowedStatuses = [
      "ACTIVE",
      "INACTIVE",
      "GRADUATED",
      "TRANSFERRED",
      "SUSPENDED",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid student status. Allowed values are: ${allowedStatuses.join(", ")}.`,
      });
    }

    const result = await bulkUpdateStudentStatus({
      schoolId: req.user.schoolId,
      studentIds,
      status,
    });

    return res.status(200).json({
      success: true,
      message: `${result.updatedCount} student(s) updated successfully.`,
      data: result,
    });
  } catch (error) {
    console.error("Bulk update student status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update student statuses.",
    });
  }
}

export async function getStudentEnrollmentHistoryController(req, res) {
  try {
    const { studentId } = req.params;
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const enrollments = await getStudentEnrollmentHistory({
      schoolId,
      studentId,
    });

    return res.status(200).json({
      success: true,
      data: enrollments,
    });
  } catch (error) {
    console.error("Get student enrollment history error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to retrieve student enrollment history.",
    });
  }
}
