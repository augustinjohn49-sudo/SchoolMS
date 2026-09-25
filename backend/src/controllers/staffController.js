import {
  createStaff,
  getStaffBySchool,
  getStaffById,
  updateStaff,
} from "../services/staffService.js";

/**
 * Create staff member
 */
export async function createStaffController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const {
      userId,
      staffNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      position,
      employmentType,
      dateJoined,
    } = req.body;

    if (!staffNumber || !firstName || !lastName || !gender || !position) {
      return res.status(400).json({
        success: false,
        message:
          "staffNumber, firstName, lastName, gender, and position are required.",
      });
    }

    const staff = await createStaff({
      schoolId,
      userId,
      staffNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      position,
      employmentType,
      dateJoined,
    });

    return res.status(201).json({
      success: true,
      message: "Staff member created successfully.",
      data: staff,
    });
  } catch (error) {
    console.error("Create staff error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create staff member.",
    });
  }
}

/**
 * Get all staff members for the logged-in school
 */
export async function getStaffController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const staff = await getStaffBySchool(schoolId);

    return res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff members.",
    });
  }
}

/**
 * Get one staff member
 */
export async function getStaffByIdController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { staffId } = req.params;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "Staff ID is required.",
      });
    }

    const staff = await getStaffById({
      schoolId,
      staffId,
    });

    return res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Get staff by ID error:", error);

    if (error.message === "Staff member not found.") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff member.",
    });
  }
}

/**
 * Update staff member
 */
export async function updateStaffController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { staffId } = req.params;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "Staff ID is required.",
      });
    }

    const {
      staffNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      position,
      employmentType,
      status,
      dateJoined,
    } = req.body;

    // Make sure at least one field is supplied
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required for an update.",
      });
    }

    const staff = await updateStaff({
      schoolId,
      staffId,
      staffNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      position,
      employmentType,
      status,
      dateJoined,
    });

    return res.status(200).json({
      success: true,
      message: "Staff member updated successfully.",
      data: staff,
    });
  } catch (error) {
    console.error("Update staff error:", error);

    if (error.message === "Staff member not found.") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "A staff member with this staff number already exists."
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update staff member.",
    });
  }
}
