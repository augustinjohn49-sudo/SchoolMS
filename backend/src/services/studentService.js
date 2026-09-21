import pool from "../config/prisma.js";
import { randomUUID } from "crypto";

export async function createStudent({
  schoolId,
  admissionNumber,
  firstName,
  middleName,
  lastName,
  dateOfBirth,
  gender,
  phone,
  email,
  address,
}) {
  // Verify that the school exists.
  const schoolResult = await pool.query(
    `SELECT id
     FROM "School"
     WHERE id = $1
     LIMIT 1`,
    [schoolId],
  );

  if (schoolResult.rows.length === 0) {
    const error = new Error("School not found.");
    error.statusCode = 404;
    throw error;
  }

  // Check for duplicate admission number within the same school.
  const duplicateResult = await pool.query(
    `SELECT id
     FROM "Student"
     WHERE "schoolId" = $1
       AND "admissionNumber" = $2
     LIMIT 1`,
    [schoolId, admissionNumber],
  );

  if (duplicateResult.rows.length > 0) {
    const error = new Error(
      "A student with this admission number already exists in this school.",
    );

    error.statusCode = 409;
    throw error;
  }

  const studentId = randomUUID();

  const result = await pool.query(
    `INSERT INTO "Student" (
      id,
      "schoolId",
      "admissionNumber",
      "firstName",
      "middleName",
      "lastName",
      "dateOfBirth",
      gender,
      phone,
      email,
      address,
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
      $9,
      $10,
      $11,
      NOW()
    )
    RETURNING
      id,
      "schoolId",
      "admissionNumber",
      "firstName",
      "middleName",
      "lastName",
      "dateOfBirth",
      gender,
      phone,
      email,
      address,
      status,
      "createdAt",
      "updatedAt"`,
    [
      studentId,
      schoolId,
      admissionNumber,
      firstName,
      middleName || null,
      lastName,
      dateOfBirth || null,
      gender,
      phone || null,
      email || null,
      address || null,
    ],
  );

  return result.rows[0];
}

export async function getStudentsBySchool({ schoolId }) {
  const result = await pool.query(
    `SELECT
      id,
      "schoolId",
      "admissionNumber",
      "firstName",
      "middleName",
      "lastName",
      "dateOfBirth",
      gender,
      phone,
      email,
      address,
      status,
      "createdAt",
      "updatedAt"
    FROM "Student"
    WHERE "schoolId" = $1
    ORDER BY "lastName" ASC, "firstName" ASC`,
    [schoolId],
  );

  return result.rows;
}

export async function getStudentById({ schoolId, studentId }) {
  const result = await pool.query(
    `SELECT
      id,
      "schoolId",
      "admissionNumber",
      "firstName",
      "middleName",
      "lastName",
      "dateOfBirth",
      gender,
      phone,
      email,
      address,
      status,
      "createdAt",
      "updatedAt"
    FROM "Student"
    WHERE id = $1
    LIMIT 1`,
    [studentId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Student not found.");
    error.statusCode = 404;
    throw error;
  }

  const student = result.rows[0];

  if (student.schoolId !== schoolId) {
    const error = new Error("You do not have access to this student.");
    error.statusCode = 403;
    throw error;
  }

  return student;
}

export async function updateStudent({
  schoolId,
  studentId,
  firstName,
  middleName,
  lastName,
  dateOfBirth,
  gender,
  phone,
  email,
  address,
  status,
}) {
  const existingResult = await pool.query(
    `SELECT
      id,
      "schoolId"
    FROM "Student"
    WHERE id = $1
    LIMIT 1`,
    [studentId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Student not found.");
    error.statusCode = 404;
    throw error;
  }

  if (existingResult.rows[0].schoolId !== schoolId) {
    const error = new Error("You do not have access to this student.");
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `UPDATE "Student"
     SET
       "firstName" = COALESCE($1, "firstName"),
       "middleName" = COALESCE($2, "middleName"),
       "lastName" = COALESCE($3, "lastName"),
       "dateOfBirth" = COALESCE($4, "dateOfBirth"),
       gender = COALESCE($5, gender),
       phone = COALESCE($6, phone),
       email = COALESCE($7, email),
       address = COALESCE($8, address),
       status = COALESCE($9, status),
       "updatedAt" = NOW()
     WHERE id = $10
     RETURNING
       id,
       "schoolId",
       "admissionNumber",
       "firstName",
       "middleName",
       "lastName",
       "dateOfBirth",
       gender,
       phone,
       email,
       address,
       status,
       "createdAt",
       "updatedAt"`,
    [
      firstName ?? null,
      middleName ?? null,
      lastName ?? null,
      dateOfBirth ?? null,
      gender ?? null,
      phone ?? null,
      email ?? null,
      address ?? null,
      status ?? null,
      studentId,
    ],
  );

  return result.rows[0];
}

export async function deleteStudent({ schoolId, studentId }) {
  const existingResult = await pool.query(
    `SELECT
      id,
      "schoolId"
    FROM "Student"
    WHERE id = $1
    LIMIT 1`,
    [studentId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Student not found.");
    error.statusCode = 404;
    throw error;
  }

  if (existingResult.rows[0].schoolId !== schoolId) {
    const error = new Error("You do not have access to this student.");
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `DELETE FROM "Student"
     WHERE id = $1
     RETURNING
       id,
       "schoolId",
       "admissionNumber",
       "firstName",
       "middleName",
       "lastName",
       "dateOfBirth",
       gender,
       phone,
       email,
       address,
       status,
       "createdAt",
       "updatedAt"`,
    [studentId],
  );

  return result.rows[0];
}
