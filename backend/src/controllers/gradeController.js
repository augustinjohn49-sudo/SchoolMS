import {
  createGrade,
  getGradesByGradingScale,
  getGradeById,
  updateGrade,
  deleteGrade,
} from "../services/gradeService.js";

export async function createGradeController(req, res) {
  try {
    const { gradingScaleId } = req.params;
    const { name, minPercentage, maxPercentage, remarks } = req.body;

    if (!req.user?.schoolId) {
      return res.status(400).json({
        message: "School context is required.",
      });
    }

    if (!gradingScaleId) {
      return res.status(400).json({
        message: "Grading scale ID is required.",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Grade name is required.",
      });
    }

    const grade = await createGrade({
      schoolId: req.user.schoolId,
      gradingScaleId,
      name,
      minPercentage,
      maxPercentage,
      remarks,
    });

    return res.status(201).json(grade);
  } catch (error) {
    const badRequestErrors = [
      "SCHOOL_REQUIRED",
      "GRADING_SCALE_REQUIRED",
      "GRADE_NAME_REQUIRED",
      "PERCENTAGE_RANGE_REQUIRED",
      "INVALID_PERCENTAGE_RANGE",
      "PERCENTAGE_OUT_OF_RANGE",
      "GRADE_RANGE_OVERLAP",
    ];

    if (badRequestErrors.includes(error.code)) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "GRADING_SCALE_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (error.code === "GRADE_EXISTS") {
      return res.status(409).json({
        message: error.message,
      });
    }

    console.error("Create grade error:", error);

    return res.status(500).json({
      message: "Failed to create grade.",
    });
  }
}

export async function getGradesController(req, res) {
  try {
    const { gradingScaleId } = req.params;

    if (!req.user?.schoolId) {
      return res.status(400).json({
        message: "School context is required.",
      });
    }

    if (!gradingScaleId) {
      return res.status(400).json({
        message: "Grading scale ID is required.",
      });
    }

    const result = await getGradesByGradingScale({
      schoolId: req.user.schoolId,
      gradingScaleId,
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.code === "SCHOOL_REQUIRED") {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "GRADING_SCALE_REQUIRED") {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.code === "GRADING_SCALE_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    console.error("Get grades error:", error);

    return res.status(500).json({
      message: "Failed to retrieve grades.",
    });
  }
}

export async function getGradeByIdController(req, res) {
  try {
    const { gradingScaleId, gradeId } = req.params;

    if (!req.user?.schoolId) {
      return res.status(400).json({
        message: "School context is required.",
      });
    }

    if (!gradingScaleId) {
      return res.status(400).json({
        message: "Grading scale ID is required.",
      });
    }

    if (!gradeId) {
      return res.status(400).json({
        message: "Grade ID is required.",
      });
    }

    const grade = await getGradeById({
      schoolId: req.user.schoolId,
      gradingScaleId,
      gradeId,
    });

    return res.status(200).json(grade);
  } catch (error) {
    const badRequestErrors = [
      "SCHOOL_REQUIRED",
      "GRADING_SCALE_REQUIRED",
      "GRADE_REQUIRED",
    ];

    if (badRequestErrors.includes(error.code)) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error.code === "GRADING_SCALE_NOT_FOUND" ||
      error.code === "GRADE_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    console.error("Get grade error:", error);

    return res.status(500).json({
      message: "Failed to retrieve grade.",
    });
  }
}

export async function updateGradeController(req, res) {
  try {
    const { gradingScaleId, gradeId } = req.params;
    const { name, minPercentage, maxPercentage, remarks } = req.body;

    if (!req.user?.schoolId) {
      return res.status(400).json({
        message: "School context is required.",
      });
    }

    if (!gradingScaleId) {
      return res.status(400).json({
        message: "Grading scale ID is required.",
      });
    }

    if (!gradeId) {
      return res.status(400).json({
        message: "Grade ID is required.",
      });
    }

    if (
      name === undefined &&
      minPercentage === undefined &&
      maxPercentage === undefined &&
      remarks === undefined
    ) {
      return res.status(400).json({
        message: "At least one field is required for update.",
      });
    }

    const grade = await updateGrade({
      schoolId: req.user.schoolId,
      gradingScaleId,
      gradeId,
      name,
      minPercentage,
      maxPercentage,
      remarks,
    });

    return res.status(200).json(grade);
  } catch (error) {
    const badRequestErrors = [
      "SCHOOL_REQUIRED",
      "GRADING_SCALE_REQUIRED",
      "PERCENTAGE_RANGE_REQUIRED",
      "INVALID_PERCENTAGE_RANGE",
      "PERCENTAGE_OUT_OF_RANGE",
      "GRADE_RANGE_OVERLAP",
    ];

    if (badRequestErrors.includes(error.code)) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (
      error.code === "GRADING_SCALE_NOT_FOUND" ||
      error.code === "GRADE_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (error.code === "GRADE_EXISTS") {
      return res.status(409).json({
        message: error.message,
      });
    }

    console.error("Update grade error:", error);

    return res.status(500).json({
      message: "Failed to update grade.",
    });
  }
}

export async function deleteGradeController(req, res) {
  try {
    const { gradingScaleId, gradeId } = req.params;

    if (!req.user?.schoolId) {
      return res.status(400).json({
        message: "School context is required.",
      });
    }

    if (!gradingScaleId) {
      return res.status(400).json({
        message: "Grading scale ID is required.",
      });
    }

    if (!gradeId) {
      return res.status(400).json({
        message: "Grade ID is required.",
      });
    }

    const grade = await deleteGrade({
      schoolId: req.user.schoolId,
      gradingScaleId,
      gradeId,
    });

    return res.status(200).json({
      message: "Grade deleted successfully.",
      grade,
    });
  } catch (error) {
    if (
      error.code === "GRADING_SCALE_NOT_FOUND" ||
      error.code === "GRADE_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: error.message,
      });
    }

    console.error("Delete grade error:", error);

    return res.status(500).json({
      message: "Failed to delete grade.",
    });
  }
}
