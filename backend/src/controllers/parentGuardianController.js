import {
  createParentGuardian,
  getParentGuardianById,
  getParentGuardians,
  updateParentGuardian,
  deactivateParentGuardian,
  linkGuardianToStudent,
  unlinkGuardianFromStudent,
  getStudentGuardians,
  getGuardianStudents,
  activateParentGuardian,
} from "../services/parentGuardianService.js";

export async function createParentGuardianController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    const parentGuardian = await createParentGuardian({
      schoolId,
      ...req.body,
    });

    return res.status(201).json({
      message: "Parent or guardian created successfully.",
      parentGuardian,
    });
  } catch (error) {
    console.error("Create parent/guardian error:", error);

    return res.status(400).json({
      message: error.message || "Failed to create parent or guardian.",
      code: error.code || "CREATE_PARENT_GUARDIAN_ERROR",
    });
  }
}

export async function getParentGuardianByIdController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { parentGuardianId } = req.params;

    const parentGuardian = await getParentGuardianById({
      schoolId,
      parentGuardianId,
    });

    return res.status(200).json({
      parentGuardian,
    });
  } catch (error) {
    console.error("Get parent/guardian error:", error);

    const statusCode = error.code === "GUARDIAN_NOT_FOUND" ? 404 : 400;

    return res.status(statusCode).json({
      message: error.message || "Failed to get parent or guardian.",
      code: error.code || "GET_PARENT_GUARDIAN_ERROR",
    });
  }
}

export async function getParentGuardiansController(req, res) {
  try {
    const schoolId = req.user.schoolId;

    const { status, search } = req.query;

    const parentGuardians = await getParentGuardians({
      schoolId,
      status: status || null,
      search: search || null,
    });

    return res.status(200).json({
      count: parentGuardians.length,
      parentGuardians,
    });
  } catch (error) {
    console.error("Get parent/guardians error:", error);

    return res.status(400).json({
      message: error.message || "Failed to get parent/guardians.",
      code: error.code || "GET_PARENT_GUARDIANS_ERROR",
    });
  }
}

export async function updateParentGuardianController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { parentGuardianId } = req.params;

    const parentGuardian = await updateParentGuardian({
      schoolId,
      parentGuardianId,
      ...req.body,
    });

    return res.status(200).json({
      message: "Parent or guardian updated successfully.",
      parentGuardian,
    });
  } catch (error) {
    console.error("Update parent/guardian error:", error);

    const statusCode = error.code === "GUARDIAN_NOT_FOUND" ? 404 : 400;

    return res.status(statusCode).json({
      message: error.message || "Failed to update parent or guardian.",
      code: error.code || "UPDATE_PARENT_GUARDIAN_ERROR",
    });
  }
}

export async function deactivateParentGuardianController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { parentGuardianId } = req.params;

    const parentGuardian = await deactivateParentGuardian({
      schoolId,
      parentGuardianId,
    });

    return res.status(200).json({
      message: "Parent or guardian deactivated successfully.",
      parentGuardian,
    });
  } catch (error) {
    console.error("Deactivate parent/guardian error:", error);

    const statusCode = error.code === "GUARDIAN_NOT_FOUND" ? 404 : 400;

    return res.status(statusCode).json({
      message: error.message || "Failed to deactivate parent or guardian.",
      code: error.code || "DEACTIVATE_PARENT_GUARDIAN_ERROR",
    });
  }
}

export async function linkGuardianToStudentController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { parentGuardianId } = req.params;

    const {
      studentId,
      relationship,
      isPrimary = false,
      isEmergencyContact = false,
    } = req.body;

    const relationshipRecord = await linkGuardianToStudent({
      schoolId,
      parentGuardianId,
      studentId,
      relationship,
      isPrimary,
      isEmergencyContact,
    });

    return res.status(201).json({
      message: "Parent or guardian linked to student successfully.",
      relationship: relationshipRecord,
    });
  } catch (error) {
    console.error("Link guardian to student error:", error);

    let statusCode = 400;

    if (
      error.code === "GUARDIAN_NOT_FOUND" ||
      error.code === "STUDENT_NOT_FOUND"
    ) {
      statusCode = 404;
    }

    return res.status(statusCode).json({
      message: error.message || "Failed to link parent or guardian to student.",
      code: error.code || "LINK_GUARDIAN_ERROR",
    });
  }
}

export async function unlinkGuardianFromStudentController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { parentGuardianId, studentId } = req.params;

    const relationship = await unlinkGuardianFromStudent({
      schoolId,
      parentGuardianId,
      studentId,
    });

    return res.status(200).json({
      message: "Parent or guardian unlinked from student successfully.",
      relationship,
    });
  } catch (error) {
    console.error("Unlink guardian from student error:", error);

    const statusCode = error.code === "RELATIONSHIP_NOT_FOUND" ? 404 : 400;

    return res.status(statusCode).json({
      message:
        error.message || "Failed to unlink parent or guardian from student.",
      code: error.code || "UNLINK_GUARDIAN_ERROR",
    });
  }
}

export async function getStudentGuardiansController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { studentId } = req.params;

    const parentGuardians = await getStudentGuardians({
      schoolId,
      studentId,
    });

    return res.status(200).json({
      count: parentGuardians.length,
      parentGuardians,
    });
  } catch (error) {
    console.error("Get student guardians error:", error);

    const statusCode = error.code === "STUDENT_NOT_FOUND" ? 404 : 400;

    return res.status(statusCode).json({
      message: error.message || "Failed to get student guardians.",
      code: error.code || "GET_STUDENT_GUARDIANS_ERROR",
    });
  }
}

export async function getGuardianStudentsController(req, res) {
  try {
    const schoolId = req.user.schoolId;
    const { parentGuardianId } = req.params;

    const students = await getGuardianStudents({
      schoolId,
      parentGuardianId,
    });

    return res.status(200).json({
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Get guardian students error:", error);

    const statusCode = error.code === "GUARDIAN_NOT_FOUND" ? 404 : 400;

    return res.status(statusCode).json({
      message: error.message || "Failed to get guardian students.",
      code: error.code || "GET_GUARDIAN_STUDENTS_ERROR",
    });
  }
}

export const activateParentGuardianController = async (req, res) => {
  try {
    const { parentGuardianId } = req.params;

    const parentGuardian = await activateParentGuardian({
      schoolId: req.user.schoolId,
      parentGuardianId,
    });

    return res.status(200).json({
      message: "Parent or guardian activated successfully.",
      parentGuardian,
    });
  } catch (error) {
    console.error("Activate parent guardian error:", error);

    if (error.code === "GUARDIAN_NOT_FOUND") {
      return res.status(404).json({
        message: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      message: "Failed to activate parent or guardian.",
    });
  }
};
