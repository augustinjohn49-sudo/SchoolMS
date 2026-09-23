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

export async function getStudentEnrollmentsBySchool({
  schoolId,
  academicYearId,
  classId,
  streamId,
  status,
  page = 1,
  limit = 20,
  sortBy = "lastName",
  sortOrder = "asc",
}) {
  const allowedSortFields = {
    lastName: 's."lastName"',
    firstName: 's."firstName"',
    admissionNumber: 's."admissionNumber"',
    enrolledAt: 'se."enrolledAt"',
    createdAt: 'se."createdAt"',
    academicYear: 'ay."startDate"',
  };

  const sortColumn = allowedSortFields[sortBy] || allowedSortFields.lastName;

  const sortDirection = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
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
     AND ($2::text IS NULL OR se."academicYearId" = $2)
     AND ($3::text IS NULL OR se."classId" = $3)
     AND ($4::text IS NULL OR se."streamId" = $4)
     AND ($5::"EnrollmentStatus" IS NULL OR se.status = $5::"EnrollmentStatus")`,
    [
      schoolId,
      academicYearId ?? null,
      classId ?? null,
      streamId ?? null,
      status ?? null,
    ],
  );

  const total = countResult.rows[0].total;
  const totalPages = Math.ceil(total / limit);

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
      AND ($2::text IS NULL OR se."academicYearId" = $2)
      AND ($3::text IS NULL OR se."classId" = $3)
      AND ($4::text IS NULL OR se."streamId" = $4)
      AND ($5::"EnrollmentStatus" IS NULL OR se.status = $5::"EnrollmentStatus")

    ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $6
      OFFSET $7`,
    [
      schoolId,
      academicYearId ?? null,
      classId ?? null,
      streamId ?? null,
      status ?? null,
      limit,
      offset,
    ],
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getStudentEnrollmentById({ schoolId, enrollmentId }) {
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

    WHERE se.id = $1
      AND s."schoolId" = $2

    LIMIT 1`,
    [enrollmentId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Student enrollment not found.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function getStudentEnrollmentHistory({ schoolId, studentId }) {
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

       ay.name AS "academicYearName",
       ay."startDate" AS "academicYearStartDate",
       ay."endDate" AS "academicYearEndDate",

       c.name AS "className",
       c.level AS "classLevel",

       st.name AS "streamName"

     FROM "StudentEnrollment" se

     INNER JOIN "AcademicYear" ay
       ON ay.id = se."academicYearId"

     INNER JOIN "Class" c
       ON c.id = se."classId"

     LEFT JOIN "Stream" st
       ON st.id = se."streamId"

     WHERE se."studentId" = $1
       AND ay."schoolId" = $2

     ORDER BY ay."startDate" DESC, se."enrolledAt" DESC`,
    [studentId, schoolId],
  );

  return result.rows;
}

export async function updateStudentEnrollment({
  schoolId,
  enrollmentId,
  academicYearId,
  classId,
  streamId,
  status,
}) {
  // First, verify that the enrollment exists
  // and belongs to the authenticated user's school.
  const existingResult = await pool.query(
    `SELECT
      se.id,
      se."studentId",
      se."academicYearId",
      se."classId",
      se."streamId",
      se.status,
      s."schoolId"
    FROM "StudentEnrollment" se
    INNER JOIN "Student" s
      ON s.id = se."studentId"
    WHERE se.id = $1
    LIMIT 1`,
    [enrollmentId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Student enrollment not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingEnrollment = existingResult.rows[0];

  if (existingEnrollment.schoolId !== schoolId) {
    const error = new Error(
      "You do not have access to this student enrollment.",
    );
    error.statusCode = 403;
    throw error;
  }

  // If academic year is being changed, verify it belongs
  // to the authenticated user's school.
  if (academicYearId !== undefined) {
    const academicYearResult = await pool.query(
      `SELECT
        id,
        "schoolId"
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
  }

  // If class is being changed, verify that it belongs
  // to the selected academic year and school.
  if (classId !== undefined) {
    const selectedAcademicYearId =
      academicYearId ?? existingEnrollment.academicYearId;

    const classResult = await pool.query(
      `SELECT
        c.id,
        ay."schoolId",
        c."academicYearId"
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

    if (classResult.rows[0].academicYearId !== selectedAcademicYearId) {
      const error = new Error(
        "The selected class does not belong to the selected academic year.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // If stream is being changed, verify that it belongs
  // to the selected class.
  if (streamId !== undefined && streamId !== null) {
    const selectedClassId = classId ?? existingEnrollment.classId;

    const streamResult = await pool.query(
      `SELECT
        st.id,
        c.id AS "classId",
        ay."schoolId"
      FROM "Stream" st
      INNER JOIN "Class" c
        ON c.id = st."classId"
      INNER JOIN "AcademicYear" ay
        ON ay.id = c."academicYearId"
      WHERE st.id = $1
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

    if (streamResult.rows[0].classId !== selectedClassId) {
      const error = new Error(
        "The selected stream does not belong to the selected class.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedAcademicYearId =
    academicYearId ?? existingEnrollment.academicYearId;

  const updatedClassId = classId ?? existingEnrollment.classId;

  const updatedStreamId =
    streamId !== undefined ? streamId : existingEnrollment.streamId;

  const updatedStatus = status ?? existingEnrollment.status;

  // Prevent the same student from being enrolled twice
  // in the same academic year.
  if (updatedAcademicYearId !== existingEnrollment.academicYearId) {
    const duplicateResult = await pool.query(
      `SELECT id
       FROM "StudentEnrollment"
       WHERE "studentId" = $1
         AND "academicYearId" = $2
         AND id <> $3
       LIMIT 1`,
      [existingEnrollment.studentId, updatedAcademicYearId, enrollmentId],
    );

    if (duplicateResult.rows.length > 0) {
      const error = new Error(
        "This student is already enrolled in the selected academic year.",
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const result = await pool.query(
    `UPDATE "StudentEnrollment"
     SET
       "academicYearId" = $1,
       "classId" = $2,
       "streamId" = $3,
       status = $4,
       "updatedAt" = NOW()
     WHERE id = $5
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
    [
      updatedAcademicYearId,
      updatedClassId,
      updatedStreamId,
      updatedStatus,
      enrollmentId,
    ],
  );

  return result.rows[0];
}

export async function deleteStudentEnrollment({ schoolId, enrollmentId }) {
  const existingResult = await pool.query(
    `SELECT
      se.id,
      se."studentId",
      s."schoolId"
    FROM "StudentEnrollment" se
    INNER JOIN "Student" s
      ON s.id = se."studentId"
    WHERE se.id = $1
    LIMIT 1`,
    [enrollmentId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Student enrollment not found.");
    error.statusCode = 404;
    throw error;
  }

  if (existingResult.rows[0].schoolId !== schoolId) {
    const error = new Error(
      "You do not have access to this student enrollment.",
    );
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `DELETE FROM "StudentEnrollment"
     WHERE id = $1
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
    [enrollmentId],
  );

  return result.rows[0];
}
