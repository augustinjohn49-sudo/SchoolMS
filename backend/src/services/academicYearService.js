import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

export async function createAcademicYear({
  schoolId,
  name,
  startDate,
  endDate,
}) {
  // Prevent duplicate academic years for the same school.
  const existingAcademicYear = await pool.query(
    `
    SELECT id
    FROM "AcademicYear"
    WHERE "schoolId" = $1
      AND name = $2
    LIMIT 1
    `,
    [schoolId, name],
  );

  if (existingAcademicYear.rows.length > 0) {
    const error = new Error(
      "An academic year with this name already exists for this school.",
    );

    error.code = "ACADEMIC_YEAR_EXISTS";

    throw error;
  }

  // Ensure the date range is valid.
  if (new Date(startDate) >= new Date(endDate)) {
    const error = new Error(
      "Academic year start date must be before the end date.",
    );

    error.code = "INVALID_DATE_RANGE";

    throw error;
  }

  const academicYearId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "AcademicYear"
    (
      id,
      "schoolId",
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
      "schoolId",
      name,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    `,
    [
      academicYearId,
      schoolId,
      name,
      new Date(startDate),
      new Date(endDate),
      "INACTIVE",
      now,
      now,
    ],
  );

  return result.rows[0];
}

export async function getAcademicYearsBySchool({ schoolId }) {
  const result = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    FROM "AcademicYear"
    WHERE "schoolId" = $1
    ORDER BY "startDate" DESC
    `,
    [schoolId],
  );

  return result.rows;
}

export async function getAcademicYearById({ schoolId, academicYearId }) {
  const result = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    FROM "AcademicYear"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [academicYearId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Academic year not found.");
    error.code = "ACADEMIC_YEAR_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function updateAcademicYear({
  schoolId,
  academicYearId,
  name,
  startDate,
  endDate,
  status,
}) {
  const existingResult = await pool.query(
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

  const existingAcademicYear = existingResult.rows[0];

  if (!existingAcademicYear) {
    const error = new Error("Academic year not found.");
    error.code = "ACADEMIC_YEAR_NOT_FOUND";
    throw error;
  }

  const updatedName = name ?? existingAcademicYear.name;

  const updatedStartDate = startDate
    ? new Date(startDate)
    : new Date(existingAcademicYear.startDate);

  const updatedEndDate = endDate
    ? new Date(endDate)
    : new Date(existingAcademicYear.endDate);

  const updatedStatus = status ?? existingAcademicYear.status;

  if (updatedStartDate >= updatedEndDate) {
    const error = new Error(
      "Academic year start date must be before the end date.",
    );

    error.code = "INVALID_DATE_RANGE";
    throw error;
  }

  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM "AcademicYear"
    WHERE "schoolId" = $1
      AND name = $2
      AND id <> $3
    LIMIT 1
    `,
    [schoolId, updatedName, academicYearId],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "An academic year with this name already exists for this school.",
    );

    error.code = "ACADEMIC_YEAR_EXISTS";
    throw error;
  }

  const now = new Date();

  const result = await pool.query(
    `
    UPDATE "AcademicYear"
    SET
      name = $1,
      "startDate" = $2,
      "endDate" = $3,
      status = $4,
      "updatedAt" = $5
    WHERE id = $6
      AND "schoolId" = $7
    RETURNING
      id,
      "schoolId",
      name,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    `,
    [
      updatedName,
      updatedStartDate,
      updatedEndDate,
      updatedStatus,
      now,
      academicYearId,
      schoolId,
    ],
  );

  return result.rows[0];
}
