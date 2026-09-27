import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

export async function createTeacherClassSubject({
  schoolId,
  staffId,
  classSubjectId,
}) {
  // Verify that the staff member belongs to this school
  // and is actually a teacher.
  const staffResult = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      "firstName",
      "lastName",
      position,
      status
    FROM "Staff"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [staffId, schoolId],
  );

  const staff = staffResult.rows[0];

  if (!staff) {
    const error = new Error("Staff member not found.");
    error.code = "STAFF_NOT_FOUND";
    throw error;
  }

  if (staff.position !== "TEACHER") {
    const error = new Error(
      "Only staff members with the TEACHER position can be assigned to a class subject.",
    );

    error.code = "STAFF_NOT_TEACHER";
    throw error;
  }

  if (staff.status !== "ACTIVE") {
    const error = new Error(
      "Only active teachers can be assigned to a class subject.",
    );

    error.code = "STAFF_INACTIVE";
    throw error;
  }

  // Verify that the class-subject assignment belongs to this school.
  const classSubjectResult = await pool.query(
    `
    SELECT
      cs.id,
      cs."classId",
      cs."subjectId",
      c.name AS "className",
      s.name AS "subjectName",
      s.code AS "subjectCode",
      s.status AS "subjectStatus",
      ay."schoolId"
    FROM "ClassSubject" cs
    INNER JOIN "Class" c
      ON c.id = cs."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    WHERE cs.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [classSubjectId, schoolId],
  );

  const classSubject = classSubjectResult.rows[0];

  if (!classSubject) {
    const error = new Error("Class-subject assignment not found.");
    error.code = "CLASS_SUBJECT_NOT_FOUND";
    throw error;
  }

  // Do not assign an inactive subject.
  if (classSubject.subjectStatus !== "ACTIVE") {
    const error = new Error(
      "Only active subjects can have a teacher assigned.",
    );

    error.code = "SUBJECT_INACTIVE";
    throw error;
  }

  // Prevent duplicate teacher assignment.
  const existingAssignment = await pool.query(
    `
    SELECT id
    FROM "TeacherClassSubject"
    WHERE "staffId" = $1
      AND "classSubjectId" = $2
    LIMIT 1
    `,
    [staffId, classSubjectId],
  );

  if (existingAssignment.rows.length > 0) {
    const error = new Error(
      "This teacher is already assigned to this class subject.",
    );

    error.code = "TEACHER_CLASS_SUBJECT_EXISTS";
    throw error;
  }

  const assignmentId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "TeacherClassSubject"
    (
      id,
      "staffId",
      "classSubjectId",
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5)
    RETURNING
      id,
      "staffId",
      "classSubjectId",
      "createdAt",
      "updatedAt"
    `,
    [assignmentId, staffId, classSubjectId, now, now],
  );

  return result.rows[0];
}

export async function getTeacherClassSubjects({ schoolId, staffId }) {
  // Verify that the staff member belongs to the school.
  const staffResult = await pool.query(
    `
    SELECT
      id,
      "firstName",
      "lastName",
      position,
      status
    FROM "Staff"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [staffId, schoolId],
  );

  const staff = staffResult.rows[0];

  if (!staff) {
    const error = new Error("Staff member not found.");
    error.code = "STAFF_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      tcs.id,
      tcs."staffId",
      tcs."classSubjectId",
      c.id AS "classId",
      c.name AS "className",
      ay.id AS "academicYearId",
      ay.name AS "academicYearName",
      s.id AS "subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode",
      s.status AS "subjectStatus",
      tcs."createdAt",
      tcs."updatedAt"
    FROM "TeacherClassSubject" tcs
    INNER JOIN "ClassSubject" cs
      ON cs.id = tcs."classSubjectId"
    INNER JOIN "Class" c
      ON c.id = cs."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    WHERE tcs."staffId" = $1
      AND ay."schoolId" = $2
    ORDER BY c.name ASC, s.name ASC
    `,
    [staffId, schoolId],
  );

  return result.rows;
}

export async function getTeacherClassSubjectById({ schoolId, assignmentId }) {
  const result = await pool.query(
    `
    SELECT
      tcs.id,
      tcs."staffId",
      st."firstName" AS "teacherFirstName",
      st."lastName" AS "teacherLastName",
      tcs."classSubjectId",
      c.id AS "classId",
      c.name AS "className",
      ay.id AS "academicYearId",
      ay.name AS "academicYearName",
      s.id AS "subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode",
      s.status AS "subjectStatus",
      tcs."createdAt",
      tcs."updatedAt"
    FROM "TeacherClassSubject" tcs
    INNER JOIN "Staff" st
      ON st.id = tcs."staffId"
    INNER JOIN "ClassSubject" cs
      ON cs.id = tcs."classSubjectId"
    INNER JOIN "Class" c
      ON c.id = cs."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    WHERE tcs.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [assignmentId, schoolId],
  );

  const assignment = result.rows[0];

  if (!assignment) {
    const error = new Error("Teacher-class-subject assignment not found.");

    error.code = "TEACHER_CLASS_SUBJECT_NOT_FOUND";
    throw error;
  }

  return assignment;
}

export async function deleteTeacherClassSubject({ schoolId, assignmentId }) {
  // Verify that the assignment belongs to the school.
  const existingResult = await pool.query(
    `
    SELECT
      tcs.id
    FROM "TeacherClassSubject" tcs
    INNER JOIN "ClassSubject" cs
      ON cs.id = tcs."classSubjectId"
    INNER JOIN "Class" c
      ON c.id = cs."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE tcs.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [assignmentId, schoolId],
  );

  const existingAssignment = existingResult.rows[0];

  if (!existingAssignment) {
    const error = new Error("Teacher-class-subject assignment not found.");

    error.code = "TEACHER_CLASS_SUBJECT_NOT_FOUND";
    throw error;
  }

  await pool.query(
    `
    DELETE FROM "TeacherClassSubject"
    WHERE id = $1
    `,
    [assignmentId],
  );

  return {
    id: assignmentId,
  };
}
