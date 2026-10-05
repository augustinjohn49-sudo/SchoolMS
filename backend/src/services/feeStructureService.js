import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

export async function createFeeStructure({
  schoolId,
  academicYearId,
  termId,
  classId,
  streamId = null,
  name,
  description = null,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!academicYearId || !termId || !classId || !name) {
    const error = new Error(
      "Academic year, term, class, and name are required.",
    );
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  // Verify academic year belongs to school.
  const academicYearResult = await pool.query(
    `
      SELECT id
      FROM "AcademicYear"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
    `,
    [academicYearId, schoolId],
  );

  if (academicYearResult.rows.length === 0) {
    const error = new Error(
      "Academic year not found or does not belong to this school.",
    );
    error.code = "ACADEMIC_YEAR_NOT_FOUND";
    throw error;
  }

  // Verify term belongs to the academic year.
  const termResult = await pool.query(
    `
      SELECT id
      FROM "Term"
      WHERE id = $1
        AND "academicYearId" = $2
      LIMIT 1
    `,
    [termId, academicYearId],
  );

  if (termResult.rows.length === 0) {
    const error = new Error(
      "Term not found or does not belong to this academic year.",
    );
    error.code = "TERM_NOT_FOUND";
    throw error;
  }

  // Verify class belongs to the academic year.
  const classResult = await pool.query(
    `
      SELECT id
      FROM "Class"
      WHERE id = $1
        AND "academicYearId" = $2
      LIMIT 1
    `,
    [classId, academicYearId],
  );

  if (classResult.rows.length === 0) {
    const error = new Error(
      "Class not found or does not belong to this academic year.",
    );
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  // Verify stream belongs to the selected class.
  if (streamId) {
    const streamResult = await pool.query(
      `
        SELECT id
        FROM "Stream"
        WHERE id = $1
          AND "classId" = $2
        LIMIT 1
      `,
      [streamId, classId],
    );

    if (streamResult.rows.length === 0) {
      const error = new Error(
        "Stream not found or does not belong to this class.",
      );
      error.code = "STREAM_NOT_FOUND";
      throw error;
    }
  }

  // Prevent duplicate fee structures.
  const existingResult = await pool.query(
    `
      SELECT id
      FROM "FeeStructure"
      WHERE "schoolId" = $1
        AND "academicYearId" = $2
        AND "termId" = $3
        AND "classId" = $4
        AND (
          ("streamId" = $5)
          OR ("streamId" IS NULL AND $5 IS NULL)
        )
        AND name = $6
      LIMIT 1
    `,
    [schoolId, academicYearId, termId, classId, streamId, name],
  );

  if (existingResult.rows.length > 0) {
    const error = new Error(
      "A fee structure with this name already exists for the selected academic period and class.",
    );
    error.code = "FEE_STRUCTURE_EXISTS";
    throw error;
  }

  const feeStructureId = randomUUID();

  const result = await pool.query(
    `
      INSERT INTO "FeeStructure" (
        id,
        "schoolId",
        "academicYearId",
        "termId",
        "classId",
        "streamId",
        name,
        description,
        status,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'DRAFT',
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      feeStructureId,
      schoolId,
      academicYearId,
      termId,
      classId,
      streamId,
      name,
      description,
    ],
  );

  return result.rows[0];
}

export async function getFeeStructureById({ schoolId, feeStructureId }) {
  const result = await pool.query(
    `
      SELECT
        fs.*,
        ay.name AS "academicYearName",
        t.name AS "termName",
        c.name AS "className",
        s.name AS "streamName"
      FROM "FeeStructure" fs
      INNER JOIN "AcademicYear" ay
        ON ay.id = fs."academicYearId"
      INNER JOIN "Term" t
        ON t.id = fs."termId"
      INNER JOIN "Class" c
        ON c.id = fs."classId"
      LEFT JOIN "Stream" s
        ON s.id = fs."streamId"
      WHERE fs.id = $1
        AND fs."schoolId" = $2
      LIMIT 1
    `,
    [feeStructureId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Fee structure not found.");
    error.code = "FEE_STRUCTURE_NOT_FOUND";
    throw error;
  }

  const itemsResult = await pool.query(
    `
      SELECT
        id,
        "feeStructureId",
        name,
        type,
        amount,
        description,
        "createdAt",
        "updatedAt"
      FROM "FeeStructureItem"
      WHERE "feeStructureId" = $1
      ORDER BY name
    `,
    [feeStructureId],
  );

  return {
    ...result.rows[0],
    items: itemsResult.rows,
  };
}

export async function getFeeStructures({
  schoolId,
  academicYearId = null,
  termId = null,
  classId = null,
  streamId = null,
  status = null,
}) {
  const conditions = [`fs."schoolId" = $1`];
  const values = [schoolId];

  if (academicYearId) {
    values.push(academicYearId);
    conditions.push(`fs."academicYearId" = $${values.length}`);
  }

  if (termId) {
    values.push(termId);
    conditions.push(`fs."termId" = $${values.length}`);
  }

  if (classId) {
    values.push(classId);
    conditions.push(`fs."classId" = $${values.length}`);
  }

  if (streamId) {
    values.push(streamId);
    conditions.push(`fs."streamId" = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`fs.status = $${values.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        fs.*,
        ay.name AS "academicYearName",
        t.name AS "termName",
        c.name AS "className",
        s.name AS "streamName",
        COUNT(fsi.id)::int AS "itemCount"
      FROM "FeeStructure" fs
      INNER JOIN "AcademicYear" ay
        ON ay.id = fs."academicYearId"
      INNER JOIN "Term" t
        ON t.id = fs."termId"
      INNER JOIN "Class" c
        ON c.id = fs."classId"
      LEFT JOIN "Stream" s
        ON s.id = fs."streamId"
      LEFT JOIN "FeeStructureItem" fsi
        ON fsi."feeStructureId" = fs.id
      WHERE ${conditions.join(" AND ")}
      GROUP BY fs.id, ay.name, t.name, c.name, s.name
      ORDER BY ay."startDate" DESC, t."startDate" ASC, c.name ASC, fs.name ASC
    `,
    values,
  );

  return result.rows;
}

export async function updateFeeStructure({
  schoolId,
  feeStructureId,
  name,
  description = null,
}) {
  if (!name) {
    const error = new Error("Fee structure name is required.");
    error.code = "NAME_REQUIRED";
    throw error;
  }

  const existingResult = await pool.query(
    `
      SELECT
        id,
        status,
        "academicYearId",
        "termId",
        "classId",
        "streamId"
      FROM "FeeStructure"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
    `,
    [feeStructureId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Fee structure not found.");
    error.code = "FEE_STRUCTURE_NOT_FOUND";
    throw error;
  }

  const existing = existingResult.rows[0];

  if (existing.status !== "DRAFT") {
    const error = new Error("Only draft fee structures can be updated.");
    error.code = "FEE_STRUCTURE_NOT_DRAFT";
    throw error;
  }

  const duplicateResult = await pool.query(
    `
      SELECT id
      FROM "FeeStructure"
      WHERE "schoolId" = $1
        AND "academicYearId" = $2
        AND "termId" = $3
        AND "classId" = $4
        AND (
          ("streamId" = $5)
          OR ("streamId" IS NULL AND $5 IS NULL)
        )
        AND name = $6
        AND id <> $7
      LIMIT 1
    `,
    [
      schoolId,
      existing.academicYearId,
      existing.termId,
      existing.classId,
      existing.streamId,
      name,
      feeStructureId,
    ],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "Another fee structure with this name already exists for the selected academic period and class.",
    );
    error.code = "FEE_STRUCTURE_EXISTS";
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE "FeeStructure"
      SET
        name = $1,
        description = $2,
        "updatedAt" = NOW()
      WHERE id = $3
        AND "schoolId" = $4
      RETURNING *
    `,
    [name, description, feeStructureId, schoolId],
  );

  return result.rows[0];
}

export async function activateFeeStructure({ schoolId, feeStructureId }) {
  const result = await pool.query(
    `
      UPDATE "FeeStructure"
      SET
        status = 'ACTIVE',
        "updatedAt" = NOW()
      WHERE id = $1
        AND "schoolId" = $2
        AND status = 'DRAFT'
      RETURNING *
    `,
    [feeStructureId, schoolId],
  );

  if (result.rows.length === 0) {
    const existingResult = await pool.query(
      `
        SELECT id, status
        FROM "FeeStructure"
        WHERE id = $1
          AND "schoolId" = $2
        LIMIT 1
      `,
      [feeStructureId, schoolId],
    );

    if (existingResult.rows.length === 0) {
      const error = new Error("Fee structure not found.");
      error.code = "FEE_STRUCTURE_NOT_FOUND";
      throw error;
    }

    const error = new Error("Only draft fee structures can be activated.");
    error.code = "FEE_STRUCTURE_NOT_DRAFT";
    throw error;
  }

  return result.rows[0];
}

export async function archiveFeeStructure({ schoolId, feeStructureId }) {
  const result = await pool.query(
    `
      UPDATE "FeeStructure"
      SET
        status = 'ARCHIVED',
        "updatedAt" = NOW()
      WHERE id = $1
        AND "schoolId" = $2
        AND status = 'ACTIVE'
      RETURNING *
    `,
    [feeStructureId, schoolId],
  );

  if (result.rows.length === 0) {
    const existingResult = await pool.query(
      `
        SELECT id, status
        FROM "FeeStructure"
        WHERE id = $1
          AND "schoolId" = $2
        LIMIT 1
      `,
      [feeStructureId, schoolId],
    );

    if (existingResult.rows.length === 0) {
      const error = new Error("Fee structure not found.");
      error.code = "FEE_STRUCTURE_NOT_FOUND";
      throw error;
    }

    const error = new Error("Only active fee structures can be archived.");
    error.code = "FEE_STRUCTURE_NOT_ACTIVE";
    throw error;
  }

  return result.rows[0];
}

export async function addFeeStructureItem({
  schoolId,
  feeStructureId,
  name,
  type,
  amount,
  description = null,
}) {
  if (!name || !type || amount === undefined || amount === null) {
    const error = new Error("Name, type, and amount are required.");
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error("Fee item amount must be greater than zero.");
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  const structureResult = await pool.query(
    `
      SELECT id, status
      FROM "FeeStructure"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
    `,
    [feeStructureId, schoolId],
  );

  if (structureResult.rows.length === 0) {
    const error = new Error("Fee structure not found.");
    error.code = "FEE_STRUCTURE_NOT_FOUND";
    throw error;
  }

  if (structureResult.rows[0].status !== "DRAFT") {
    const error = new Error(
      "Fee items can only be added to draft fee structures.",
    );
    error.code = "FEE_STRUCTURE_NOT_DRAFT";
    throw error;
  }

  const existingItem = await pool.query(
    `
      SELECT id
      FROM "FeeStructureItem"
      WHERE "feeStructureId" = $1
        AND name = $2
      LIMIT 1
    `,
    [feeStructureId, name],
  );

  if (existingItem.rows.length > 0) {
    const error = new Error(
      "A fee item with this name already exists in this fee structure.",
    );
    error.code = "FEE_ITEM_EXISTS";
    throw error;
  }

  const itemId = randomUUID();

  const result = await pool.query(
    `
      INSERT INTO "FeeStructureItem" (
        id,
        "feeStructureId",
        name,
        type,
        amount,
        description,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [itemId, feeStructureId, name, type, numericAmount, description],
  );

  return result.rows[0];
}

export async function updateFeeStructureItem({
  schoolId,
  feeStructureId,
  itemId,
  name,
  type,
  amount,
  description = null,
}) {
  if (!name || !type || amount === undefined || amount === null) {
    const error = new Error("Name, type, and amount are required.");
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error("Fee item amount must be greater than zero.");
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  const structureResult = await pool.query(
    `
      SELECT id, status
      FROM "FeeStructure"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
    `,
    [feeStructureId, schoolId],
  );

  if (structureResult.rows.length === 0) {
    const error = new Error("Fee structure not found.");
    error.code = "FEE_STRUCTURE_NOT_FOUND";
    throw error;
  }

  if (structureResult.rows[0].status !== "DRAFT") {
    const error = new Error(
      "Fee items can only be updated in draft fee structures.",
    );
    error.code = "FEE_STRUCTURE_NOT_DRAFT";
    throw error;
  }

  const duplicateItem = await pool.query(
    `
      SELECT id
      FROM "FeeStructureItem"
      WHERE "feeStructureId" = $1
        AND name = $2
        AND id <> $3
      LIMIT 1
    `,
    [feeStructureId, name, itemId],
  );

  if (duplicateItem.rows.length > 0) {
    const error = new Error(
      "Another fee item with this name already exists in this fee structure.",
    );
    error.code = "FEE_ITEM_EXISTS";
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE "FeeStructureItem"
      SET
        name = $1,
        type = $2,
        amount = $3,
        description = $4,
        "updatedAt" = NOW()
      WHERE id = $5
        AND "feeStructureId" = $6
      RETURNING *
    `,
    [name, type, numericAmount, description, itemId, feeStructureId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Fee structure item not found.");
    error.code = "FEE_ITEM_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function deleteFeeStructureItem({
  schoolId,
  feeStructureId,
  itemId,
}) {
  const structureResult = await pool.query(
    `
      SELECT id, status
      FROM "FeeStructure"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
    `,
    [feeStructureId, schoolId],
  );

  if (structureResult.rows.length === 0) {
    const error = new Error("Fee structure not found.");
    error.code = "FEE_STRUCTURE_NOT_FOUND";
    throw error;
  }

  if (structureResult.rows[0].status !== "DRAFT") {
    const error = new Error(
      "Fee items can only be deleted from draft fee structures.",
    );
    error.code = "FEE_STRUCTURE_NOT_DRAFT";
    throw error;
  }

  const result = await pool.query(
    `
      DELETE FROM "FeeStructureItem"
      WHERE id = $1
        AND "feeStructureId" = $2
      RETURNING *
    `,
    [itemId, feeStructureId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Fee structure item not found.");
    error.code = "FEE_ITEM_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}
