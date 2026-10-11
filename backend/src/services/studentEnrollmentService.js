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
    `SELECT
     id,
     "schoolId",
     status
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

  if (academicYearResult.rows[0].status !== "ACTIVE") {
    const error = new Error(
      "Students can only be enrolled in an active academic year.",
    );
    error.statusCode = 400;
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

  // 5. Prevent a student from having multiple active enrollments.
  const activeEnrollmentResult = await pool.query(
    `SELECT id, "academicYearId", "classId", "streamId"
   FROM "StudentEnrollment"
   WHERE "studentId" = $1
     AND status = 'ACTIVE'
   LIMIT 1`,
    [studentId],
  );

  if (activeEnrollmentResult.rows.length > 0) {
    const error = new Error(
      "The student already has an active enrollment. Complete, transfer, or withdraw the current enrollment before creating a new one.",
    );
    error.statusCode = 409;
    throw error;
  }

  // 6. Prevent duplicate enrollment for the same student and academic year.
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

  // 7. Create the enrollment.
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

export async function getCurrentStudentEnrollment({ schoolId, studentId }) {
  // 1. Verify the student exists and belongs to this school.
  const studentResult = await pool.query(
    `SELECT
       id,
       "schoolId"
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

  // 2. Retrieve the student's current active enrollment.
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
       AND se.status = 'ACTIVE'

     ORDER BY ay."startDate" DESC, se."enrolledAt" DESC

     LIMIT 1`,
    [studentId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Student has no current enrollment.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
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

  // Reactivating a closed enrollment is allowed,
  // but only if the student does not already have
  // another ACTIVE enrollment.

  if (existingEnrollment.status !== "ACTIVE" && updatedStatus === "ACTIVE") {
    const activeEnrollmentResult = await pool.query(
      `SELECT id
     FROM "StudentEnrollment"
     WHERE "studentId" = $1
       AND status = 'ACTIVE'
       AND id <> $2
     LIMIT 1`,
      [existingEnrollment.studentId, enrollmentId],
    );

    if (activeEnrollmentResult.rows.length > 0) {
      const error = new Error(
        "This student already has another active enrollment.",
      );
      error.statusCode = 409;
      throw error;
    }
  }

  // Closed enrollments cannot be changed directly
  // from one closed status to another.

  if (
    existingEnrollment.status !== "ACTIVE" &&
    updatedStatus !== existingEnrollment.status &&
    updatedStatus !== "ACTIVE"
  ) {
    const error = new Error(
      "A completed, transferred, or withdrawn enrollment can only be reactivated.",
    );
    error.statusCode = 400;
    throw error;
  }

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

  if (existingResult.rows[0].schoolId !== schoolId) {
    const error = new Error(
      "You do not have access to this student enrollment.",
    );
    error.statusCode = 403;
    throw error;
  }

  if (existingResult.rows[0].status === "ACTIVE") {
    const error = new Error(
      "An active student enrollment cannot be deleted. Change the enrollment status first.",
    );
    error.statusCode = 400;
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

export async function promoteStudent({
  schoolId,
  studentId,
  academicYearId,
  classId,
  streamId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verify that the student belongs to the authenticated school.
    const studentResult = await client.query(
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

    if (studentResult.rows.length === 0) {
      const error = new Error("Student not found.");
      error.statusCode = 404;
      throw error;
    }

    // 2. Find the student's current active enrollment.
    const currentEnrollmentResult = await client.query(
      `
      SELECT
        se.id,
        se."academicYearId",
        se."classId",
        se."streamId",
        se.status,
        ay.name AS "academicYearName",
        c.name AS "className",
        s.name AS "streamName"
      FROM "StudentEnrollment" se
      INNER JOIN "AcademicYear" ay
        ON ay.id = se."academicYearId"
      INNER JOIN "Class" c
        ON c.id = se."classId"
      LEFT JOIN "Stream" s
        ON s.id = se."streamId"
      WHERE se."studentId" = $1
        AND ay."schoolId" = $2
        AND se.status = 'ACTIVE'
      ORDER BY ay."startDate" DESC, se."enrolledAt" DESC
      LIMIT 1
      `,
      [studentId, schoolId],
    );

    if (currentEnrollmentResult.rows.length === 0) {
      const error = new Error("Student has no current enrollment.");
      error.statusCode = 404;
      throw error;
    }

    const currentEnrollment = currentEnrollmentResult.rows[0];

    // 3. Prevent promoting a student into the same academic year.
    if (currentEnrollment.academicYearId === academicYearId) {
      const error = new Error(
        "The destination academic year must be different from the student's current academic year.",
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Verify that the destination academic year belongs to the school
    //    and is active.
    const academicYearResult = await client.query(
      `
      SELECT
        id,
        "schoolId",
        name,
        "startDate",
        "endDate",
        status
      FROM "AcademicYear"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
      `,
      [academicYearId, schoolId],
    );

    if (academicYearResult.rows.length === 0) {
      const error = new Error("Destination academic year not found.");
      error.statusCode = 404;
      throw error;
    }

    const destinationAcademicYear = academicYearResult.rows[0];

    if (destinationAcademicYear.status !== "ACTIVE") {
      const error = new Error("The destination academic year must be active.");
      error.statusCode = 400;
      throw error;
    }

    // 5. Verify that the destination class belongs to the destination
    //    academic year and school.
    const classResult = await client.query(
      `
      SELECT
        id,
        "academicYearId",
        name,
        level
      FROM "Class"
      WHERE id = $1
        AND "academicYearId" = $2
      LIMIT 1
      `,
      [classId, academicYearId],
    );

    if (classResult.rows.length === 0) {
      const error = new Error(
        "Destination class does not belong to the destination academic year.",
      );
      error.statusCode = 400;
      throw error;
    }

    const destinationClass = classResult.rows[0];

    // 6. If a stream was supplied, verify that it belongs to the
    //    destination class.
    if (streamId) {
      const streamResult = await client.query(
        `
        SELECT
          id,
          "classId",
          name
        FROM "Stream"
        WHERE id = $1
          AND "classId" = $2
        LIMIT 1
        `,
        [streamId, classId],
      );

      if (streamResult.rows.length === 0) {
        const error = new Error(
          "Destination stream does not belong to the destination class.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // 7. Prevent duplicate enrollment in the destination academic year.
    const duplicateEnrollmentResult = await client.query(
      `
      SELECT id
      FROM "StudentEnrollment"
      WHERE "studentId" = $1
        AND "academicYearId" = $2
      LIMIT 1
      `,
      [studentId, academicYearId],
    );

    if (duplicateEnrollmentResult.rows.length > 0) {
      const error = new Error(
        "The student is already enrolled in the destination academic year.",
      );
      error.statusCode = 409;
      throw error;
    }

    // 8. Complete the current enrollment.
    await client.query(
      `
      UPDATE "StudentEnrollment"
      SET
        status = 'COMPLETED',
        "updatedAt" = NOW()
      WHERE id = $1
      `,
      [currentEnrollment.id],
    );

    // 9. Create the new enrollment for the destination academic year.
    const newEnrollmentResult = await client.query(
      `
      INSERT INTO "StudentEnrollment" (
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
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
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
        "updatedAt"
      `,
      [studentId, academicYearId, classId, streamId || null],
    );

    await client.query("COMMIT");

    return {
      previousEnrollment: {
        id: currentEnrollment.id,
        academicYearId: currentEnrollment.academicYearId,
        academicYearName: currentEnrollment.academicYearName,
        classId: currentEnrollment.classId,
        className: currentEnrollment.className,
        streamId: currentEnrollment.streamId,
        streamName: currentEnrollment.streamName,
        status: "COMPLETED",
      },
      newEnrollment: newEnrollmentResult.rows[0],
      destination: {
        academicYear: destinationAcademicYear,
        class: destinationClass,
        streamId: streamId || null,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
