import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

function validatePercentageRange(minPercentage, maxPercentage) {
  const min = Number(minPercentage);
  const max = Number(maxPercentage);

  if (
    minPercentage === undefined ||
    minPercentage === null ||
    maxPercentage === undefined ||
    maxPercentage === null
  ) {
    const error = new Error("Minimum and maximum percentages are required.");
    error.code = "PERCENTAGE_RANGE_REQUIRED";
    throw error;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    const error = new Error(
      "Minimum and maximum percentages must be valid numbers.",
    );
    error.code = "INVALID_PERCENTAGE_RANGE";
    throw error;
  }

  if (min < 0 || max < 0 || min > 100 || max > 100) {
    const error = new Error("Percentages must be between 0 and 100.");
    error.code = "PERCENTAGE_OUT_OF_RANGE";
    throw error;
  }

  if (min > max) {
    const error = new Error(
      "Minimum percentage cannot be greater than maximum percentage.",
    );
    error.code = "INVALID_PERCENTAGE_RANGE";
    throw error;
  }

  return { min, max };
}

async function verifyGradingScale({ client, schoolId, gradingScaleId }) {
  const result = await client.query(
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

  if (result.rows.length === 0) {
    const error = new Error("Grading scale not found.");
    error.code = "GRADING_SCALE_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

async function ensureNoOverlappingGrade({
  client,
  gradingScaleId,
  minPercentage,
  maxPercentage,
  gradeId = null,
}) {
  const result = await client.query(
    `
    SELECT id
    FROM "Grade"
    WHERE "gradingScaleId" = $1
      AND "minPercentage" <= $3
      AND "maxPercentage" >= $2
      AND ($4::text IS NULL OR id <> $4)
    LIMIT 1
    `,
    [gradingScaleId, minPercentage, maxPercentage, gradeId],
  );

  if (result.rows.length > 0) {
    const error = new Error(
      "The percentage range overlaps with an existing grade.",
    );
    error.code = "GRADE_RANGE_OVERLAP";
    throw error;
  }
}

export async function createGrade({
  schoolId,
  gradingScaleId,
  name,
  minPercentage,
  maxPercentage,
  remarks,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!gradingScaleId) {
    const error = new Error("Grading scale ID is required.");
    error.code = "GRADING_SCALE_REQUIRED";
    throw error;
  }

  if (!name) {
    const error = new Error("Grade name is required.");
    error.code = "GRADE_NAME_REQUIRED";
    throw error;
  }

  const { min, max } = validatePercentageRange(minPercentage, maxPercentage);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const gradingScale = await verifyGradingScale({
      client,
      schoolId,
      gradingScaleId,
    });

    const existingGrade = await client.query(
      `
      SELECT id
      FROM "Grade"
      WHERE "gradingScaleId" = $1
        AND name = $2
      LIMIT 1
      `,
      [gradingScaleId, name],
    );

    if (existingGrade.rows.length > 0) {
      const error = new Error(
        "A grade with this name already exists in this grading scale.",
      );
      error.code = "GRADE_EXISTS";
      throw error;
    }

    await ensureNoOverlappingGrade({
      client,
      gradingScaleId,
      minPercentage: min,
      maxPercentage: max,
    });

    const gradeId = randomUUID();
    const now = new Date();

    const result = await client.query(
      `
      INSERT INTO "Grade" (
        id,
        "gradingScaleId",
        name,
        "minPercentage",
        "maxPercentage",
        remarks,
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        "gradingScaleId",
        name,
        "minPercentage",
        "maxPercentage",
        remarks,
        "createdAt",
        "updatedAt"
      `,
      [gradeId, gradingScaleId, name, min, max, remarks ?? null, now, now],
    );

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      gradingScale,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const duplicateError = new Error(
        "A grade with this name already exists in this grading scale.",
      );
      duplicateError.code = "GRADE_EXISTS";
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function getGradesByGradingScale({ schoolId, gradingScaleId }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!gradingScaleId) {
    const error = new Error("Grading scale ID is required.");
    error.code = "GRADING_SCALE_REQUIRED";
    throw error;
  }

  const gradingScale = await verifyGradingScale({
    client: pool,
    schoolId,
    gradingScaleId,
  });

  const result = await pool.query(
    `
    SELECT
      id,
      "gradingScaleId",
      name,
      "minPercentage",
      "maxPercentage",
      remarks,
      "createdAt",
      "updatedAt"
    FROM "Grade"
    WHERE "gradingScaleId" = $1
    ORDER BY "minPercentage" DESC, name ASC
    `,
    [gradingScaleId],
  );

  return {
    gradingScale,
    grades: result.rows,
  };
}

export async function getGradeById({ schoolId, gradingScaleId, gradeId }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!gradingScaleId) {
    const error = new Error("Grading scale ID is required.");
    error.code = "GRADING_SCALE_REQUIRED";
    throw error;
  }

  if (!gradeId) {
    const error = new Error("Grade ID is required.");
    error.code = "GRADE_REQUIRED";
    throw error;
  }

  const gradingScale = await verifyGradingScale({
    client: pool,
    schoolId,
    gradingScaleId,
  });

  const result = await pool.query(
    `
    SELECT
      id,
      "gradingScaleId",
      name,
      "minPercentage",
      "maxPercentage",
      remarks,
      "createdAt",
      "updatedAt"
    FROM "Grade"
    WHERE id = $1
      AND "gradingScaleId" = $2
    LIMIT 1
    `,
    [gradeId, gradingScaleId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Grade not found.");
    error.code = "GRADE_NOT_FOUND";
    throw error;
  }

  return {
    ...result.rows[0],
    gradingScale,
  };
}

export async function updateGrade({
  schoolId,
  gradingScaleId,
  gradeId,
  name,
  minPercentage,
  maxPercentage,
  remarks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const gradingScale = await verifyGradingScale({
      client,
      schoolId,
      gradingScaleId,
    });

    const existingResult = await client.query(
      `
      SELECT
        id,
        "gradingScaleId",
        name,
        "minPercentage",
        "maxPercentage",
        remarks
      FROM "Grade"
      WHERE id = $1
        AND "gradingScaleId" = $2
      LIMIT 1
      `,
      [gradeId, gradingScaleId],
    );

    const existingGrade = existingResult.rows[0];

    if (!existingGrade) {
      const error = new Error("Grade not found.");
      error.code = "GRADE_NOT_FOUND";
      throw error;
    }

    const updatedName = name ?? existingGrade.name;

    const updatedMin =
      minPercentage !== undefined ? minPercentage : existingGrade.minPercentage;

    const updatedMax =
      maxPercentage !== undefined ? maxPercentage : existingGrade.maxPercentage;

    const updatedRemarks =
      remarks !== undefined ? remarks : existingGrade.remarks;

    const { min, max } = validatePercentageRange(updatedMin, updatedMax);

    const duplicateResult = await client.query(
      `
      SELECT id
      FROM "Grade"
      WHERE "gradingScaleId" = $1
        AND name = $2
        AND id <> $3
      LIMIT 1
      `,
      [gradingScaleId, updatedName, gradeId],
    );

    if (duplicateResult.rows.length > 0) {
      const error = new Error(
        "A grade with this name already exists in this grading scale.",
      );
      error.code = "GRADE_EXISTS";
      throw error;
    }

    await ensureNoOverlappingGrade({
      client,
      gradingScaleId,
      minPercentage: min,
      maxPercentage: max,
      gradeId,
    });

    const now = new Date();

    const result = await client.query(
      `
      UPDATE "Grade"
      SET
        name = $1,
        "minPercentage" = $2,
        "maxPercentage" = $3,
        remarks = $4,
        "updatedAt" = $5
      WHERE id = $6
        AND "gradingScaleId" = $7
      RETURNING
        id,
        "gradingScaleId",
        name,
        "minPercentage",
        "maxPercentage",
        remarks,
        "createdAt",
        "updatedAt"
      `,
      [updatedName, min, max, updatedRemarks, now, gradeId, gradingScaleId],
    );

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      gradingScale,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const duplicateError = new Error(
        "A grade with this name already exists in this grading scale.",
      );
      duplicateError.code = "GRADE_EXISTS";
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function deleteGrade({ schoolId, gradingScaleId, gradeId }) {
  const gradingScaleResult = await pool.query(
    `
    SELECT id
    FROM "GradingScale"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [gradingScaleId, schoolId],
  );

  if (gradingScaleResult.rows.length === 0) {
    const error = new Error("Grading scale not found.");
    error.code = "GRADING_SCALE_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    DELETE FROM "Grade"
    WHERE id = $1
      AND "gradingScaleId" = $2
    RETURNING
      id,
      "gradingScaleId",
      name,
      "minPercentage",
      "maxPercentage",
      remarks,
      "createdAt",
      "updatedAt"
    `,
    [gradeId, gradingScaleId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Grade not found.");
    error.code = "GRADE_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}
