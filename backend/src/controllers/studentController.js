import { createStudent } from "../services/studentService.js";

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
