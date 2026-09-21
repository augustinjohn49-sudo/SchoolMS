import {
  createStudent,
  getStudentsBySchool,
  getStudentById,
  updateStudent,
} from "../services/studentService.js";

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

    const students = await getStudentsBySchool({
      schoolId,
    });

    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error) {
    console.error("Get students error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve students.",
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
