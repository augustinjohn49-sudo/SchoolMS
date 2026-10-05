import pool from "../config/prisma.js";

export async function getEnrollmentReport({
  schoolId,
  academicYearId,
  termId,
  classId,
  streamId,
  status,
  page = 1,
  limit = 20,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (currentPage - 1) * currentLimit;

  const values = [schoolId];
  const conditions = [`ay."schoolId" = $1`];

  if (academicYearId) {
    values.push(academicYearId);
    conditions.push(`se."academicYearId" = $${values.length}`);
  }

  if (termId) {
    values.push(termId);
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM "Term" t
        WHERE t.id = $${values.length}
          AND t."academicYearId" = se."academicYearId"
      )
    `);
  }

  if (classId) {
    values.push(classId);
    conditions.push(`se."classId" = $${values.length}`);
  }

  if (streamId) {
    values.push(streamId);
    conditions.push(`se."streamId" = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`se.status = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");

  /*
   * Validate that supplied academic year, term, class and stream
   * belong to the selected school/enrollment context.
   */
  if (academicYearId) {
    const academicYearCheck = await pool.query(
      `
        SELECT id
        FROM "AcademicYear"
        WHERE id = $1
          AND "schoolId" = $2
      `,
      [academicYearId, schoolId],
    );

    if (academicYearCheck.rows.length === 0) {
      const error = new Error("Academic year not found.");
      error.code = "ACADEMIC_YEAR_NOT_FOUND";
      throw error;
    }
  }

  if (termId) {
    const termCheck = await pool.query(
      `
        SELECT t.id
        FROM "Term" t
        INNER JOIN "AcademicYear" ay
          ON ay.id = t."academicYearId"
        WHERE t.id = $1
          AND ay."schoolId" = $2
      `,
      [termId, schoolId],
    );

    if (termCheck.rows.length === 0) {
      const error = new Error("Term not found.");
      error.code = "TERM_NOT_FOUND";
      throw error;
    }
  }

  if (classId) {
    const classCheck = await pool.query(
      `
        SELECT c.id
        FROM "Class" c
        INNER JOIN "AcademicYear" ay
          ON ay.id = c."academicYearId"
        WHERE c.id = $1
          AND ay."schoolId" = $2
      `,
      [classId, schoolId],
    );

    if (classCheck.rows.length === 0) {
      const error = new Error("Class not found.");
      error.code = "CLASS_NOT_FOUND";
      throw error;
    }
  }

  if (streamId) {
    const streamCheck = await pool.query(
      `
        SELECT s.id
        FROM "Stream" s
        INNER JOIN "Class" c
          ON c.id = s."classId"
        INNER JOIN "AcademicYear" ay
          ON ay.id = c."academicYearId"
        WHERE s.id = $1
          AND ay."schoolId" = $2
      `,
      [streamId, schoolId],
    );

    if (streamCheck.rows.length === 0) {
      const error = new Error("Stream not found.");
      error.code = "STREAM_NOT_FOUND";
      throw error;
    }
  }

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM "StudentEnrollment" se
    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"
    WHERE ${whereClause}
  `;

  const countResult = await pool.query(countQuery, values);
  const total = countResult.rows[0].total;

  const paginationValues = [...values, currentLimit, offset];

  const reportQuery = `
    WITH enrollment_report AS (
      SELECT
        se.id AS "enrollmentId",
        se."studentId",
        se."academicYearId",
        ay.name AS "academicYear",
        se."classId",
        c.name AS "className",
        se."streamId",
        s.name AS "streamName",
        se.status AS "enrollmentStatus",

        st."admissionNumber",
        st."firstName",
        st."middleName",
        st."lastName",
        st.gender

      FROM "StudentEnrollment" se

      INNER JOIN "AcademicYear" ay
        ON ay.id = se."academicYearId"

      INNER JOIN "Student" st
        ON st.id = se."studentId"

      INNER JOIN "Class" c
        ON c.id = se."classId"

      LEFT JOIN "Stream" s
        ON s.id = se."streamId"

      WHERE ${whereClause}
    )

    SELECT *
    FROM enrollment_report
    ORDER BY
      "academicYear",
      "className",
      "streamName",
      "lastName",
      "firstName"
    LIMIT $${paginationValues.length - 1}
    OFFSET $${paginationValues.length}
  `;

  const reportResult = await pool.query(reportQuery, paginationValues);

  const summaryValues = values;

  const summaryQuery = `
    SELECT
        COUNT(*)::int AS "totalStudents",

        COUNT(*) FILTER (
        WHERE st.gender::text = 'MALE'
        )::int AS "maleStudents",

        COUNT(*) FILTER (
        WHERE st.gender::text = 'FEMALE'
        )::int AS "femaleStudents",

        COUNT(*) FILTER (
        WHERE st.gender IS NULL
        )::int AS "otherOrUnspecified"

    FROM "StudentEnrollment" se

    INNER JOIN "AcademicYear" ay
        ON ay.id = se."academicYearId"

    INNER JOIN "Student" st
        ON st.id = se."studentId"

    WHERE ${whereClause}
    `;

  const summaryResult = await pool.query(summaryQuery, summaryValues);

  const summary = summaryResult.rows[0];

  const totalPages = total === 0 ? 0 : Math.ceil(total / currentLimit);

  return {
    enrollments: reportResult.rows.map((enrollment) => ({
      enrollmentId: enrollment.enrollmentId,

      student: {
        id: enrollment.studentId,
        admissionNumber: enrollment.admissionNumber,
        firstName: enrollment.firstName,
        middleName: enrollment.middleName,
        lastName: enrollment.lastName,
        gender: enrollment.gender,
      },

      academicYear: {
        id: enrollment.academicYearId,
        name: enrollment.academicYear,
      },

      class: {
        id: enrollment.classId,
        name: enrollment.className,
      },

      stream: enrollment.streamId
        ? {
            id: enrollment.streamId,
            name: enrollment.streamName,
          }
        : null,

      status: enrollment.enrollmentStatus,
    })),

    summary: {
      totalStudents: Number(summary.totalStudents),
      maleStudents: Number(summary.maleStudents),
      femaleStudents: Number(summary.femaleStudents),
      otherOrUnspecified: Number(summary.otherOrUnspecified),
    },

    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },

    filters: {
      academicYearId: academicYearId || null,
      termId: termId || null,
      classId: classId || null,
      streamId: streamId || null,
      status: status || null,
    },
  };
}
