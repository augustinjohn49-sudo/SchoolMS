import {
  createClass,
  getClassesByAcademicYear,
  getClassById,
  updateClass,
  deleteClass,
} from "../services/classService.js";

export async function createClassController(req, res) {
  try {
    const { academicYearId, name, level } = req.body;

    if (!academicYearId || !name) {
      return res.status(400).json({
        success: false,
        message: "academicYearId and name are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const schoolClass = await createClass({
      schoolId,
      academicYearId,
      name,
      level,
    });

    return res.status(201).json({
      success: true,
      message: "Class created successfully.",
      data: schoolClass,
    });
  } catch (error) {
    console.error("Create class error:", error);

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

    if (error.code === "CLASS_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "A class with this name already exists for this academic year.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create class.",
    });
  }
}

export async function getClassesByAcademicYearController(req, res) {
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

    const classes = await getClassesByAcademicYear({
      schoolId,
      academicYearId,
    });

    return res.status(200).json({
      success: true,
      message: "Classes retrieved successfully.",
      data: classes,
    });
  } catch (error) {
    console.error("Get classes by academic year error:", error);

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
      message: "Failed to retrieve classes.",
    });
  }
}

export async function getClassByIdController(req, res) {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const schoolClass = await getClassById({
      schoolId,
      classId,
    });

    return res.status(200).json({
      success: true,
      message: "Class retrieved successfully.",
      data: schoolClass,
    });
  } catch (error) {
    console.error("Get class by ID error:", error);

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    if (error.code === "CLASS_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this class.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve class.",
    });
  }
}

export async function updateClassController(req, res) {
  try {
    const { classId } = req.params;
    const { name, level } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required.",
      });
    }

    if (name === undefined && level === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one field must be provided.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const schoolClass = await updateClass({
      schoolId,
      classId,
      name,
      level,
    });

    return res.status(200).json({
      success: true,
      message: "Class updated successfully.",
      data: schoolClass,
    });
  } catch (error) {
    console.error("Update class error:", error);

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    if (error.code === "CLASS_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this class.",
      });
    }

    if (error.code === "CLASS_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "A class with this name already exists for this academic year.",
      });
    }

    if (error.code === "NO_CHANGES") {
      return res.status(400).json({
        success: false,
        message: "At least one field must be changed.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update class.",
    });
  }
}

export async function deleteClassController(req, res) {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "classId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const deletedClass = await deleteClass({
      schoolId,
      classId,
    });

    return res.status(200).json({
      success: true,
      message: "Class deleted successfully.",
      data: deletedClass,
    });
  } catch (error) {
    console.error("Delete class error:", error);

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    if (error.code === "CLASS_ACCESS_DENIED") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this class.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete class.",
    });
  }
}
