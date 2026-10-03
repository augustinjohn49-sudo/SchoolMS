import {
  createGradingScale,
  getGradingScalesBySchool,
  getGradingScaleById,
  updateGradingScale,
  deleteGradingScale,
} from "../services/gradingScaleService.js";

export async function createGradingScaleController(req, res) {
  try {
    const { name, description, isDefault } = req.body;

    if (!req.user?.schoolId) {
      return res.status(400).json({
        message: "School context is required.",
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "Grading scale name is required.",
      });
    }

    const gradingScale = await createGradingScale({
      schoolId: req.user.schoolId,
      name,
      description,
      isDefault,
    });

    return res.status(201).json(gradingScale);
  } catch (error) {
    if (error.code === "GRADING_SCALE_EXISTS") {
      return res.status(409).json({
        message: error.message,
      });
    }

    console.error("Create grading scale error:", error);

    return res.status(500).json({
      message: "Failed to create grading scale.",
    });
  }
}

export async function getGradingScalesController(req, res) {
  try {
    if (!req.user?.schoolId) {
      return res.status(400).json({
        message: "School context is required.",
      });
    }

    const gradingScales = await getGradingScalesBySchool({
      schoolId: req.user.schoolId,
    });

    return res.status(200).json(gradingScales);
  } catch (error) {
    console.error("Get grading scales error:", error);

    return res.status(500).json({
      message: "Failed to retrieve grading scales.",
    });
  }
}

export async function getGradingScaleByIdController(req, res) {
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

    const gradingScale = await getGradingScaleById({
      schoolId: req.user.schoolId,
      gradingScaleId,
    });

    return res.status(200).json(gradingScale);
  } catch (error) {
    if (error.code === "GRADING_SCALE_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    console.error("Get grading scale error:", error);

    return res.status(500).json({
      message: "Failed to retrieve grading scale.",
    });
  }
}

export async function updateGradingScaleController(req, res) {
  try {
    const { gradingScaleId } = req.params;
    const { name, description, isDefault } = req.body;

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

    if (
      name === undefined &&
      description === undefined &&
      isDefault === undefined
    ) {
      return res.status(400).json({
        message: "At least one field is required for update.",
      });
    }

    const gradingScale = await updateGradingScale({
      schoolId: req.user.schoolId,
      gradingScaleId,
      name,
      description,
      isDefault,
    });

    return res.status(200).json(gradingScale);
  } catch (error) {
    if (error.code === "GRADING_SCALE_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    if (error.code === "GRADING_SCALE_EXISTS") {
      return res.status(409).json({
        message: error.message,
      });
    }

    console.error("Update grading scale error:", error);

    return res.status(500).json({
      message: "Failed to update grading scale.",
    });
  }
}

export async function deleteGradingScaleController(req, res) {
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

    const gradingScale = await deleteGradingScale({
      schoolId: req.user.schoolId,
      gradingScaleId,
    });

    return res.status(200).json({
      message: "Grading scale deleted successfully.",
      gradingScale,
    });
  } catch (error) {
    if (error.code === "GRADING_SCALE_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
      });
    }

    console.error("Delete grading scale error:", error);

    return res.status(500).json({
      message: "Failed to delete grading scale.",
    });
  }
}
