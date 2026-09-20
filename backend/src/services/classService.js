import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

export async function createClass({ schoolId, academicYearId, name, level }) {
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

  const existingClass = await pool.query(
    `
    SELECT id
    FROM "Class"
    WHERE "academicYearId" = $1
      AND name = $2
    LIMIT 1
    `,
    [academicYearId, name],
  );

  if (existingClass.rows.length > 0) {
    const error = new Error(
      "A class with this name already exists for this academic year.",
    );

    error.code = "CLASS_EXISTS";

    throw error;
  }

  const classId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "Class"
    (
      id,
      "academicYearId",
      name,
      level,
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      "academicYearId",
      name,
      level,
      "createdAt",
      "updatedAt"
    `,
    [classId, academicYearId, name, level ?? null, now, now],
  );

  return result.rows[0];
}

export async function getClassesByAcademicYear({ schoolId, academicYearId }) {
  const academicYearResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      name
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
      level,
      "createdAt",
      "updatedAt"
    FROM "Class"
    WHERE "academicYearId" = $1
    ORDER BY
      level ASC NULLS LAST,
      name ASC
    `,
    [academicYearId],
  );

  return result.rows;
}

export async function getClassById({ schoolId, classId }) {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c."academicYearId",
      c.name,
      c.level,
      c."createdAt",
      c."updatedAt",
      ay."schoolId"
    FROM "Class" c
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE c.id = $1
    LIMIT 1
    `,
    [classId],
  );

  const schoolClass = result.rows[0];

  if (!schoolClass) {
    const error = new Error("Class not found.");
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (schoolClass.schoolId !== schoolId) {
    const error = new Error("You do not have access to this class.");
    error.code = "CLASS_ACCESS_DENIED";
    throw error;
  }

  return schoolClass;
}

export async function updateClass({ schoolId, classId, name, level }) {
  const classResult = await pool.query(
    `
    SELECT
      c.id,
      c."academicYearId",
      c.name,
      c.level,
      ay."schoolId"
    FROM "Class" c
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE c.id = $1
    LIMIT 1
    `,
    [classId],
  );

  const schoolClass = classResult.rows[0];

  if (!schoolClass) {
    const error = new Error("Class not found.");
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (schoolClass.schoolId !== schoolId) {
    const error = new Error("You do not have access to this class.");
    error.code = "CLASS_ACCESS_DENIED";
    throw error;
  }

  const updatedName = name !== undefined ? name : schoolClass.name;

  const updatedLevel = level !== undefined ? level : schoolClass.level;

  if (updatedName === schoolClass.name && updatedLevel === schoolClass.level) {
    const error = new Error("At least one field must be changed.");
    error.code = "NO_CHANGES";
    throw error;
  }

  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM "Class"
    WHERE "academicYearId" = $1
      AND name = $2
      AND id <> $3
    LIMIT 1
    `,
    [schoolClass.academicYearId, updatedName, classId],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "A class with this name already exists for this academic year.",
    );
    error.code = "CLASS_EXISTS";
    throw error;
  }

  const now = new Date();

  const result = await pool.query(
    `
    UPDATE "Class"
    SET
      name = $1,
      level = $2,
      "updatedAt" = $3
    WHERE id = $4
    RETURNING
      id,
      "academicYearId",
      name,
      level,
      "createdAt",
      "updatedAt"
    `,
    [updatedName, updatedLevel, now, classId],
  );

  return result.rows[0];
}

export async function deleteClass({ schoolId, classId }) {
  const classResult = await pool.query(
    `
    SELECT
      c.id,
      ay."schoolId"
    FROM "Class" c
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE c.id = $1
    LIMIT 1
    `,
    [classId],
  );

  const schoolClass = classResult.rows[0];

  if (!schoolClass) {
    const error = new Error("Class not found.");
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  if (schoolClass.schoolId !== schoolId) {
    const error = new Error("You do not have access to this class.");
    error.code = "CLASS_ACCESS_DENIED";
    throw error;
  }

  await pool.query(
    `
    DELETE FROM "Class"
    WHERE id = $1
    `,
    [classId],
  );

  return {
    id: classId,
  };
}
