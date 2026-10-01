import {
  createAttendance,
  getClassAttendanceByDate,
  getStudentAttendanceByDateRange,
  getStudentAttendanceSummary,
  updateAttendance,
  deleteAttendance,
} from "../services/attendanceService.js";

export async function createAttendanceController(req, res) {
  try {
    const {
      studentId,
      academicYearId,
      termId,
      classId,
      date,
      status,
      remarks,
    } = req.body;

    if (!studentId || !academicYearId || !classId || !date || !status) {
      return res.status(400).json({
        success: false,
        message:
          "studentId, academicYearId, classId, date, and status are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const attendance = await createAttendance({
      schoolId,
      studentId,
      academicYearId,
      termId,
      classId,
      date,
      status,
      remarks,
    });

    return res.status(201).json({
      success: true,
      message: "Attendance recorded successfully.",
      data: attendance,
    });
  } catch (error) {
    console.error("Create attendance error:", error);

    if (error.code === "INVALID_DATE") {
      return res.status(400).json({
        success: false,
        message: "date must use YYYY-MM-DD format.",
      });
    }

    if (error.code === "INVALID_STATUS") {
      return res.status(400).json({
        success: false,
        message: "status must be PRESENT, ABSENT, LATE, or EXCUSED.",
      });
    }

    if (error.code === "STUDENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (error.code === "ACADEMIC_YEAR_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Academic year not found.",
      });
    }

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found for the selected academic year.",
      });
    }

    if (error.code === "STUDENT_NOT_ENROLLED") {
      return res.status(400).json({
        success: false,
        message:
          "Student is not actively enrolled in this class for the selected academic year.",
      });
    }

    if (error.code === "TERM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Term not found for the selected academic year.",
      });
    }

    if (error.code === "ATTENDANCE_EXISTS") {
      return res.status(409).json({
        success: false,
        message:
          "Attendance has already been recorded for this student on this date.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to record attendance.",
    });
  }
}

export async function getClassAttendanceByDateController(req, res) {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    if (!classId || !date) {
      return res.status(400).json({
        success: false,
        message: "classId and date are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const result = await getClassAttendanceByDate({
      schoolId,
      classId,
      date,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get class attendance error:", error);

    if (error.code === "INVALID_DATE") {
      return res.status(400).json({
        success: false,
        message: "date must use YYYY-MM-DD format.",
      });
    }

    if (error.code === "CLASS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Class not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve class attendance.",
    });
  }
}

export async function getStudentAttendanceByDateRangeController(req, res) {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!studentId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "studentId, startDate, and endDate are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const result = await getStudentAttendanceByDateRange({
      schoolId,
      studentId,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get student attendance error:", error);

    if (error.code === "INVALID_DATE") {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format.",
      });
    }

    if (error.code === "INVALID_DATE_RANGE") {
      return res.status(400).json({
        success: false,
        message: "startDate cannot be later than endDate.",
      });
    }

    if (error.code === "STUDENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve student attendance.",
    });
  }
}

export async function getStudentAttendanceSummaryController(req, res) {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!studentId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "studentId, startDate, and endDate are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const result = await getStudentAttendanceSummary({
      schoolId,
      studentId,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get student attendance summary error:", error);

    if (error.code === "INVALID_DATE") {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format.",
      });
    }

    if (error.code === "INVALID_DATE_RANGE") {
      return res.status(400).json({
        success: false,
        message: "startDate cannot be later than endDate.",
      });
    }

    if (error.code === "STUDENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve student attendance summary.",
    });
  }
}

export async function updateAttendanceController(req, res) {
  try {
    const { attendanceId } = req.params;
    const { status, remarks } = req.body;

    if (!attendanceId || !status) {
      return res.status(400).json({
        success: false,
        message: "attendanceId and status are required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const attendance = await updateAttendance({
      schoolId,
      attendanceId,
      status,
      remarks,
    });

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully.",
      data: attendance,
    });
  } catch (error) {
    console.error("Update attendance error:", error);

    if (error.code === "INVALID_STATUS") {
      return res.status(400).json({
        success: false,
        message: "status must be PRESENT, ABSENT, LATE, or EXCUSED.",
      });
    }

    if (error.code === "ATTENDANCE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update attendance.",
    });
  }
}

export async function deleteAttendanceController(req, res) {
  try {
    const { attendanceId } = req.params;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "attendanceId is required.",
      });
    }

    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not associated with a school.",
      });
    }

    const attendance = await deleteAttendance({
      schoolId,
      attendanceId,
    });

    return res.status(200).json({
      success: true,
      message: "Attendance deleted successfully.",
      data: attendance,
    });
  } catch (error) {
    console.error("Delete attendance error:", error);

    if (error.code === "ATTENDANCE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete attendance.",
    });
  }
}
