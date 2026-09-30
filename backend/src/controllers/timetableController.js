import {
  createTimetableEntry,
  getClassTimetable,
  getTimetableEntryById,
  updateTimetableEntry,
  deleteTimetableEntry,
} from "../services/timetableService.js";

export async function createTimetableEntryController(req, res) {
  try {
    const {
      classId,
      teacherClassSubjectId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      notes,
    } = req.body;

    if (
      !classId ||
      !teacherClassSubjectId ||
      dayOfWeek === undefined ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "classId, teacherClassSubjectId, dayOfWeek, startTime, and endTime are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const entry = await createTimetableEntry({
      schoolId,
      classId,
      teacherClassSubjectId,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      room,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Timetable entry created successfully.",
      data: entry,
    });
  } catch (error) {
    console.error("Create timetable entry error:", error);

    if (error.code === "INVALID_DAY") {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek must be an integer between 1 and 6.",
      });
    }

    if (error.code === "INVALID_TIME") {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime must use HH:MM format.",
      });
    }

    if (error.code === "INVALID_TIME_RANGE") {
      return res.status(400).json({
        success: false,
        message: "startTime must be earlier than endTime.",
      });
    }

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    if (error.code === "TEACHER_CLASS_SUBJECT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Teacher-class-subject assignment not found for this class.",
      });
    }

    if (error.code === "TEACHER_TIMETABLE_CONFLICT") {
      return res.status(409).json({
        success: false,
        message: "The teacher already has a timetable entry during this time.",
      });
    }

    if (error.code === "CLASS_TIMETABLE_CONFLICT") {
      return res.status(409).json({
        success: false,
        message: "The class already has a timetable entry during this time.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create timetable entry.",
    });
  }
}

export async function getClassTimetableController(req, res) {
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

    const timetable = await getClassTimetable({
      schoolId,
      classId,
    });

    return res.status(200).json({
      success: true,
      message: "Class timetable retrieved successfully.",
      data: timetable,
    });
  } catch (error) {
    console.error("Get class timetable error:", error);

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve class timetable.",
    });
  }
}

export async function getTimetableEntryByIdController(req, res) {
  try {
    const { timetableEntryId } = req.params;

    if (!timetableEntryId) {
      return res.status(400).json({
        success: false,
        message: "timetableEntryId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const entry = await getTimetableEntryById({
      schoolId,
      timetableEntryId,
    });

    return res.status(200).json({
      success: true,
      message: "Timetable entry retrieved successfully.",
      data: entry,
    });
  } catch (error) {
    console.error("Get timetable entry error:", error);

    if (error.code === "TIMETABLE_ENTRY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve timetable entry.",
    });
  }
}

export async function updateTimetableEntryController(req, res) {
  try {
    const { timetableEntryId } = req.params;

    if (!timetableEntryId) {
      return res.status(400).json({
        success: false,
        message: "timetableEntryId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const { dayOfWeek, startTime, endTime, room, notes } = req.body;

    const entry = await updateTimetableEntry({
      schoolId,
      timetableEntryId,
      dayOfWeek: dayOfWeek === undefined ? undefined : Number(dayOfWeek),
      startTime,
      endTime,
      room,
      notes,
    });

    return res.status(200).json({
      success: true,
      message: "Timetable entry updated successfully.",
      data: entry,
    });
  } catch (error) {
    console.error("Update timetable entry error:", error);

    if (error.code === "TIMETABLE_ENTRY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found.",
      });
    }

    if (error.code === "INVALID_DAY") {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek must be an integer between 1 and 6.",
      });
    }

    if (error.code === "INVALID_TIME") {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime must use HH:MM format.",
      });
    }

    if (error.code === "INVALID_TIME_RANGE") {
      return res.status(400).json({
        success: false,
        message: "startTime must be earlier than endTime.",
      });
    }

    if (error.code === "TEACHER_TIMETABLE_CONFLICT") {
      return res.status(409).json({
        success: false,
        message: "The teacher already has a timetable entry during this time.",
      });
    }

    if (error.code === "CLASS_TIMETABLE_CONFLICT") {
      return res.status(409).json({
        success: false,
        message: "The class already has a timetable entry during this time.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update timetable entry.",
    });
  }
}

export async function deleteTimetableEntryController(req, res) {
  try {
    const { timetableEntryId } = req.params;

    if (!timetableEntryId) {
      return res.status(400).json({
        success: false,
        message: "timetableEntryId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const deletedEntry = await deleteTimetableEntry({
      schoolId,
      timetableEntryId,
    });

    return res.status(200).json({
      success: true,
      message: "Timetable entry deleted successfully.",
      data: deletedEntry,
    });
  } catch (error) {
    console.error("Delete timetable entry error:", error);

    if (error.code === "TIMETABLE_ENTRY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete timetable entry.",
    });
  }
}
