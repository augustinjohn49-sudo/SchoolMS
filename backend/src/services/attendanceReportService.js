import pool from "../config/prisma.js";

const VALID_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

function validateDate(date, fieldName) {
  if (!date) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error(`${fieldName} must use YYYY-MM-DD format.`);
    error.code = "INVALID_DATE";
    throw error;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error(`Invalid ${fieldName}.`);
    error.code = "INVALID_DATE";
    throw error;
  }
}

function validateDateRange(dateFrom, dateTo) {
  validateDate(dateFrom, "dateFrom");
  validateDate(dateTo, "dateTo");

  if (dateFrom && dateTo && dateFrom > dateTo) {
    const error = new Error("dateFrom cannot be later than dateTo.");
    error.code = "INVALID_DATE_RANGE";
    throw error;
  }
}

function validateStatus(status) {
  if (status && !VALID_STATUSES.includes(status)) {
    const error = new Error(
      "status must be PRESENT, ABSENT, LATE, or EXCUSED.",
    );
    error.code = "INVALID_STATUS";
    throw error;
  }
}

function validatePagination(page, limit) {
  const parsedPage = Number(page ?? 1);
  const parsedLimit = Number(limit ?? 20);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    const error = new Error("page must be a positive integer.");
    error.code = "INVALID_PAGE";
    throw error;
  }

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    const error = new Error("limit must be an integer between 1 and 100.");
    error.code = "INVALID_LIMIT";
    throw error;
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit,
  };
}

export async function getAttendanceReport({
  schoolId,
  academicYearId = null,
  termId = null,
  classId = null,
  streamId = null,
  studentId = null,
  status = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 20,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  validateStatus(status);
  validateDateRange(dateFrom, dateTo);

  const pagination = validatePagination(page, limit);

  const values = [schoolId];
  const conditions = [`st."schoolId" = $1`, `ay."schoolId" = $1`];

  function addCondition(condition, value) {
    values.push(value);
    conditions.push(condition.replace("$VALUE", `$${values.length}`));
  }

  /*
   * Academic year filter
   */
  if (academicYearId) {
    addCondition(`a."academicYearId" = $VALUE`, academicYearId);
  }

  /*
   * Term filter
   */
  if (termId) {
    addCondition(`a."termId" = $VALUE`, termId);
  }

  /*
   * Class filter
   */
  if (classId) {
    addCondition(`a."classId" = $VALUE`, classId);
  }

  /*
   * Student filter
   */
  if (studentId) {
    addCondition(`a."studentId" = $VALUE`, studentId);
  }

  /*
   * Attendance status filter
   */
  if (status) {
    addCondition(`a.status = $VALUE`, status);
  }

  /*
   * Date range
   */
  if (dateFrom) {
    addCondition(`a.date >= $VALUE::date`, dateFrom);
  }

  if (dateTo) {
    addCondition(`a.date < ($VALUE::date + INTERVAL '1 day')`, dateTo);
  }

  /*
   * Stream is not stored directly on Attendance.
   *
   * Attendance stores classId, while stream information
   * belongs to StudentEnrollment. Therefore we filter the
   * student's enrollment for the same academic year/class.
   */
  if (streamId) {
    addCondition(
      `
      EXISTS (
        SELECT 1
        FROM "StudentEnrollment" se_filter
        WHERE se_filter."studentId" = a."studentId"
          AND se_filter."academicYearId" = a."academicYearId"
          AND se_filter."classId" = a."classId"
          AND se_filter."streamId" = $VALUE
      )
      `,
      streamId,
    );
  }

  const whereClause = conditions.join("\n      AND ");

  /*
   * Main attendance records.
   *
   * The stream is resolved through StudentEnrollment rather
   * than assuming Attendance has a streamId column.
   */
  const recordsValues = [...values];

  recordsValues.push(pagination.limit);
  const limitParameter = `$${recordsValues.length}`;

  recordsValues.push(pagination.offset);
  const offsetParameter = `$${recordsValues.length}`;

  const recordsResult = await pool.query(
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
      a."createdAt",
      a."updatedAt",

      st."admissionNumber",
      st."firstName",
      st."middleName",
      st."lastName",

      ay.name AS "academicYearName",

      c.name AS "className",

      t.name AS "termName",

      (
        SELECT se."streamId"
        FROM "StudentEnrollment" se
        WHERE se."studentId" = a."studentId"
          AND se."academicYearId" = a."academicYearId"
          AND se."classId" = a."classId"
        ORDER BY se."createdAt" DESC
        LIMIT 1
      ) AS "streamId",

      (
        SELECT s.name
        FROM "StudentEnrollment" se
        INNER JOIN "Stream" s
          ON s.id = se."streamId"
        WHERE se."studentId" = a."studentId"
          AND se."academicYearId" = a."academicYearId"
          AND se."classId" = a."classId"
        ORDER BY se."createdAt" DESC
        LIMIT 1
      ) AS "streamName"

    FROM "Attendance" a

    INNER JOIN "Student" st
      ON st.id = a."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = a."academicYearId"

    INNER JOIN "Class" c
      ON c.id = a."classId"

    LEFT JOIN "Term" t
      ON t.id = a."termId"

    WHERE ${whereClause}

    ORDER BY
      a.date DESC,
      st."firstName" ASC,
      st."lastName" ASC

    LIMIT ${limitParameter}
    OFFSET ${offsetParameter}
    `,
    recordsValues,
  );

  /*
   * Total number of matching attendance records.
   */
  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM "Attendance" a

    INNER JOIN "Student" st
      ON st.id = a."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = a."academicYearId"

    WHERE ${whereClause}
    `,
    values,
  );

  /*
   * Overall attendance summary.
   *
   * This is calculated independently of pagination so that
   * the summary represents the entire filtered report.
   */
  const summaryResult = await pool.query(
    `
    SELECT
      COUNT(*)::int AS "totalRecords",

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
      )::int AS excused,

      ROUND(
      (
        (
          COUNT(*) FILTER (
            WHERE a.status IN ('PRESENT', 'LATE')
          )::numeric
        )
        /
        NULLIF(
          COUNT(*) FILTER (
            WHERE a.status IN ('PRESENT', 'ABSENT', 'LATE')
          ),
          0
        )
      ) * 100,
      2
    ) AS "attendancePercentage"

    FROM "Attendance" a

    INNER JOIN "Student" st
      ON st.id = a."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = a."academicYearId"

    WHERE ${whereClause}
    `,
    values,
  );

  const total = countResult.rows[0].total;
  const summary = summaryResult.rows[0];

  return {
    filters: {
      academicYearId,
      termId,
      classId,
      streamId,
      studentId,
      status,
      dateFrom,
      dateTo,
    },

    summary: {
      totalRecords: summary.totalRecords,
      present: summary.present,
      absent: summary.absent,
      late: summary.late,
      excused: summary.excused,
      attendancePercentage:
        summary.attendancePercentage === null
          ? 0
          : Number(summary.attendancePercentage),
    },

    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit),
    },

    attendance: recordsResult.rows,
  };
}
