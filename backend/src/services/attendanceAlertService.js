import pool from "../config/prisma.js";

function validateDate(date, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error(`${fieldName} must use YYYY-MM-DD format.`);
    error.code = "INVALID_DATE";
    throw error;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    const error = new Error(`Invalid ${fieldName}.`);
    error.code = "INVALID_DATE";
    throw error;
  }
}

export async function getLowAttendanceAlerts({
  schoolId,
  dateFrom,
  dateTo,
  threshold = 75,
  academicYearId = null,
  classId = null,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const minimumPercentage = Number(threshold);

  if (
    !Number.isFinite(minimumPercentage) ||
    minimumPercentage < 0 ||
    minimumPercentage > 100
  ) {
    const error = new Error("threshold must be a number between 0 and 100.");
    error.code = "INVALID_THRESHOLD";
    throw error;
  }

  validateDate(dateFrom, "dateFrom");
  validateDate(dateTo, "dateTo");

  if (dateFrom > dateTo) {
    const error = new Error("dateFrom cannot be later than dateTo.");
    error.code = "INVALID_DATE_RANGE";
    throw error;
  }

  const values = [schoolId, dateFrom, dateTo, minimumPercentage];
  const conditions = [
    's."schoolId" = $1',
    "a.date >= $2::date",
    "a.date < ($3::date + INTERVAL '1 day')",
    "a.status IN ('PRESENT', 'ABSENT', 'LATE')",
  ];

  if (academicYearId) {
    values.push(academicYearId);
    conditions.push(`a."academicYearId" = $${values.length}`);
  }

  if (classId) {
    values.push(classId);
    conditions.push(`a."classId" = $${values.length}`);
  }

  const result = await pool.query(
    `
    SELECT
      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",
      c.id AS "classId",
      c.name AS "className",
      a."academicYearId",

      COUNT(*)::int AS "recordedDays",

      COUNT(*) FILTER (
        WHERE a.status IN ('PRESENT', 'LATE')
      )::int AS "attendedDays",

      COUNT(*) FILTER (
        WHERE a.status = 'ABSENT'
      )::int AS "absentDays",

      ROUND(
        (
          COUNT(*) FILTER (
            WHERE a.status IN ('PRESENT', 'LATE')
          )::numeric
          / NULLIF(COUNT(*), 0)
        ) * 100,
        2
      ) AS "attendancePercentage"

    FROM "Attendance" a

    INNER JOIN "Student" s
      ON s.id = a."studentId"

    INNER JOIN "Class" c
      ON c.id = a."classId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = a."academicYearId"
     AND ay."schoolId" = s."schoolId"

    WHERE ${conditions.join("\n      AND ")}

    GROUP BY
      s.id,
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",
      c.id,
      c.name,
      a."academicYearId"

    HAVING
      (
        COUNT(*) FILTER (
          WHERE a.status IN ('PRESENT', 'LATE')
        )::numeric
        / NULLIF(COUNT(*), 0)
      ) * 100 < $4

    ORDER BY
      "attendancePercentage" ASC,
      s."lastName" ASC,
      s."firstName" ASC
    `,
    values,
  );

  return {
    filters: {
      dateFrom,
      dateTo,
      threshold: minimumPercentage,
      academicYearId,
      classId,
    },
    summary: {
      alertCount: result.rows.length,
    },
    alerts: result.rows.map((row) => ({
      ...row,
      recordedDays: Number(row.recordedDays),
      attendedDays: Number(row.attendedDays),
      absentDays: Number(row.absentDays),
      attendancePercentage: Number(row.attendancePercentage),
    })),
  };
}
