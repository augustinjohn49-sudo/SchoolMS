import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

export async function createGradingScale({
  schoolId,
  name,
  description,
  isDefault = false,
}) {
  const existingGradingScale = await pool.query(
    `
    SELECT id
    FROM "GradingScale"
    WHERE "schoolId" = $1
      AND name = $2
    LIMIT 1
    `,
    [schoolId, name],
  );

  if (existingGradingScale.rows.length > 0) {
    const error = new Error(
      "A grading scale with this name already exists for this school.",
    );

    error.code = "GRADING_SCALE_EXISTS";

    throw error;
  }

  const gradingScaleId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "GradingScale"
    (
      id,
      "schoolId",
      name,
      description,
      "isDefault",
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      id,
      "schoolId",
      name,
      description,
      "isDefault",
      "createdAt",
      "updatedAt"
    `,
    [gradingScaleId, schoolId, name, description ?? null, isDefault, now, now],
  );

  return result.rows[0];
}

export async function getGradingScalesBySchool({ schoolId }) {
  const result = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      description,
      "isDefault",
      "createdAt",
      "updatedAt"
    FROM "GradingScale"
    WHERE "schoolId" = $1
    ORDER BY "isDefault" DESC, name ASC
    `,
    [schoolId],
  );

  return result.rows;
}

export async function getGradingScaleById({ schoolId, gradingScaleId }) {
  const result = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      description,
      "isDefault",
      "createdAt",
      "updatedAt"
    FROM "GradingScale"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [gradingScaleId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Grading scale not found.");
    error.code = "GRADING_SCALE_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function updateGradingScale({
  schoolId,
  gradingScaleId,
  name,
  description,
  isDefault,
}) {
  const existingResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      description,
      "isDefault"
    FROM "GradingScale"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [gradingScaleId, schoolId],
  );

  const existingGradingScale = existingResult.rows[0];

  if (!existingGradingScale) {
    const error = new Error("Grading scale not found.");
    error.code = "GRADING_SCALE_NOT_FOUND";
    throw error;
  }

  const updatedName = name ?? existingGradingScale.name;
  const updatedDescription =
    description !== undefined ? description : existingGradingScale.description;
  const updatedIsDefault = isDefault ?? existingGradingScale.isDefault;

  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM "GradingScale"
    WHERE "schoolId" = $1
      AND name = $2
      AND id <> $3
    LIMIT 1
    `,
    [schoolId, updatedName, gradingScaleId],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "A grading scale with this name already exists for this school.",
    );

    error.code = "GRADING_SCALE_EXISTS";

    throw error;
  }

  const now = new Date();

  const result = await pool.query(
    `
    UPDATE "GradingScale"
    SET
      name = $1,
      description = $2,
      "isDefault" = $3,
      "updatedAt" = $4
    WHERE id = $5
      AND "schoolId" = $6
    RETURNING
      id,
      "schoolId",
      name,
      description,
      "isDefault",
      "createdAt",
      "updatedAt"
    `,
    [
      updatedName,
      updatedDescription,
      updatedIsDefault,
      now,
      gradingScaleId,
      schoolId,
    ],
  );

  return result.rows[0];
}

export async function deleteGradingScale({ schoolId, gradingScaleId }) {
  const result = await pool.query(
    `
    DELETE FROM "GradingScale"
    WHERE id = $1
      AND "schoolId" = $2
    RETURNING
      id,
      "schoolId",
      name,
      description,
      "isDefault",
      "createdAt",
      "updatedAt"
    `,
    [gradingScaleId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Grading scale not found.");
    error.code = "GRADING_SCALE_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}
