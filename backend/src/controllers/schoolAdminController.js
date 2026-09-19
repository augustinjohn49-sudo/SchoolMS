import { createSchoolAdmin } from "../services/schoolAdminService.js";

export async function createSchoolAdminController(req, res) {
  try {
    const { firstName, lastName, email, password, schoolId } = req.body;

    if (!firstName || !lastName || !email || !password || !schoolId) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, email, password, and schoolId are required.",
      });
    }

    const schoolAdmin = await createSchoolAdmin({
      firstName,
      lastName,
      email,
      password,
      schoolId,
    });

    return res.status(201).json({
      success: true,
      message: "School Admin created successfully.",
      data: {
        id: schoolAdmin.id,
        schoolId: schoolAdmin.schoolId,
        firstName: schoolAdmin.firstName,
        lastName: schoolAdmin.lastName,
        email: schoolAdmin.email,
        role: schoolAdmin.role,
        status: schoolAdmin.status,
        createdAt: schoolAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error("Create School Admin error:", error);

    if (error.code === "SCHOOL_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "School not found.",
      });
    }

    if (error.code === "SCHOOL_INACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Cannot create an administrator for an inactive school.",
      });
    }

    if (error.code === "USER_EMAIL_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create School Admin.",
    });
  }
}
