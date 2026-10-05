import pool from "../config/prisma.js";

const VALID_STATUSES = ["PUBLISHED"];

function validatePagination(page, limit) {
  const parsedPage = Number(page ?? 1);
  const parsedLimit = Number(limit ?? 20);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    const error = new Error("Page must be a positive integer.");
    error.code = "INVALID_PAGE";
    throw error;
  }

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    const error = new Error("Limit must be between 1 and 100.");
    error.code = "INVALID_LIMIT";
    throw error;
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit,
  };
}

function round(value, decimals = 2) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(Number(value).toFixed(decimals));
}

export async function getStudentPerformanceReport({
  schoolId,
  academicYearId,
  termId,
  classId,
  streamId,
  studentId,
  page,
  limit,
}) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const pagination = validatePagination(page, limit);

  const conditions = [`s."schoolId" = $1`, `rc."status" = 'PUBLISHED'`];

  const values = [schoolId];
  let parameterIndex = 2;

  if (academicYearId) {
    conditions.push(`rc."academicYearId" = $${parameterIndex}`);
    values.push(academicYearId);
    parameterIndex++;
  }

  if (termId) {
    conditions.push(`rc."termId" = $${parameterIndex}`);
    values.push(termId);
    parameterIndex++;
  }

  if (classId) {
    conditions.push(`se."classId" = $${parameterIndex}`);
    values.push(classId);
    parameterIndex++;
  }

  if (streamId) {
    conditions.push(`se."streamId" = $${parameterIndex}`);
    values.push(streamId);
    parameterIndex++;
  }

  if (studentId) {
    conditions.push(`rc."studentEnrollmentId" = se.id`);
    conditions.push(`se."studentId" = $${parameterIndex}`);
    values.push(studentId);
    parameterIndex++;
  }

  const whereClause = conditions.join(" AND ");

  /*
   * Main performance query.
   *
   * A student's overall percentage is weighted:
   *
   *     SUM(marks) / SUM(maxMarks) * 100
   *
   * This is preferable to averaging subject percentages because
   * subjects may have different maximum marks.
   */
  const performanceQuery = `
    SELECT
      rc.id AS "reportCardId",
      rc."studentEnrollmentId",
      rc."academicYearId",
      rc."termId",

      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      ay.name AS "academicYearName",
      t.name AS "termName",

      c.id AS "classId",
      c.name AS "className",

      st.id AS "streamId",
      st.name AS "streamName",

      COUNT(rcs.id)::int AS "subjectCount",

      COALESCE(SUM(rcs.marks), 0) AS "totalMarks",
      COALESCE(SUM(rcs."maxMarks"), 0) AS "totalMaxMarks",

      CASE
        WHEN COALESCE(SUM(rcs."maxMarks"), 0) > 0
        THEN ROUND(
          (
            COALESCE(SUM(rcs.marks), 0)
            / SUM(rcs."maxMarks")
          ) * 100,
          2
        )
        ELSE 0
      END AS "overallPercentage"

    FROM "ReportCard" rc

    INNER JOIN "StudentEnrollment" se
      ON se.id = rc."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = rc."academicYearId"

    INNER JOIN "Term" t
      ON t.id = rc."termId"

    INNER JOIN "Class" c
      ON c.id = se."classId"

    LEFT JOIN "Stream" st
      ON st.id = se."streamId"

    LEFT JOIN "ReportCardSubject" rcs
      ON rcs."reportCardId" = rc.id

    WHERE ${whereClause}

    GROUP BY
      rc.id,
      rc."studentEnrollmentId",
      rc."academicYearId",
      rc."termId",
      s.id,
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",
      ay.name,
      t.name,
      c.id,
      c.name,
      st.id,
      st.name

    ORDER BY
      ay.name DESC,
      t.name DESC,
      "overallPercentage" DESC,
      s."lastName" ASC,
      s."firstName" ASC

    LIMIT $${parameterIndex}
    OFFSET $${parameterIndex + 1}
  `;

  const performanceValues = [...values, pagination.limit, pagination.offset];

  /*
   * Count report cards matching the filters.
   */
  const countQuery = `
    SELECT COUNT(DISTINCT rc.id)::int AS total
    FROM "ReportCard" rc

    INNER JOIN "StudentEnrollment" se
      ON se.id = rc."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    WHERE ${whereClause}
  `;

  /*
   * Overall summary.
   */
  const summaryQuery = `
    SELECT
      COUNT(*)::int AS "totalReportCards",

      COUNT(*) FILTER (
        WHERE stats."subjectCount" > 0
      )::int AS "studentsWithResults",

      COALESCE(
        ROUND(AVG(stats."overallPercentage"), 2),
        0
      ) AS "averagePercentage",

      COALESCE(
        ROUND(MAX(stats."overallPercentage"), 2),
        0
      ) AS "highestPercentage",

      COALESCE(
        ROUND(MIN(stats."overallPercentage"), 2),
        0
      ) AS "lowestPercentage"

    FROM (
      SELECT
        rc.id,

        COUNT(rcs.id)::int AS "subjectCount",

        CASE
          WHEN COALESCE(SUM(rcs."maxMarks"), 0) > 0
          THEN (
            COALESCE(SUM(rcs.marks), 0)
            / SUM(rcs."maxMarks")
          ) * 100
          ELSE 0
        END AS "overallPercentage"

      FROM "ReportCard" rc

      INNER JOIN "StudentEnrollment" se
        ON se.id = rc."studentEnrollmentId"

      INNER JOIN "Student" s
        ON s.id = se."studentId"

      LEFT JOIN "ReportCardSubject" rcs
        ON rcs."reportCardId" = rc.id

      WHERE ${whereClause}

      GROUP BY rc.id
    ) stats
  `;

  /*
   * Grade distribution.
   *
   * We use the final overall percentage and the grading scale
   * attached to the report card.
   */
  const gradeDistributionQuery = `
    SELECT
      g.name AS "gradeName",
      COUNT(*)::int AS "studentCount"

    FROM "ReportCard" rc

    INNER JOIN "StudentEnrollment" se
      ON se.id = rc."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "GradingScale" gs
      ON gs.id = rc."gradingScaleId"

    INNER JOIN "Grade" g
      ON g."gradingScaleId" = gs.id

    LEFT JOIN "ReportCardSubject" rcs
      ON rcs."reportCardId" = rc.id

    WHERE ${whereClause}

    GROUP BY
      rc.id,
      g.id

    HAVING
      CASE
        WHEN COALESCE(SUM(rcs."maxMarks"), 0) > 0
        THEN (
          COALESCE(SUM(rcs.marks), 0)
          / SUM(rcs."maxMarks")
        ) * 100
        ELSE 0
      END >= g."minPercentage"

      AND

      CASE
        WHEN COALESCE(SUM(rcs."maxMarks"), 0) > 0
        THEN (
          COALESCE(SUM(rcs.marks), 0)
          / SUM(rcs."maxMarks")
        ) * 100
        ELSE 0
      END <= g."maxPercentage"

    ORDER BY g."minPercentage" DESC
  `;

  const [
    performanceResult,
    countResult,
    summaryResult,
    gradeDistributionResult,
  ] = await Promise.all([
    pool.query(performanceQuery, performanceValues),
    pool.query(countQuery, values),
    pool.query(summaryQuery, values),
    pool.query(gradeDistributionQuery, values),
  ]);

  const total = Number(countResult.rows[0]?.total ?? 0);

  /*
   * Get subjects for the report cards returned on the current page.
   */
  const reportCardIds = performanceResult.rows.map((row) => row.reportCardId);

  let subjectsByReportCard = {};

  if (reportCardIds.length > 0) {
    const subjectQuery = `
        SELECT
            rcs.id,
            rcs."reportCardId",
            rcs."examResultId",
            rcs."subjectName",
            rcs.marks,
            rcs."maxMarks",
            rcs.percentage,
            rcs."gradeName",
            rcs."gradeRemarks",
            rcs.remarks

        FROM "ReportCardSubject" rcs

        WHERE rcs."reportCardId" = ANY($1::text[])

        ORDER BY
            rcs."subjectName" ASC
    `;

    const subjectResult = await pool.query(subjectQuery, [reportCardIds]);

    subjectsByReportCard = subjectResult.rows.reduce((grouped, subject) => {
      if (!grouped[subject.reportCardId]) {
        grouped[subject.reportCardId] = [];
      }

      grouped[subject.reportCardId].push(subject);

      return grouped;
    }, {});
  }

  const performance = performanceResult.rows.map((row) => ({
    reportCardId: row.reportCardId,
    studentEnrollmentId: row.studentEnrollmentId,
    academicYearId: row.academicYearId,
    termId: row.termId,

    student: {
      id: row.studentId,
      admissionNumber: row.admissionNumber,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
    },

    academicYear: {
      id: row.academicYearId,
      name: row.academicYearName,
    },

    term: {
      id: row.termId,
      name: row.termName,
    },

    class: {
      id: row.classId,
      name: row.className,
    },

    stream: row.streamId
      ? {
          id: row.streamId,
          name: row.streamName,
        }
      : null,

    subjectCount: Number(row.subjectCount),
    totalMarks: Number(row.totalMarks),
    totalMaxMarks: Number(row.totalMaxMarks),
    overallPercentage: round(row.overallPercentage),

    subjects: subjectsByReportCard[row.reportCardId] ?? [],
  }));

  return {
    filters: {
      academicYearId: academicYearId ?? null,
      termId: termId ?? null,
      classId: classId ?? null,
      streamId: streamId ?? null,
      studentId: studentId ?? null,
    },

    summary: {
      totalReportCards: Number(summaryResult.rows[0]?.totalReportCards ?? 0),
      studentsWithResults: Number(
        summaryResult.rows[0]?.studentsWithResults ?? 0,
      ),
      averagePercentage: round(summaryResult.rows[0]?.averagePercentage ?? 0),
      highestPercentage: round(summaryResult.rows[0]?.highestPercentage ?? 0),
      lowestPercentage: round(summaryResult.rows[0]?.lowestPercentage ?? 0),
    },

    gradeDistribution: gradeDistributionResult.rows.map((row) => ({
      gradeName: row.gradeName,
      studentCount: Number(row.studentCount),
    })),

    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },

    performance,
  };
}
