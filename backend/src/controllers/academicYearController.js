import { createAcademicYear } from "../services/academicYearService.js";

export async function createAcademicYearController(req, res) {
  try {
    const { name, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Name, startDate, and endDate are required.",
      });
    }

    // The school is determined by the authenticated user.
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const academicYear = await createAcademicYear({
      schoolId,
      name,
      startDate,
      endDate,
    });

    return res.status(201).json({
      success: true,
      message: "Academic year created successfully.",
      data: academicYear,
    });
  } catch (error) {
    console.error("Create academic year error:", error);

    if (error.code === "ACADEMIC_YEAR_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "An academic year with this name already exists for this school.",
      });
    }

    if (error.code === "INVALID_DATE_RANGE") {
      return res.status(400).json({
        success: false,
        message: "Start date must be before the end date.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create academic year.",
    });
  }
}
