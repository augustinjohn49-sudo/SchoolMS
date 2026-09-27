import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

export async function createClassSubject({ schoolId, classId, subjectId }) {
  // Verify that the class belongs to the school
  const classResult = await pool.query(
    `
    SELECT
      id,
      "academicYearId",
      name
    FROM "Class"
    WHERE id = $1
      AND "academicYearId" IN (
        SELECT id
        FROM "AcademicYear"
        WHERE "schoolId" = $2
      )
    LIMIT 1
    `,
    [classId, schoolId],
  );

  const classRecord = classResult.rows[0];

  if (!classRecord) {
    const error = new Error("Class not found.");
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  // Verify that the subject belongs to the school
  const subjectResult = await pool.query(
    `
    SELECT
      id,
      name,
      code,
      status
    FROM "Subject"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [subjectId, schoolId],
  );

  const subject = subjectResult.rows[0];

  if (!subject) {
    const error = new Error("Subject not found.");
    error.code = "SUBJECT_NOT_FOUND";
    throw error;
  }

  // Only active subjects can be assigned to a class
  if (subject.status !== "ACTIVE") {
    const error = new Error("Only active subjects can be assigned to a class.");

    error.code = "SUBJECT_INACTIVE";
    throw error;
  }

  // Prevent the same subject from being assigned to the same class twice
  const existingAssignment = await pool.query(
    `
    SELECT id
    FROM "ClassSubject"
    WHERE "classId" = $1
      AND "subjectId" = $2
    LIMIT 1
    `,
    [classId, subjectId],
  );

  if (existingAssignment.rows.length > 0) {
    const error = new Error("This subject is already assigned to this class.");

    error.code = "CLASS_SUBJECT_EXISTS";
    throw error;
  }

  const assignmentId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "ClassSubject"
    (
      id,
      "classId",
      "subjectId",
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5)
    RETURNING
      id,
      "classId",
      "subjectId",
      "createdAt",
      "updatedAt"
    `,
    [assignmentId, classId, subjectId, now, now],
  );

  return result.rows[0];
}

export async function getClassSubjects({ schoolId, classId }) {
  // Verify that the class belongs to the school
  const classResult = await pool.query(
    `
    SELECT
      id,
      "academicYearId",
      name
    FROM "Class"
    WHERE id = $1
      AND "academicYearId" IN (
        SELECT id
        FROM "AcademicYear"
        WHERE "schoolId" = $2
      )
    LIMIT 1
    `,
    [classId, schoolId],
  );

  const classRecord = classResult.rows[0];

  if (!classRecord) {
    const error = new Error("Class not found.");
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      cs.id,
      cs."classId",
      cs."subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode",
      s.description AS "subjectDescription",
      s.status AS "subjectStatus",
      cs."createdAt",
      cs."updatedAt"
    FROM "ClassSubject" cs
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    WHERE cs."classId" = $1
    ORDER BY s.name ASC
    `,
    [classId],
  );

  return result.rows;
}

export async function getClassSubjectById({ schoolId, classSubjectId }) {
  const result = await pool.query(
    `
    SELECT
      cs.id,
      cs."classId",
      cs."subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode",
      s.description AS "subjectDescription",
      s.status AS "subjectStatus",
      c.name AS "className",
      c."academicYearId",
      cs."createdAt",
      cs."updatedAt"
    FROM "ClassSubject" cs
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    INNER JOIN "Class" c
      ON c.id = cs."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE cs.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [classSubjectId, schoolId],
  );

  const assignment = result.rows[0];

  if (!assignment) {
    const error = new Error("Class-subject assignment not found.");
    error.code = "CLASS_SUBJECT_NOT_FOUND";
    throw error;
  }

  return assignment;
}

export async function deleteClassSubject({ schoolId, classSubjectId }) {
  // Verify that the assignment belongs to the school
  const existingResult = await pool.query(
    `
    SELECT
      cs.id
    FROM "ClassSubject" cs
    INNER JOIN "Class" c
      ON c.id = cs."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE cs.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [classSubjectId, schoolId],
  );

  const existingAssignment = existingResult.rows[0];

  if (!existingAssignment) {
    const error = new Error("Class-subject assignment not found.");
    error.code = "CLASS_SUBJECT_NOT_FOUND";
    throw error;
  }

  await pool.query(
    `
    DELETE FROM "ClassSubject"
    WHERE id = $1
    `,
    [classSubjectId],
  );

  return {
    id: classSubjectId,
  };
}
