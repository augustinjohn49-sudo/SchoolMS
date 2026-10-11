import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

const VALID_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

function normalizeDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error("date must use YYYY-MM-DD format.");

    error.code = "INVALID_DATE";
    throw error;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error("Invalid attendance date.");
    error.code = "INVALID_DATE";
    throw error;
  }

  return parsedDate;
}

function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    const error = new Error(
      "status must be PRESENT, ABSENT, LATE, or EXCUSED.",
    );

    error.code = "INVALID_STATUS";
    throw error;
  }
}

export async function createAttendance({
  schoolId,
  studentId,
  academicYearId,
  termId = null,
  classId,
  date,
  status,
  remarks = null,
}) {
  validateStatus(status);

  const attendanceDate = normalizeDate(date);

  const studentResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      "firstName",
      "lastName",
      status
    FROM "Student"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [studentId, schoolId],
  );

  const student = studentResult.rows[0];

  if (!student) {
    const error = new Error("Student not found.");
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  const academicYearResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      status
    FROM "AcademicYear"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [academicYearId, schoolId],
  );

  const academicYear = academicYearResult.rows[0];

  if (!academicYear) {
    const error = new Error("Academic year not found.");
    error.code = "ACADEMIC_YEAR_NOT_FOUND";
    throw error;
  }

  const classResult = await pool.query(
    `
    SELECT
      c.id,
      c.name,
      c."academicYearId"
    FROM "Class" c
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE c.id = $1
      AND c."academicYearId" = $2
      AND ay."schoolId" = $3
    LIMIT 1
    `,
    [classId, academicYearId, schoolId],
  );

  const classRecord = classResult.rows[0];

  if (!classRecord) {
    const error = new Error("Class not found for the selected academic year.");

    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const enrollmentResult = await pool.query(
    `
    SELECT
      id,
      "studentId",
      "academicYearId",
      "classId",
      status
    FROM "StudentEnrollment"
    WHERE "studentId" = $1
      AND "academicYearId" = $2
      AND "classId" = $3
      AND status = 'ACTIVE'
    LIMIT 1
    `,
    [studentId, academicYearId, classId],
  );

  if (enrollmentResult.rows.length === 0) {
    const error = new Error(
      "Student is not actively enrolled in this class for the selected academic year.",
    );

    error.code = "STUDENT_NOT_ENROLLED";
    throw error;
  }

  if (termId) {
    const termResult = await pool.query(
      `
      SELECT
        id,
        "academicYearId",
        name,
        status
      FROM "Term"
      WHERE id = $1
        AND "academicYearId" = $2
      LIMIT 1
      `,
      [termId, academicYearId],
    );

    if (termResult.rows.length === 0) {
      const error = new Error("Term not found for the selected academic year.");

      error.code = "TERM_NOT_FOUND";
      throw error;
    }
  }

  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM "Attendance"
    WHERE "studentId" = $1
      AND date = $2
    LIMIT 1
    `,
    [studentId, attendanceDate],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "Attendance has already been recorded for this student on this date.",
    );

    error.code = "ATTENDANCE_EXISTS";
    throw error;
  }

  const id = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "Attendance"
    (
      id,
      "studentId",
      "academicYearId",
      "termId",
      "classId",
      date,
      status,
      remarks,
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING
      id,
      "studentId",
      "academicYearId",
      "termId",
      "classId",
      date,
      status,
      remarks,
      "createdAt",
      "updatedAt"
    `,
    [
      id,
      studentId,
      academicYearId,
      termId,
      classId,
      attendanceDate,
      status,
      remarks,
      now,
      now,
    ],
  );

  return result.rows[0];
}

export async function getClassAttendanceByDate({ schoolId, classId, date }) {
  const attendanceDate = normalizeDate(date);

  const classResult = await pool.query(
    `
    SELECT
      c.id,
      c.name,
      c."academicYearId"
    FROM "Class" c
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE c.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [classId, schoolId],
  );

  const classRecord = classResult.rows[0];

  if (!classRecord) {
    const error = new Error("Class not found.");
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      a.id,
      a."studentId",
      a."academicYearId",
      a."termId",
      a."classId",
      a.date,
      a.status,
      a.remarks,
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName"
    FROM "Attendance" a
    INNER JOIN "Student" s
      ON s.id = a."studentId"
    WHERE a."classId" = $1
      AND a.date = $2
      AND s."schoolId" = $3
    ORDER BY
      s."firstName" ASC,
      s."lastName" ASC
    `,
    [classId, attendanceDate, schoolId],
  );

  return {
    class: classRecord,
    date,
    attendance: result.rows,
  };
}

export async function getStudentAttendanceByDateRange({
  schoolId,
  studentId,
  startDate,
  endDate,
}) {
  const attendanceStartDate = normalizeDate(startDate);
  const attendanceEndDate = normalizeDate(endDate);

  if (attendanceStartDate > attendanceEndDate) {
    const error = new Error("startDate cannot be later than endDate.");

    error.code = "INVALID_DATE_RANGE";
    throw error;
  }

  const studentResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      "admissionNumber",
      "firstName",
      "middleName",
      "lastName",
      status
    FROM "Student"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [studentId, schoolId],
  );

  const student = studentResult.rows[0];

  if (!student) {
    const error = new Error("Student not found.");
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      a.id,
      a."studentId",
      a."academicYearId",
      a."termId",
      a."classId",
      a.date,
      a.status,
      a.remarks,
      c.name AS "className"
    FROM "Attendance" a
    INNER JOIN "Class" c
      ON c.id = a."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = a."academicYearId"
    INNER JOIN "Student" s
      ON s.id = a."studentId"
    WHERE a."studentId" = $1
      AND a.date >= $2
      AND a.date < $3 + INTERVAL '1 day'
      AND ay."schoolId" = $4
      AND s."schoolId" = $4
    ORDER BY a.date ASC
    `,
    [studentId, attendanceStartDate, attendanceEndDate, schoolId],
  );

  return {
    student,
    startDate,
    endDate,
    attendance: result.rows,
  };
}

export async function getStudentAttendanceSummary({
  schoolId,
  studentId,
  startDate,
  endDate,
}) {
  const attendanceStartDate = normalizeDate(startDate);
  const attendanceEndDate = normalizeDate(endDate);

  if (attendanceStartDate > attendanceEndDate) {
    const error = new Error("startDate cannot be later than endDate.");

    error.code = "INVALID_DATE_RANGE";
    throw error;
  }

  const studentResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      "admissionNumber",
      "firstName",
      "middleName",
      "lastName",
      status
    FROM "Student"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [studentId, schoolId],
  );

  const student = studentResult.rows[0];

  if (!student) {
    const error = new Error("Student not found.");
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS "totalDays",
      COUNT(*) FILTER (
        WHERE a.status = 'PRESENT'
      )::int AS present,
      COUNT(*) FILTER (
        WHERE a.status = 'ABSENT'
      )::int AS absent,
      COUNT(*) FILTER (
        WHERE a.status = 'LATE'
      )::int AS late,
      COUNT(*) FILTER (
        WHERE a.status = 'EXCUSED'
      )::int AS excused
    FROM "Attendance" a
    INNER JOIN "AcademicYear" ay
      ON ay.id = a."academicYearId"
    INNER JOIN "Student" s
      ON s.id = a."studentId"
    WHERE a."studentId" = $1
      AND a.date >= $2
      AND a.date < $3 + INTERVAL '1 day'
      AND ay."schoolId" = $4
      AND s."schoolId" = $4
    `,
    [studentId, attendanceStartDate, attendanceEndDate, schoolId],
  );

  return {
    student,
    startDate,
    endDate,
    summary: result.rows[0],
  };
}

export async function updateAttendance({
  schoolId,
  attendanceId,
  status,
  remarks,
}) {
  validateStatus(status);

  const attendanceResult = await pool.query(
    `
    SELECT
      a.id,
      a."studentId",
      a."academicYearId",
      a."termId",
      a."classId",
      a.date,
      a.status,
      a.remarks,
      s."schoolId"
    FROM "Attendance" a
    INNER JOIN "Student" s
      ON s.id = a."studentId"
    WHERE a.id = $1
      AND s."schoolId" = $2
    LIMIT 1
    `,
    [attendanceId, schoolId],
  );

  const attendance = attendanceResult.rows[0];

  if (!attendance) {
    const error = new Error("Attendance record not found.");
    error.code = "ATTENDANCE_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    UPDATE "Attendance" AS a
    SET
      status = $1,
      remarks = $2,
      "updatedAt" = $3
    FROM "Student" AS s
    INNER JOIN "AcademicYear" AS ay
      ON ay."schoolId" = s."schoolId"
    WHERE a.id = $4
      AND s.id = a."studentId"
      AND ay.id = a."academicYearId"
      AND s."schoolId" = $5
    RETURNING
      a.id,
      a."studentId",
      a."academicYearId",
      a."termId",
      a."classId",
      a.date,
      a.status,
      a.remarks,
      a."createdAt",
      a."updatedAt"
    `,
    [status, remarks ?? null, new Date(), attendanceId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Attendance record not found.");
    error.code = "ATTENDANCE_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function deleteAttendance({ schoolId, attendanceId }) {
  const attendanceResult = await pool.query(
    `
    SELECT
      a.id,
      a."studentId",
      a."academicYearId",
      a."termId",
      a."classId",
      a.date,
      a.status,
      a.remarks
    FROM "Attendance" a
    INNER JOIN "Student" s
      ON s.id = a."studentId"
    WHERE a.id = $1
      AND s."schoolId" = $2
    LIMIT 1
    `,
    [attendanceId, schoolId],
  );

  const attendance = attendanceResult.rows[0];

  if (!attendance) {
    const error = new Error("Attendance record not found.");
    error.code = "ATTENDANCE_NOT_FOUND";
    throw error;
  }

  const deleteResult = await pool.query(
    `
    DELETE FROM "Attendance" AS a
    USING "Student" AS s, "AcademicYear" AS ay
    WHERE a.id = $1
      AND s.id = a."studentId"
      AND ay.id = a."academicYearId"
      AND ay."schoolId" = s."schoolId"
      AND s."schoolId" = $2
    RETURNING a.id
    `,
    [attendanceId, schoolId],
  );

  if (deleteResult.rows.length === 0) {
    const error = new Error("Attendance record not found.");
    error.code = "ATTENDANCE_NOT_FOUND";
    throw error;
  }

  return attendance;
}
