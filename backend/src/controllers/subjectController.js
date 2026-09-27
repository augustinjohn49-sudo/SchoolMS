import {
  createSubject,
  getSubjectsBySchool,
  getSubjectById,
  updateSubject,
} from "../services/subjectService.js";

export async function createSubjectController(req, res) {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "name and code are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const subject = await createSubject({
      schoolId,
      name,
      code,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Subject created successfully.",
      data: subject,
    });
  } catch (error) {
    console.error("Create subject error:", error);

    if (error.code === "SUBJECT_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "A subject with this name or code already exists for this school.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create subject.",
    });
  }
}

export async function getSubjectsController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const subjects = await getSubjectsBySchool({
      schoolId,
    });

    return res.status(200).json({
      success: true,
      message: "Subjects retrieved successfully.",
      data: subjects,
    });
  } catch (error) {
    console.error("Get subjects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve subjects.",
    });
  }
}

export async function getSubjectByIdController(req, res) {
  try {
    const { subjectId } = req.params;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "subjectId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const subject = await getSubjectById({
      schoolId,
      subjectId,
    });

    return res.status(200).json({
      success: true,
      message: "Subject retrieved successfully.",
      data: subject,
    });
  } catch (error) {
    console.error("Get subject by ID error:", error);

    if (error.code === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve subject.",
    });
  }
}

export async function updateSubjectController(req, res) {
  try {
    const { subjectId } = req.params;
    const { name, code, description, status } = req.body;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        message: "subjectId is required.",
      });
    }

    if (
      name === undefined &&
      code === undefined &&
      description === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field must be provided.",
      });
    }

    const validStatuses = ["ACTIVE", "INACTIVE"];

    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid subject status. Allowed values are: ${validStatuses.join(", ")}.`,
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const subject = await updateSubject({
      schoolId,
      subjectId,
      name,
      code,
      description,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully.",
      data: subject,
    });
  } catch (error) {
    console.error("Update subject error:", error);

    if (error.code === "SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    if (error.code === "SUBJECT_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "A subject with this name or code already exists for this school.",
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
      message: "Failed to update subject.",
    });
  }
}
