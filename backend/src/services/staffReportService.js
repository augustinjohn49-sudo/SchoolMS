import pool from "../config/prisma.js";

const VALID_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "TERMINATED",
  "RESIGNED",
];

const VALID_POSITIONS = [
  "TEACHER",
  "HEAD_TEACHER",
  "DEPUTY_HEAD_TEACHER",
  "SENIOR_TEACHER",
  "BURSAR",
  "SECRETARY",
  "COUNSELOR",
  "LIBRARIAN",
  "ICT_OFFICER",
  "NURSE",
  "SECURITY",
  "SUPPORT_STAFF",
  "OTHER",
];

const VALID_EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "VOLUNTEER",
];

const VALID_GENDERS = ["MALE", "FEMALE", "OTHER"];

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

function validateFilter(value, validValues, fieldName) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (!validValues.includes(value)) {
    const error = new Error(
      `Invalid ${fieldName}. Allowed values: ${validValues.join(", ")}.`,
    );
    error.code = `INVALID_${fieldName.toUpperCase()}`;
    throw error;
  }
}

export async function getStaffReport({
  schoolId,
  status,
  position,
  employmentType,
  gender,
  page,
  limit,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  validateFilter(status, VALID_STATUSES, "status");
  validateFilter(position, VALID_POSITIONS, "position");
  validateFilter(employmentType, VALID_EMPLOYMENT_TYPES, "employmentType");
  validateFilter(gender, VALID_GENDERS, "gender");

  const pagination = parsePagination(page, limit);

  const conditions = ['s."schoolId" = $1'];
  const params = [schoolId];

  let parameterIndex = 2;

  if (status) {
    conditions.push(`s.status = $${parameterIndex}`);
    params.push(status);
    parameterIndex += 1;
  }

  if (position) {
    conditions.push(`s.position = $${parameterIndex}`);
    params.push(position);
    parameterIndex += 1;
  }

  if (employmentType) {
    conditions.push(`s."employmentType" = $${parameterIndex}`);
    params.push(employmentType);
    parameterIndex += 1;
  }

  if (gender) {
    conditions.push(`s.gender = $${parameterIndex}`);
    params.push(gender);
    parameterIndex += 1;
  }

  const whereClause = conditions.join(" AND ");

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM "Staff" s
    WHERE ${whereClause}
  `;

  const staffQuery = `
    SELECT
      s.id,
      s."staffNumber",
      s."firstName",
      s."middleName",
      s."lastName",
      s.gender,
      s."dateOfBirth",
      s.phone,
      s.email,
      s.address,
      s.position,
      s."employmentType",
      s.status,
      s."dateJoined",
      s."createdAt",
      s."updatedAt"
    FROM "Staff" s
    WHERE ${whereClause}
    ORDER BY s."lastName" ASC, s."firstName" ASC
    LIMIT $${parameterIndex}
    OFFSET $${parameterIndex + 1}
  `;

  const staffParams = [...params, pagination.limit, pagination.offset];

  const summaryQuery = `
    SELECT
      COUNT(*)::int AS "totalStaff",

      COUNT(*) FILTER (
        WHERE s.status = 'ACTIVE'
      )::int AS "activeStaff",

      COUNT(*) FILTER (
        WHERE s.status = 'INACTIVE'
      )::int AS "inactiveStaff",

      COUNT(*) FILTER (
        WHERE s.status = 'SUSPENDED'
      )::int AS "suspendedStaff",

      COUNT(*) FILTER (
        WHERE s.status = 'TERMINATED'
      )::int AS "terminatedStaff",

      COUNT(*) FILTER (
        WHERE s.status = 'RESIGNED'
      )::int AS "resignedStaff",

      COUNT(*) FILTER (
        WHERE s.gender = 'MALE'
      )::int AS "maleStaff",

      COUNT(*) FILTER (
        WHERE s.gender = 'FEMALE'
      )::int AS "femaleStaff",

      COUNT(*) FILTER (
        WHERE s.gender = 'OTHER'
      )::int AS "otherGenderStaff"
    FROM "Staff" s
    WHERE ${whereClause}
  `;

  const positionDistributionQuery = `
    SELECT
      s.position,
      COUNT(*)::int AS "staffCount"
    FROM "Staff" s
    WHERE ${whereClause}
    GROUP BY s.position
    ORDER BY "staffCount" DESC, s.position ASC
  `;

  const employmentTypeDistributionQuery = `
    SELECT
      s."employmentType",
      COUNT(*)::int AS "staffCount"
    FROM "Staff" s
    WHERE ${whereClause}
    GROUP BY s."employmentType"
    ORDER BY "staffCount" DESC, s."employmentType" ASC
  `;

  const genderDistributionQuery = `
    SELECT
      s.gender,
      COUNT(*)::int AS "staffCount"
    FROM "Staff" s
    WHERE ${whereClause}
    GROUP BY s.gender
    ORDER BY "staffCount" DESC, s.gender ASC
  `;

  const [
    countResult,
    staffResult,
    summaryResult,
    positionDistributionResult,
    employmentTypeDistributionResult,
    genderDistributionResult,
  ] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(staffQuery, staffParams),
    pool.query(summaryQuery, params),
    pool.query(positionDistributionQuery, params),
    pool.query(employmentTypeDistributionQuery, params),
    pool.query(genderDistributionQuery, params),
  ]);

  const total = countResult.rows[0].total;
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    filters: {
      status: status || null,
      position: position || null,
      employmentType: employmentType || null,
      gender: gender || null,
    },

    summary: summaryResult.rows[0],

    positionDistribution: positionDistributionResult.rows,

    employmentTypeDistribution: employmentTypeDistributionResult.rows,

    genderDistribution: genderDistributionResult.rows,

    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
    },

    staff: staffResult.rows,
  };
}
