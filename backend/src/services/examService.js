import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

const VALID_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function normalizeDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error("Dates must use YYYY-MM-DD format.");

    error.code = "INVALID_DATE";
    throw error;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error("Invalid date.");
    error.code = "INVALID_DATE";
    throw error;
  }

  return parsedDate;
}

function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    const error = new Error(
      "status must be DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, or CANCELLED.",
    );

    error.code = "INVALID_STATUS";
    throw error;
  }
}

export async function createExam({
  schoolId,
  academicYearId,
  termId,
  name,
  description = null,
  startDate,
  endDate,
  status = "DRAFT",
}) {
  if (!name || !name.trim()) {
    const error = new Error("Exam name is required.");
    error.code = "NAME_REQUIRED";
    throw error;
  }

  validateStatus(status);

  const examStartDate = normalizeDate(startDate);
  const examEndDate = normalizeDate(endDate);

  if (examStartDate > examEndDate) {
    const error = new Error("startDate cannot be later than endDate.");

    error.code = "INVALID_DATE_RANGE";
    throw error;
  }

  const schoolResult = await pool.query(
    `
    SELECT id
    FROM "School"
    WHERE id = $1
    LIMIT 1
    `,
    [schoolId],
  );

  if (schoolResult.rows.length === 0) {
    const error = new Error("School not found.");
    error.code = "SCHOOL_NOT_FOUND";
    throw error;
  }

  const academicYearResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name
    FROM "AcademicYear"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [academicYearId, schoolId],
  );

  if (academicYearResult.rows.length === 0) {
    const error = new Error("Academic year not found for this school.");

    error.code = "ACADEMIC_YEAR_NOT_FOUND";
    throw error;
  }

  const termResult = await pool.query(
    `
    SELECT
      t.id,
      t."academicYearId",
      t.name
    FROM "Term" t
    INNER JOIN "AcademicYear" ay
      ON ay.id = t."academicYearId"
    WHERE t.id = $1
      AND t."academicYearId" = $2
      AND ay."schoolId" = $3
    LIMIT 1
    `,
    [termId, academicYearId, schoolId],
  );

  if (termResult.rows.length === 0) {
    const error = new Error("Term not found for this academic year.");

    error.code = "TERM_NOT_FOUND";
    throw error;
  }

  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM "Exam"
    WHERE "schoolId" = $1
      AND "academicYearId" = $2
      AND name = $3
    LIMIT 1
    `,
    [schoolId, academicYearId, name.trim()],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "An exam with this name already exists for this academic year.",
    );

    error.code = "EXAM_EXISTS";
    throw error;
  }

  const id = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "Exam"
    (
      id,
      "schoolId",
      "academicYearId",
      "termId",
      name,
      description,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id,
      "schoolId",
      "academicYearId",
      "termId",
      name,
      description,
      "startDate",
      "endDate",
      status,
      "createdAt",
      "updatedAt"
    `,
    [
      id,
      schoolId,
      academicYearId,
      termId,
      name.trim(),
      description,
      examStartDate,
      examEndDate,
      status,
      now,
      now,
    ],
  );

  return result.rows[0];
}
