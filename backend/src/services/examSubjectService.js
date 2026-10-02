import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

export async function assignSubjectToExam({
  schoolId,
  examId,
  classSubjectId,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!examId) {
    const error = new Error("Exam ID is required.");
    error.code = "EXAM_REQUIRED";
    throw error;
  }

  if (!classSubjectId) {
    const error = new Error("Class subject ID is required.");
    error.code = "CLASS_SUBJECT_REQUIRED";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const examResult = await client.query(
      `
      SELECT
        id,
        "schoolId",
        "academicYearId",
        "termId",
        name,
        status
      FROM "Exam"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
      `,
      [examId, schoolId],
    );

    if (examResult.rows.length === 0) {
      const error = new Error("Exam not found.");
      error.code = "EXAM_NOT_FOUND";
      throw error;
    }

    const exam = examResult.rows[0];

    const classSubjectResult = await client.query(
      `
      SELECT
        cs.id,
        cs."classId",
        cs."subjectId",
        c."academicYearId",
        c.name AS "className",
        s.name AS "subjectName",
        s.code AS "subjectCode",
        s."schoolId"
      FROM "ClassSubject" cs
      INNER JOIN "Class" c
        ON c.id = cs."classId"
      INNER JOIN "Subject" s
        ON s.id = cs."subjectId"
      WHERE cs.id = $1
        AND s."schoolId" = $2
      LIMIT 1
      `,
      [classSubjectId, schoolId],
    );

    if (classSubjectResult.rows.length === 0) {
      const error = new Error("Class subject not found.");
      error.code = "CLASS_SUBJECT_NOT_FOUND";
      throw error;
    }

    const classSubject = classSubjectResult.rows[0];

    if (classSubject.academicYearId !== exam.academicYearId) {
      const error = new Error(
        "The class subject must belong to the same academic year as the exam.",
      );
      error.code = "ACADEMIC_YEAR_MISMATCH";
      throw error;
    }

    const existingAssignmentResult = await client.query(
      `
      SELECT id
      FROM "ExamSubject"
      WHERE "examId" = $1
        AND "classSubjectId" = $2
      LIMIT 1
      `,
      [examId, classSubjectId],
    );

    if (existingAssignmentResult.rows.length > 0) {
      const error = new Error(
        "This class subject is already assigned to the exam.",
      );
      error.code = "EXAM_SUBJECT_EXISTS";
      throw error;
    }

    const examSubjectId = randomUUID();
    const now = new Date();

    const insertResult = await client.query(
      `
      INSERT INTO "ExamSubject" (
        id,
        "examId",
        "classSubjectId",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        "examId",
        "classSubjectId",
        "createdAt",
        "updatedAt"
      `,
      [examSubjectId, examId, classSubjectId, now, now],
    );

    await client.query("COMMIT");

    return {
      ...insertResult.rows[0],
      exam,
      classSubject,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getExamSubjects({ schoolId, examId }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!examId) {
    const error = new Error("Exam ID is required.");
    error.code = "EXAM_REQUIRED";
    throw error;
  }

  const examResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      "academicYearId",
      "termId",
      name,
      description,
      "startDate",
      "endDate",
      status
    FROM "Exam"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [examId, schoolId],
  );

  if (examResult.rows.length === 0) {
    const error = new Error("Exam not found.");
    error.code = "EXAM_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      es.id,
      es."examId",
      es."classSubjectId",
      es."createdAt",

      c.id AS "classId",
      c.name AS "className",

      s.id AS "subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode"

    FROM "ExamSubject" es

    INNER JOIN "ClassSubject" cs
      ON cs.id = es."classSubjectId"

    INNER JOIN "Class" c
      ON c.id = cs."classId"

    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"

    WHERE es."examId" = $1
      AND s."schoolId" = $2

    ORDER BY c.name, s.name
    `,
    [examId, schoolId],
  );

  return {
    exam: examResult.rows[0],
    subjects: result.rows,
  };
}

export async function removeSubjectFromExam({
  schoolId,
  examId,
  examSubjectId,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!examId) {
    const error = new Error("Exam ID is required.");
    error.code = "EXAM_REQUIRED";
    throw error;
  }

  if (!examSubjectId) {
    const error = new Error("Exam subject ID is required.");
    error.code = "EXAM_SUBJECT_REQUIRED";
    throw error;
  }

  const examResult = await pool.query(
    `
    SELECT id
    FROM "Exam"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [examId, schoolId],
  );

  if (examResult.rows.length === 0) {
    const error = new Error("Exam not found.");
    error.code = "EXAM_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    DELETE FROM "ExamSubject"
    WHERE id = $1
      AND "examId" = $2
    RETURNING
      id,
      "examId",
      "classSubjectId",
      "createdAt",
      "updatedAt"
    `,
    [examSubjectId, examId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Exam subject assignment not found.");
    error.code = "EXAM_SUBJECT_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}
