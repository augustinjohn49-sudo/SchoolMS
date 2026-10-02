import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

export async function createExamResult({
  schoolId,
  studentId,
  examSubjectId,
  marks,
  maxMarks,
  remarks = null,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!studentId) {
    const error = new Error("Student ID is required.");
    error.code = "STUDENT_REQUIRED";
    throw error;
  }

  if (!examSubjectId) {
    const error = new Error("Exam subject ID is required.");
    error.code = "EXAM_SUBJECT_REQUIRED";
    throw error;
  }

  if (marks === undefined || marks === null || marks === "") {
    const error = new Error("Marks are required.");
    error.code = "MARKS_REQUIRED";
    throw error;
  }

  if (maxMarks === undefined || maxMarks === null || maxMarks === "") {
    const error = new Error("Maximum marks are required.");
    error.code = "MAX_MARKS_REQUIRED";
    throw error;
  }

  const numericMarks = Number(marks);
  const numericMaxMarks = Number(maxMarks);

  if (!Number.isFinite(numericMarks)) {
    const error = new Error("Marks must be a valid number.");
    error.code = "INVALID_MARKS";
    throw error;
  }

  if (!Number.isFinite(numericMaxMarks)) {
    const error = new Error("Maximum marks must be a valid number.");
    error.code = "INVALID_MAX_MARKS";
    throw error;
  }

  if (numericMarks < 0) {
    const error = new Error("Marks cannot be negative.");
    error.code = "NEGATIVE_MARKS";
    throw error;
  }

  if (numericMaxMarks <= 0) {
    const error = new Error("Maximum marks must be greater than zero.");
    error.code = "INVALID_MAX_MARKS";
    throw error;
  }

  if (numericMarks > numericMaxMarks) {
    const error = new Error("Marks cannot exceed maximum marks.");
    error.code = "MARKS_EXCEED_MAX";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const studentResult = await client.query(
      `
      SELECT
        id,
        "schoolId",
        "admissionNumber",
        "firstName",
        "middleName",
        "lastName",
        status
      FROM "Student"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
      `,
      [studentId, schoolId],
    );

    if (studentResult.rows.length === 0) {
      const error = new Error("Student not found.");
      error.code = "STUDENT_NOT_FOUND";
      throw error;
    }

    const student = studentResult.rows[0];

    const examSubjectResult = await client.query(
      `
      SELECT
        es.id,
        es."examId",
        es."classSubjectId",
        e."schoolId",
        e."academicYearId",
        e."termId",
        e.name AS "examName",
        e.status AS "examStatus",
        c.id AS "classId",
        c.name AS "className",
        s.id AS "subjectId",
        s.name AS "subjectName",
        s.code AS "subjectCode"
      FROM "ExamSubject" es
      INNER JOIN "Exam" e
        ON e.id = es."examId"
      INNER JOIN "ClassSubject" cs
        ON cs.id = es."classSubjectId"
      INNER JOIN "Class" c
        ON c.id = cs."classId"
      INNER JOIN "Subject" s
        ON s.id = cs."subjectId"
      WHERE es.id = $1
        AND e."schoolId" = $2
      LIMIT 1
      `,
      [examSubjectId, schoolId],
    );

    if (examSubjectResult.rows.length === 0) {
      const error = new Error("Exam subject not found.");
      error.code = "EXAM_SUBJECT_NOT_FOUND";
      throw error;
    }

    const examSubject = examSubjectResult.rows[0];

    const enrollmentResult = await client.query(
      `
        SELECT se.id
        FROM "StudentEnrollment" se
        INNER JOIN "ExamSubject" es
        ON es.id = $1
        INNER JOIN "ClassSubject" cs
        ON cs.id = es."classSubjectId"
        INNER JOIN "Exam" e
        ON e.id = es."examId"
        WHERE se."studentId" = $2
            AND se."academicYearId" = e."academicYearId"
            AND se."classId" = cs."classId"
            AND se.status IN ('ACTIVE', 'COMPLETED')
        LIMIT 1
        `,
      [examSubjectId, studentId],
    );

    if (enrollmentResult.rows.length === 0) {
      const error = new Error(
        "Student is not enrolled in the class for this exam subject and academic year.",
      );
      error.code = "STUDENT_ENROLLMENT_INVALID";
      throw error;
    }

    const existingResult = await client.query(
      `
      SELECT id
      FROM "ExamResult"
      WHERE "studentId" = $1
        AND "examSubjectId" = $2
      LIMIT 1
      `,
      [studentId, examSubjectId],
    );

    if (existingResult.rows.length > 0) {
      const error = new Error(
        "A result already exists for this student and exam subject.",
      );
      error.code = "EXAM_RESULT_EXISTS";
      throw error;
    }

    const examResultId = randomUUID();
    const now = new Date();

    const insertResult = await client.query(
      `
      INSERT INTO "ExamResult" (
        id,
        "studentId",
        "examSubjectId",
        marks,
        "maxMarks",
        remarks,
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        "studentId",
        "examSubjectId",
        marks,
        "maxMarks",
        remarks,
        "createdAt",
        "updatedAt"
      `,
      [
        examResultId,
        studentId,
        examSubjectId,
        numericMarks,
        numericMaxMarks,
        remarks,
        now,
        now,
      ],
    );

    await client.query("COMMIT");

    return {
      ...insertResult.rows[0],
      student,
      examSubject,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const duplicateError = new Error(
        "A result already exists for this student and exam subject.",
      );
      duplicateError.code = "EXAM_RESULT_EXISTS";
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function getExamResults({ schoolId, examId, studentId = null }) {
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

  const params = [examId, schoolId];

  let studentFilter = "";

  if (studentId) {
    params.push(studentId);
    studentFilter = `AND er."studentId" = $3`;
  }

  const result = await pool.query(
    `
    SELECT
      er.id,
      er."studentId",
      er."examSubjectId",
      er.marks,
      er."maxMarks",
      er.remarks,
      er."createdAt",
      er."updatedAt",

      st."admissionNumber",
      st."firstName",
      st."middleName",
      st."lastName",

      es."classSubjectId",

      c.id AS "classId",
      c.name AS "className",

      s.id AS "subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode"

    FROM "ExamResult" er

    INNER JOIN "Student" st
      ON st.id = er."studentId"

    INNER JOIN "ExamSubject" es
      ON es.id = er."examSubjectId"

    INNER JOIN "ClassSubject" cs
      ON cs.id = es."classSubjectId"

    INNER JOIN "Class" c
      ON c.id = cs."classId"

    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"

    INNER JOIN "Exam" e
      ON e.id = es."examId"

    WHERE e.id = $1
      AND e."schoolId" = $2
      AND st."schoolId" = $2
      ${studentFilter}

    ORDER BY st."lastName", st."firstName", s.name
    `,
    params,
  );

  return {
    exam: examResult.rows[0],
    results: result.rows,
  };
}

export async function getExamResultById({ schoolId, examId, examResultId }) {
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

  if (!examResultId) {
    const error = new Error("Exam result ID is required.");
    error.code = "EXAM_RESULT_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      er.id,
      er."studentId",
      er."examSubjectId",
      er.marks,
      er."maxMarks",
      er.remarks,
      er."createdAt",
      er."updatedAt",

      st."admissionNumber",
      st."firstName",
      st."middleName",
      st."lastName",

      e.id AS "examId",
      e.name AS "examName",
      e."academicYearId",
      e."termId",
      e.status AS "examStatus",

      c.id AS "classId",
      c.name AS "className",

      s.id AS "subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode"

    FROM "ExamResult" er

    INNER JOIN "Student" st
      ON st.id = er."studentId"

    INNER JOIN "ExamSubject" es
      ON es.id = er."examSubjectId"

    INNER JOIN "Exam" e
      ON e.id = es."examId"

    INNER JOIN "ClassSubject" cs
      ON cs.id = es."classSubjectId"

    INNER JOIN "Class" c
      ON c.id = cs."classId"

    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"

    WHERE er.id = $1
      AND e.id = $2
      AND e."schoolId" = $3
      AND st."schoolId" = $3

    LIMIT 1
    `,
    [examResultId, examId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Exam result not found.");
    error.code = "EXAM_RESULT_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function updateExamResult({
  schoolId,
  examId,
  examResultId,
  marks,
  maxMarks,
  remarks,
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

  if (!examResultId) {
    const error = new Error("Exam result ID is required.");
    error.code = "EXAM_RESULT_REQUIRED";
    throw error;
  }

  if (marks === undefined && maxMarks === undefined && remarks === undefined) {
    const error = new Error("At least one field is required for update.");
    error.code = "NO_UPDATE_FIELDS";
    throw error;
  }

  const existingResult = await pool.query(
    `
    SELECT
      er.id,
      er."studentId",
      er."examSubjectId",
      er.marks,
      er."maxMarks",
      er.remarks
    FROM "ExamResult" er
    INNER JOIN "ExamSubject" es
      ON es.id = er."examSubjectId"
    INNER JOIN "Exam" e
      ON e.id = es."examId"
    INNER JOIN "Student" st
      ON st.id = er."studentId"
    WHERE er.id = $1
      AND e.id = $2
      AND e."schoolId" = $3
      AND st."schoolId" = $3
    LIMIT 1
    `,
    [examResultId, examId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Exam result not found.");
    error.code = "EXAM_RESULT_NOT_FOUND";
    throw error;
  }

  const existing = existingResult.rows[0];

  const enrollmentResult = await pool.query(
    `
  SELECT se.id
  FROM "StudentEnrollment" se
  INNER JOIN "ExamSubject" es
    ON es.id = $1
  INNER JOIN "ClassSubject" cs
    ON cs.id = es."classSubjectId"
  INNER JOIN "Exam" e
    ON e.id = es."examId"
  WHERE se."studentId" = $2
    AND se."academicYearId" = e."academicYearId"
    AND se."classId" = cs."classId"
    AND se.status IN ('ACTIVE', 'COMPLETED')
  LIMIT 1
  `,
    [existing.examSubjectId, existing.studentId],
  );

  if (enrollmentResult.rows.length === 0) {
    const error = new Error(
      "Student is not enrolled in the class for this exam subject and academic year.",
    );
    error.code = "STUDENT_ENROLLMENT_INVALID";
    throw error;
  }

  const numericMarks =
    marks === undefined ? Number(existing.marks) : Number(marks);

  const numericMaxMarks =
    maxMarks === undefined ? Number(existing.maxMarks) : Number(maxMarks);

  if (!Number.isFinite(numericMarks)) {
    const error = new Error("Marks must be a valid number.");
    error.code = "INVALID_MARKS";
    throw error;
  }

  if (!Number.isFinite(numericMaxMarks)) {
    const error = new Error("Maximum marks must be a valid number.");
    error.code = "INVALID_MAX_MARKS";
    throw error;
  }

  if (numericMarks < 0) {
    const error = new Error("Marks cannot be negative.");
    error.code = "NEGATIVE_MARKS";
    throw error;
  }

  if (numericMaxMarks <= 0) {
    const error = new Error("Maximum marks must be greater than zero.");
    error.code = "INVALID_MAX_MARKS";
    throw error;
  }

  if (numericMarks > numericMaxMarks) {
    const error = new Error("Marks cannot exceed maximum marks.");
    error.code = "MARKS_EXCEED_MAX";
    throw error;
  }

  const updatedRemarks = remarks === undefined ? existing.remarks : remarks;

  const result = await pool.query(
    `
    UPDATE "ExamResult"
    SET
      marks = $1,
      "maxMarks" = $2,
      remarks = $3,
      "updatedAt" = $4
    WHERE id = $5
    RETURNING
      id,
      "studentId",
      "examSubjectId",
      marks,
      "maxMarks",
      remarks,
      "createdAt",
      "updatedAt"
    `,
    [numericMarks, numericMaxMarks, updatedRemarks, new Date(), examResultId],
  );

  return result.rows[0];
}

export async function deleteExamResult({ schoolId, examId, examResultId }) {
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

  if (!examResultId) {
    const error = new Error("Exam result ID is required.");
    error.code = "EXAM_RESULT_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `
    DELETE FROM "ExamResult" er
    USING "ExamSubject" es, "Exam" e, "Student" st
    WHERE er.id = $1
      AND er."examSubjectId" = es.id
      AND es."examId" = e.id
      AND er."studentId" = st.id
      AND e.id = $2
      AND e."schoolId" = $3
      AND st."schoolId" = $3
    RETURNING
      er.id,
      er."studentId",
      er."examSubjectId",
      er.marks,
      er."maxMarks",
      er.remarks,
      er."createdAt",
      er."updatedAt"
    `,
    [examResultId, examId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Exam result not found.");
    error.code = "EXAM_RESULT_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}
