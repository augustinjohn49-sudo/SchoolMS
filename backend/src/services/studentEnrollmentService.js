import pool from "../config/prisma.js";
import { randomUUID } from "crypto";

export async function createStudentEnrollment({
  schoolId,
  studentId,
  academicYearId,
  classId,
  streamId,
}) {
  // 1. Verify the student exists and belongs to this school.
  const studentResult = await pool.query(
    `SELECT id, "schoolId"
     FROM "Student"
     WHERE id = $1
     LIMIT 1`,
    [studentId],
  );

  if (studentResult.rows.length === 0) {
    const error = new Error("Student not found.");
    error.statusCode = 404;
    throw error;
  }

  if (studentResult.rows[0].schoolId !== schoolId) {
    const error = new Error("You do not have access to this student.");
    error.statusCode = 403;
    throw error;
  }

  // 2. Verify the academic year belongs to this school.
  const academicYearResult = await pool.query(
    `SELECT id, "schoolId"
     FROM "AcademicYear"
     WHERE id = $1
     LIMIT 1`,
    [academicYearId],
  );

  if (academicYearResult.rows.length === 0) {
    const error = new Error("Academic year not found.");
    error.statusCode = 404;
    throw error;
  }

  if (academicYearResult.rows[0].schoolId !== schoolId) {
    const error = new Error("You do not have access to this academic year.");
    error.statusCode = 403;
    throw error;
  }

  // 3. Verify the class belongs to the academic year.
  const classResult = await pool.query(
    `SELECT
       c.id,
       c."academicYearId",
       ay."schoolId"
     FROM "Class" c
     INNER JOIN "AcademicYear" ay
       ON ay.id = c."academicYearId"
     WHERE c.id = $1
     LIMIT 1`,
    [classId],
  );

  if (classResult.rows.length === 0) {
    const error = new Error("Class not found.");
    error.statusCode = 404;
    throw error;
  }

  if (classResult.rows[0].schoolId !== schoolId) {
    const error = new Error("You do not have access to this class.");
    error.statusCode = 403;
    throw error;
  }

  if (classResult.rows[0].academicYearId !== academicYearId) {
    const error = new Error(
      "The class does not belong to the selected academic year.",
    );
    error.statusCode = 400;
    throw error;
  }

  // 4. If a stream was supplied, verify that it belongs to the class.
  if (streamId) {
    const streamResult = await pool.query(
      `SELECT
         s.id,
         s."classId",
         ay."schoolId"
       FROM "Stream" s
       INNER JOIN "Class" c
         ON c.id = s."classId"
       INNER JOIN "AcademicYear" ay
         ON ay.id = c."academicYearId"
       WHERE s.id = $1
       LIMIT 1`,
      [streamId],
    );

    if (streamResult.rows.length === 0) {
      const error = new Error("Stream not found.");
      error.statusCode = 404;
      throw error;
    }

    if (streamResult.rows[0].schoolId !== schoolId) {
      const error = new Error("You do not have access to this stream.");
      error.statusCode = 403;
      throw error;
    }

    if (streamResult.rows[0].classId !== classId) {
      const error = new Error(
        "The stream does not belong to the selected class.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // 5. Prevent duplicate enrollment for the same student and academic year.
  const duplicateResult = await pool.query(
    `SELECT id
     FROM "StudentEnrollment"
     WHERE "studentId" = $1
       AND "academicYearId" = $2
     LIMIT 1`,
    [studentId, academicYearId],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "The student is already enrolled for this academic year.",
    );
    error.statusCode = 409;
    throw error;
  }

  // 6. Create the enrollment.
  const enrollmentId = randomUUID();

  const result = await pool.query(
    `INSERT INTO "StudentEnrollment" (
      id,
      "studentId",
      "academicYearId",
      "classId",
      "streamId",
      "enrolledAt",
      status,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      NOW(),
      'ACTIVE',
      NOW(),
      NOW()
    )
    RETURNING
      id,
      "studentId",
      "academicYearId",
      "classId",
      "streamId",
      "enrolledAt",
      status,
      "createdAt",
      "updatedAt"`,
    [enrollmentId, studentId, academicYearId, classId, streamId || null],
  );

  return result.rows[0];
}

export async function getStudentEnrollmentsBySchool({ schoolId }) {
  const result = await pool.query(
    `SELECT
      se.id,
      se."studentId",
      se."academicYearId",
      se."classId",
      se."streamId",
      se."enrolledAt",
      se.status,
      se."createdAt",
      se."updatedAt",

      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      ay.name AS "academicYearName",

      c.name AS "className",
      c.level AS "classLevel",

      st.name AS "streamName"

    FROM "StudentEnrollment" se

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    INNER JOIN "Class" c
      ON c.id = se."classId"

    LEFT JOIN "Stream" st
      ON st.id = se."streamId"

    WHERE s."schoolId" = $1

    ORDER BY
      s."lastName" ASC,
      s."firstName" ASC,
      ay."startDate" DESC`,
    [schoolId],
  );

  return result.rows;
}
