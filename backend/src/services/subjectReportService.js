import pool from "../config/prisma.js";

const VALID_STATUSES = ["ACTIVE", "INACTIVE"];

function parsePagination(page, limit) {
  const parsedPage = page === undefined ? 1 : Number(page);
  const parsedLimit = limit === undefined ? 20 : Number(limit);

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

function validateStatus(status) {
  if (status === undefined || status === null || status === "") {
    return;
  }

  if (!VALID_STATUSES.includes(status)) {
    const error = new Error(
      `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}.`,
    );
    error.code = "INVALID_STATUS";
    throw error;
  }
}

export async function getSubjectReport({ schoolId, status, page, limit }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  validateStatus(status);

  const pagination = parsePagination(page, limit);

  const conditions = ['s."schoolId" = $1'];
  const params = [schoolId];

  let parameterIndex = 2;

  if (status) {
    conditions.push(`s.status = $${parameterIndex}`);
    params.push(status);
    parameterIndex += 1;
  }

  const whereClause = conditions.join(" AND ");

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM "Subject" s
    WHERE ${whereClause}
  `;

  const subjectQuery = `
    SELECT
      s.id,
      s.name,
      s.code,
      s.description,
      s.status,
      s."createdAt",
      s."updatedAt"
    FROM "Subject" s
    WHERE ${whereClause}
    ORDER BY s.name ASC
    LIMIT $${parameterIndex}
    OFFSET $${parameterIndex + 1}
  `;

  const subjectParams = [...params, pagination.limit, pagination.offset];

  const summaryQuery = `
    SELECT
      COUNT(*)::int AS "totalSubjects",

      COUNT(*) FILTER (
        WHERE s.status = 'ACTIVE'
      )::int AS "activeSubjects",

      COUNT(*) FILTER (
        WHERE s.status = 'INACTIVE'
      )::int AS "inactiveSubjects"
    FROM "Subject" s
    WHERE ${whereClause}
  `;

  const statusDistributionQuery = `
    SELECT
      s.status,
      COUNT(*)::int AS "subjectCount"
    FROM "Subject" s
    WHERE ${whereClause}
    GROUP BY s.status
    ORDER BY "subjectCount" DESC, s.status ASC
  `;

  const classSubjectQuery = `
    SELECT
      cs.id AS "classSubjectId",
      cs."subjectId",
      c.id AS "classId",
      c.name AS "className",
      ay.id AS "academicYearId",
      ay.name AS "academicYearName"
    FROM "ClassSubject" cs
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    INNER JOIN "Class" c
      ON c.id = cs."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE ${whereClause}
    ORDER BY s.name ASC, ay.name ASC, c.name ASC
  `;

  const teacherAssignmentQuery = `
    SELECT
      tcs.id AS "teacherAssignmentId",
      tcs."classSubjectId",
      tcs."staffId",
      st."staffNumber",
      st."firstName",
      st."middleName",
      st."lastName",
      st.position
    FROM "TeacherClassSubject" tcs
    INNER JOIN "Staff" st
      ON st.id = tcs."staffId"
    INNER JOIN "ClassSubject" cs
      ON cs.id = tcs."classSubjectId"
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    WHERE ${whereClause}
    ORDER BY st."lastName" ASC, st."firstName" ASC
  `;

  const [
    countResult,
    subjectResult,
    summaryResult,
    statusDistributionResult,
    classSubjectResult,
    teacherAssignmentResult,
  ] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(subjectQuery, subjectParams),
    pool.query(summaryQuery, params),
    pool.query(statusDistributionQuery, params),
    pool.query(classSubjectQuery, params),
    pool.query(teacherAssignmentQuery, params),
  ]);

  const total = countResult.rows[0].total;
  const totalPages = Math.ceil(total / pagination.limit);

  const classSubjectsBySubject = new Map();

  for (const row of classSubjectResult.rows) {
    if (!classSubjectsBySubject.has(row.subjectId)) {
      classSubjectsBySubject.set(row.subjectId, []);
    }

    classSubjectsBySubject.get(row.subjectId).push({
      classSubjectId: row.classSubjectId,
      classId: row.classId,
      className: row.className,
      academicYearId: row.academicYearId,
      academicYearName: row.academicYearName,
    });
  }

  const teacherAssignmentsByClassSubject = new Map();

  for (const row of teacherAssignmentResult.rows) {
    if (!teacherAssignmentsByClassSubject.has(row.classSubjectId)) {
      teacherAssignmentsByClassSubject.set(row.classSubjectId, []);
    }

    teacherAssignmentsByClassSubject.get(row.classSubjectId).push({
      teacherAssignmentId: row.teacherAssignmentId,
      staffId: row.staffId,
      staffNumber: row.staffNumber,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      position: row.position,
    });
  }

  const subjects = subjectResult.rows.map((subject) => {
    const classSubjects = classSubjectsBySubject.get(subject.id) || [];

    const classes = classSubjects.map((classSubject) => ({
      ...classSubject,
      teachers:
        teacherAssignmentsByClassSubject.get(classSubject.classSubjectId) || [],
    }));

    const teachers = classes.flatMap((classSubject) =>
      classSubject.teachers.map((teacher) => ({
        ...teacher,
        classSubjectId: classSubject.classSubjectId,
        classId: classSubject.classId,
        className: classSubject.className,
        academicYearId: classSubject.academicYearId,
        academicYearName: classSubject.academicYearName,
      })),
    );

    return {
      ...subject,
      classes,
      teachers,
      classCount: classes.length,
      teacherCount: teachers.length,
    };
  });

  return {
    filters: {
      status: status || null,
    },

    summary: summaryResult.rows[0],

    statusDistribution: statusDistributionResult.rows,

    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
    },

    subjects,
  };
}
