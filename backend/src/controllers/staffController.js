import {
  createStaff,
  getStaffBySchool,
  getStaffById,
  updateStaff,
  createStaffAccount,
  updateStaffAccountStatus,
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

    const validGenders = ["MALE", "FEMALE", "OTHER"];

    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff gender.",
      });
    }

    const validPositions = [
      "TEACHER",
      "HEAD_TEACHER",
      "DEPUTY_HEAD_TEACHER",
      "SENIOR_TEACHER",
      "BURSAR",
      "SECRETARY",
      "COUNSELOR",
      "LIBRARIAN",
      "ICT_OFFICER",
      "NURSE",
      "SECURITY",
      "SUPPORT_STAFF",
      "OTHER",
    ];

    if (!validPositions.includes(position)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff position.",
      });
    }

    const validEmploymentTypes = [
      "FULL_TIME",
      "PART_TIME",
      "CONTRACT",
      "VOLUNTEER",
    ];

    if (employmentType && !validEmploymentTypes.includes(employmentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employment type.",
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
    const {
      position,
      employmentType,
      status,
      page: pageQuery,
      limit: limitQuery,
    } = req.query;

    const validPositions = [
      "TEACHER",
      "HEAD_TEACHER",
      "DEPUTY_HEAD_TEACHER",
      "SENIOR_TEACHER",
      "BURSAR",
      "SECRETARY",
      "COUNSELOR",
      "LIBRARIAN",
      "ICT_OFFICER",
      "NURSE",
      "SECURITY",
      "SUPPORT_STAFF",
      "OTHER",
    ];

    const validEmploymentTypes = [
      "FULL_TIME",
      "PART_TIME",
      "CONTRACT",
      "VOLUNTEER",
    ];

    const validStatuses = [
      "ACTIVE",
      "INACTIVE",
      "SUSPENDED",
      "TERMINATED",
      "RESIGNED",
    ];

    if (position && !validPositions.includes(position)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff position.",
      });
    }

    if (employmentType && !validEmploymentTypes.includes(employmentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employment type.",
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff status.",
      });
    }

    const page = pageQuery === undefined ? 1 : Number(pageQuery);
    const limit = limitQuery === undefined ? 20 : Number(limitQuery);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer.",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100.",
      });
    }

    const result = await getStaffBySchool(req.user.schoolId, {
      position,
      employmentType,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff.",
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

    const validGenders = ["MALE", "FEMALE", "OTHER"];

    if (gender !== undefined && !validGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff gender.",
      });
    }

    const validPositions = [
      "TEACHER",
      "HEAD_TEACHER",
      "DEPUTY_HEAD_TEACHER",
      "SENIOR_TEACHER",
      "BURSAR",
      "SECRETARY",
      "COUNSELOR",
      "LIBRARIAN",
      "ICT_OFFICER",
      "NURSE",
      "SECURITY",
      "SUPPORT_STAFF",
      "OTHER",
    ];

    if (position !== undefined && !validPositions.includes(position)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff position.",
      });
    }

    const validEmploymentTypes = [
      "FULL_TIME",
      "PART_TIME",
      "CONTRACT",
      "VOLUNTEER",
    ];

    if (
      employmentType !== undefined &&
      !validEmploymentTypes.includes(employmentType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employment type.",
      });
    }

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

/**
 * Create and link a login account for a staff member
 */
export async function createStaffAccountController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { staffId } = req.params;
    const { email, password } = req.body;

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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    const result = await createStaffAccount({
      schoolId,
      staffId,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Staff login account created successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Create staff account error:", error);

    if (error.message === "Staff member not found.") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "This staff member already has a login account.") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "A user with this email already exists.") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "Only staff with the TEACHER position can currently receive a teacher login account."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create staff login account.",
    });
  }
}

export async function updateStaffAccountStatusController(req, res) {
  try {
    const { staffId } = req.params;
    const { status } = req.body;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "Staff ID is required.",
      });
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Account status must be ACTIVE or INACTIVE.",
      });
    }

    const result = await updateStaffAccountStatus({
      schoolId: req.user.schoolId,
      staffId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Staff account status updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Update staff account status error:", error);

    if (error.code === "STAFF_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    if (error.code === "STAFF_ACCOUNT_NOT_FOUND") {
      return res.status(400).json({
        success: false,
        message: "This staff member does not have a login account.",
      });
    }

    if (error.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update staff account status.",
    });
  }
}
