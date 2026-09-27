import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

export async function createSubject({ schoolId, name, code, description }) {
  const existingSubject = await pool.query(
    `
    SELECT id
    FROM "Subject"
    WHERE "schoolId" = $1
      AND (name = $2 OR code = $3)
    LIMIT 1
    `,
    [schoolId, name, code],
  );

  if (existingSubject.rows.length > 0) {
    const error = new Error(
      "A subject with this name or code already exists for this school.",
    );

    error.code = "SUBJECT_EXISTS";

    throw error;
  }

  const subjectId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "Subject"
    (
      id,
      "schoolId",
      name,
      code,
      description,
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
      code,
      description,
      status,
      "createdAt",
      "updatedAt"
    `,
    [subjectId, schoolId, name, code, description ?? null, "ACTIVE", now, now],
  );

  return result.rows[0];
}

export async function getSubjectsBySchool({ schoolId }) {
  const result = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      code,
      description,
      status,
      "createdAt",
      "updatedAt"
    FROM "Subject"
    WHERE "schoolId" = $1
    ORDER BY name ASC
    `,
    [schoolId],
  );

  return result.rows;
}

export async function getSubjectById({ schoolId, subjectId }) {
  const result = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      code,
      description,
      status,
      "createdAt",
      "updatedAt"
    FROM "Subject"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [subjectId, schoolId],
  );

  const subject = result.rows[0];

  if (!subject) {
    const error = new Error("Subject not found.");
    error.code = "SUBJECT_NOT_FOUND";
    throw error;
  }

  return subject;
}

export async function updateSubject({
  schoolId,
  subjectId,
  name,
  code,
  description,
  status,
}) {
  const existingResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name,
      code,
      description,
      status
    FROM "Subject"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [subjectId, schoolId],
  );

  const existingSubject = existingResult.rows[0];

  if (!existingSubject) {
    const error = new Error("Subject not found.");
    error.code = "SUBJECT_NOT_FOUND";
    throw error;
  }

  const updatedName = name !== undefined ? name : existingSubject.name;

  const updatedCode = code !== undefined ? code : existingSubject.code;

  const updatedDescription =
    description !== undefined ? description : existingSubject.description;

  const updatedStatus = status !== undefined ? status : existingSubject.status;

  if (
    updatedName === existingSubject.name &&
    updatedCode === existingSubject.code &&
    updatedDescription === existingSubject.description &&
    updatedStatus === existingSubject.status
  ) {
    const error = new Error("At least one field must be changed.");
    error.code = "NO_CHANGES";
    throw error;
  }

  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM "Subject"
    WHERE "schoolId" = $1
      AND id <> $2
      AND (name = $3 OR code = $4)
    LIMIT 1
    `,
    [schoolId, subjectId, updatedName, updatedCode],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "A subject with this name or code already exists for this school.",
    );

    error.code = "SUBJECT_EXISTS";

    throw error;
  }

  const now = new Date();

  const result = await pool.query(
    `
    UPDATE "Subject"
    SET
      name = $1,
      code = $2,
      description = $3,
      status = $4,
      "updatedAt" = $5
    WHERE id = $6
      AND "schoolId" = $7
    RETURNING
      id,
      "schoolId",
      name,
      code,
      description,
      status,
      "createdAt",
      "updatedAt"
    `,
    [
      updatedName,
      updatedCode,
      updatedDescription,
      updatedStatus,
      now,
      subjectId,
      schoolId,
    ],
  );

  return result.rows[0];
}
