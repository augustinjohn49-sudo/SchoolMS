import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

// Create a new term, ensuring that the academic year belongs to the authenticated user's school
export async function createTerm({
  schoolId,
  academicYearId,
  name,
  startDate,
  endDate,
}) {
  // Find the academic year and verify that it belongs
  // to the authenticated user's school.
  const academicYearResult = await pool.query(
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
    LIMIT 1
    `,
    [academicYearId],
  );

  const academicYear = academicYearResult.rows[0];

  if (!academicYear) {
    const error = new Error("Academic year not found.");
    error.code = "ACADEMIC_YEAR_NOT_FOUND";
    throw error;
  }

  if (academicYear.schoolId !== schoolId) {
    const error = new Error("You do not have access to this academic year.");
    error.code = "ACADEMIC_YEAR_ACCESS_DENIED";
    throw error;
  }

  // Ensure the term name is unique within this academic year.
  const existingTerm = await pool.query(
    `
    SELECT id
    FROM "Term"
    WHERE "academicYearId" = $1
      AND name = $2
    LIMIT 1
    `,
    [academicYearId, name],
  );

  if (existingTerm.rows.length > 0) {
    const error = new Error(
      "A term with this name already exists for this academic year.",
    );

    error.code = "TERM_EXISTS";

    throw error;
  }

  const termStart = new Date(startDate);
  const termEnd = new Date(endDate);
  const yearStart = new Date(academicYear.startDate);
  const yearEnd = new Date(academicYear.endDate);

  // Validate the term date range.
  if (termStart >= termEnd) {
    const error = new Error("Term start date must be before the end date.");

    error.code = "INVALID_DATE_RANGE";

    throw error;
  }

  // Ensure the term falls completely within the academic year.
  if (termStart < yearStart || termEnd > yearEnd) {
    const error = new Error(
      "Term dates must fall within the academic year dates.",
    );

    error.code = "TERM_OUTSIDE_ACADEMIC_YEAR";

    throw error;
  }

  const termId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "Term"
    (
      id,
      "academicYearId",
      name,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      "academicYearId",
      name,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    `,
    [termId, academicYearId, name, termStart, termEnd, "INACTIVE", now, now],
  );

  return result.rows[0];
}

// Get all terms for a specific academic year, ensuring that the academic year belongs to the authenticated user's school
export async function getTermsByAcademicYear({ schoolId, academicYearId }) {
  const academicYearResult = await pool.query(
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
    LIMIT 1
    `,
    [academicYearId],
  );

  const academicYear = academicYearResult.rows[0];

  if (!academicYear) {
    const error = new Error("Academic year not found.");
    error.code = "ACADEMIC_YEAR_NOT_FOUND";
    throw error;
  }

  if (academicYear.schoolId !== schoolId) {
    const error = new Error("You do not have access to this academic year.");

    error.code = "ACADEMIC_YEAR_ACCESS_DENIED";

    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      id,
      "academicYearId",
      name,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    FROM "Term"
    WHERE "academicYearId" = $1
    ORDER BY "startDate" ASC
    `,
    [academicYearId],
  );

  return result.rows;
}

// Get a term by its ID, ensuring that the term belongs to the authenticated user's school
export async function getTermById({ schoolId, termId }) {
  const result = await pool.query(
    `
    SELECT
      t.id,
      t."academicYearId",
      t.name,
      t."startDate",
      t."endDate",
      t.status,
      t."createdAt",
      t."updatedAt"
    FROM "Term" t
    INNER JOIN "AcademicYear" ay
      ON t."academicYearId" = ay.id
    WHERE t.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [termId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Term not found.");
    error.code = "TERM_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

// Update an existing term, ensuring that the term belongs to the authenticated user's school
export async function updateTerm({
  schoolId,
  termId,
  name,
  startDate,
  endDate,
  status,
}) {
  const existingResult = await pool.query(
    `
    SELECT
      t.id,
      t."academicYearId",
      t.name,
      t."startDate",
      t."endDate",
      t.status,
      ay."schoolId",
      ay."startDate" AS "academicYearStartDate",
      ay."endDate" AS "academicYearEndDate"
    FROM "Term" t
    INNER JOIN "AcademicYear" ay
      ON t."academicYearId" = ay.id
    WHERE t.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [termId, schoolId],
  );

  const existingTerm = existingResult.rows[0];

  if (!existingTerm) {
    const error = new Error("Term not found.");
    error.code = "TERM_NOT_FOUND";
    throw error;
  }

  const updatedName = name ?? existingTerm.name;
  const updatedStartDate = startDate
    ? new Date(startDate)
    : new Date(existingTerm.startDate);
  const updatedEndDate = endDate
    ? new Date(endDate)
    : new Date(existingTerm.endDate);
  const updatedStatus = status ?? existingTerm.status;

  if (updatedStartDate >= updatedEndDate) {
    const error = new Error("Term start date must be before the end date.");

    error.code = "INVALID_DATE_RANGE";
    throw error;
  }

  const academicYearStart = new Date(existingTerm.academicYearStartDate);

  const academicYearEnd = new Date(existingTerm.academicYearEndDate);

  if (
    updatedStartDate < academicYearStart ||
    updatedEndDate > academicYearEnd
  ) {
    const error = new Error(
      "Term dates must fall within the academic year dates.",
    );

    error.code = "TERM_OUTSIDE_ACADEMIC_YEAR";
    throw error;
  }

  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM "Term"
    WHERE "academicYearId" = $1
      AND name = $2
      AND id <> $3
    LIMIT 1
    `,
    [existingTerm.academicYearId, updatedName, termId],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "A term with this name already exists for this academic year.",
    );

    error.code = "TERM_EXISTS";
    throw error;
  }

  const now = new Date();

  const result = await pool.query(
    `
    UPDATE "Term"
    SET
      name = $1,
      "startDate" = $2,
      "endDate" = $3,
      status = $4,
      "updatedAt" = $5
    WHERE id = $6
    RETURNING
      id,
      "academicYearId",
      name,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    `,
    [updatedName, updatedStartDate, updatedEndDate, updatedStatus, now, termId],
  );

  return result.rows[0];
}

export async function deleteTerm({ schoolId, termId }) {
  const existingResult = await pool.query(
    `
    SELECT
      t.id
    FROM "Term" t
    INNER JOIN "AcademicYear" ay
      ON t."academicYearId" = ay.id
    WHERE t.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [termId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Term not found.");
    error.code = "TERM_NOT_FOUND";
    throw error;
  }

  await pool.query(
    `
    DELETE FROM "Term"
    WHERE id = $1
    `,
    [termId],
  );
}
