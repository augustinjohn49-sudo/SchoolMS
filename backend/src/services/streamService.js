import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

// Creates a new stream for a given class
export async function createStream({ schoolId, classId, name }) {
  const classResult = await pool.query(
    `
    SELECT
      c.id,
      c."academicYearId",
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

  const existingStream = await pool.query(
    `
    SELECT id
    FROM "Stream"
    WHERE "classId" = $1
      AND name = $2
    LIMIT 1
    `,
    [classId, name],
  );

  if (existingStream.rows.length > 0) {
    const error = new Error(
      "A stream with this name already exists for this class.",
    );
    error.code = "STREAM_EXISTS";
    throw error;
  }

  const streamId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "Stream"
    (
      id,
      "classId",
      name,
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5)
    RETURNING
      id,
      "classId",
      name,
      "createdAt",
      "updatedAt"
    `,
    [streamId, classId, name, now, now],
  );

  return result.rows[0];
}

// Retrieves all streams for a given class
export async function getStreamsByClass({ schoolId, classId }) {
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

  const result = await pool.query(
    `
    SELECT
      id,
      "classId",
      name,
      "createdAt",
      "updatedAt"
    FROM "Stream"
    WHERE "classId" = $1
    ORDER BY name ASC
    `,
    [classId],
  );

  return result.rows;
}

// Retrieves a stream by its ID
export async function getStreamById({ schoolId, streamId }) {
  const result = await pool.query(
    `
    SELECT
      s.id,
      s."classId",
      s.name,
      s."createdAt",
      s."updatedAt",
      ay."schoolId"
    FROM "Stream" s
    INNER JOIN "Class" c
      ON c.id = s."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE s.id = $1
    LIMIT 1
    `,
    [streamId],
  );

  const stream = result.rows[0];

  if (!stream) {
    const error = new Error("Stream not found.");
    error.code = "STREAM_NOT_FOUND";
    throw error;
  }

  if (stream.schoolId !== schoolId) {
    const error = new Error("You do not have access to this stream.");
    error.code = "STREAM_ACCESS_DENIED";
    throw error;
  }

  return stream;
}

// Updates a stream's name
export async function updateStream({ schoolId, streamId, name }) {
  const streamResult = await pool.query(
    `
    SELECT
      s.id,
      s."classId",
      s.name,
      ay."schoolId"
    FROM "Stream" s
    INNER JOIN "Class" c
      ON c.id = s."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE s.id = $1
    LIMIT 1
    `,
    [streamId],
  );

  const stream = streamResult.rows[0];

  if (!stream) {
    const error = new Error("Stream not found.");
    error.code = "STREAM_NOT_FOUND";
    throw error;
  }

  if (stream.schoolId !== schoolId) {
    const error = new Error("You do not have access to this stream.");
    error.code = "STREAM_ACCESS_DENIED";
    throw error;
  }

  if (name === undefined) {
    const error = new Error("At least one field must be provided.");
    error.code = "NO_CHANGES";
    throw error;
  }

  if (name === stream.name) {
    const error = new Error("At least one field must be changed.");
    error.code = "NO_CHANGES";
    throw error;
  }

  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM "Stream"
    WHERE "classId" = $1
      AND name = $2
      AND id <> $3
    LIMIT 1
    `,
    [stream.classId, name, streamId],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "A stream with this name already exists for this class.",
    );
    error.code = "STREAM_EXISTS";
    throw error;
  }

  const now = new Date();

  const result = await pool.query(
    `
    UPDATE "Stream"
    SET
      name = $1,
      "updatedAt" = $2
    WHERE id = $3
    RETURNING
      id,
      "classId",
      name,
      "createdAt",
      "updatedAt"
    `,
    [name, now, streamId],
  );

  return result.rows[0];
}

// Deletes a stream by its ID
export async function deleteStream({ schoolId, streamId }) {
  const result = await pool.query(
    `
    SELECT
      s.id,
      ay."schoolId"
    FROM "Stream" s
    INNER JOIN "Class" c
      ON c.id = s."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE s.id = $1
    LIMIT 1
    `,
    [streamId],
  );

  const stream = result.rows[0];

  if (!stream) {
    const error = new Error("Stream not found.");
    error.code = "STREAM_NOT_FOUND";
    throw error;
  }

  if (stream.schoolId !== schoolId) {
    const error = new Error("You do not have access to this stream.");
    error.code = "STREAM_ACCESS_DENIED";
    throw error;
  }

  await pool.query(
    `
    DELETE FROM "Stream"
    WHERE id = $1
    `,
    [streamId],
  );

  return {
    id: streamId,
  };
}
