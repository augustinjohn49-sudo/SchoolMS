import {
  createTerm,
  getTermsByAcademicYear,
  getTermById,
  updateTerm,
  deleteTerm,
} from "../services/termService.js";

// Create a new term, ensuring that the academic year belongs to the authenticated user's school
export async function createTermController(req, res) {
  try {
    const { academicYearId, name, startDate, endDate } = req.body;

    if (!academicYearId || !name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "academicYearId, name, startDate, and endDate are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const term = await createTerm({
      schoolId,
      academicYearId,
      name,
      startDate,
      endDate,
    });

    return res.status(201).json({
      success: true,
      message: "Term created successfully.",
      data: term,
    });
  } catch (error) {
    console.error("Create term error:", error);

    if (error.code === "ACADEMIC_YEAR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Academic year not found.",
      });
    }

    if (error.code === "ACADEMIC_YEAR_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this academic year.",
      });
    }

    if (error.code === "TERM_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A term with this name already exists for this academic year.",
      });
    }

    if (error.code === "INVALID_DATE_RANGE") {
      return res.status(400).json({
        success: false,
        message: "Term start date must be before the end date.",
      });
    }

    if (error.code === "TERM_OUTSIDE_ACADEMIC_YEAR") {
      return res.status(400).json({
        success: false,
        message: "Term dates must fall within the academic year dates.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create term.",
    });
  }
}

// Get all terms for a specific academic year, ensuring that the academic year belongs to the authenticated user's school
export async function getTermsByAcademicYearController(req, res) {
  try {
    const { academicYearId } = req.params;

    if (!academicYearId) {
      return res.status(400).json({
        success: false,
        message: "academicYearId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const terms = await getTermsByAcademicYear({
      schoolId,
      academicYearId,
    });

    return res.status(200).json({
      success: true,
      data: terms,
    });
  } catch (error) {
    console.error("Get terms by academic year error:", error);

    if (error.code === "ACADEMIC_YEAR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Academic year not found.",
      });
    }

    if (error.code === "ACADEMIC_YEAR_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this academic year.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve terms.",
    });
  }
}

// Get a term by its ID, ensuring that the term belongs to the authenticated user's school
export async function getTermByIdController(req, res) {
  try {
    const { termId } = req.params;

    if (!termId) {
      return res.status(400).json({
        success: false,
        message: "termId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const term = await getTermById({
      schoolId,
      termId,
    });

    return res.status(200).json({
      success: true,
      data: term,
    });
  } catch (error) {
    console.error("Get term by ID error:", error);

    if (error.code === "TERM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Term not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve term.",
    });
  }
}

// Update an existing term, ensuring that the term belongs to the authenticated user's school
export async function updateTermController(req, res) {
  try {
    const { termId } = req.params;

    const { name, startDate, endDate, status } = req.body;

    const validStatuses = ["ACTIVE", "INACTIVE", "COMPLETED"];

    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid term status. Allowed values are: ${validStatuses.join(", ")}.`,
      });
    }

    if (!termId) {
      return res.status(400).json({
        success: false,
        message: "termId is required.",
      });
    }

    if (
      name === undefined &&
      startDate === undefined &&
      endDate === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required for update.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const term = await updateTerm({
      schoolId,
      termId,
      name,
      startDate,
      endDate,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Term updated successfully.",
      data: term,
    });
  } catch (error) {
    console.error("Update term error:", error);

    if (error.code === "TERM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Term not found.",
      });
    }

    if (error.code === "TERM_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A term with this name already exists for this academic year.",
      });
    }

    if (error.code === "INVALID_DATE_RANGE") {
      return res.status(400).json({
        success: false,
        message: "Term start date must be before the end date.",
      });
    }

    if (error.code === "TERM_OUTSIDE_ACADEMIC_YEAR") {
      return res.status(400).json({
        success: false,
        message: "Term dates must fall within the academic year dates.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update term.",
    });
  }
}

// Delete a term, ensuring that the term belongs to the authenticated user's school
export async function deleteTermController(req, res) {
  try {
    const { termId } = req.params;

    if (!termId) {
      return res.status(400).json({
        success: false,
        message: "termId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    await deleteTerm({
      schoolId,
      termId,
    });

    return res.status(200).json({
      success: true,
      message: "Term deleted successfully.",
    });
  } catch (error) {
    console.error("Delete term error:", error);

    if (error.code === "TERM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Term not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete term.",
    });
  }
}
