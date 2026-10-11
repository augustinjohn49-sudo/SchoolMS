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

export async function getStudentsBySchool({
  schoolId,
  search,
  status,
  page = 1,
  limit = 20,
  sortBy = "lastName",
  sortOrder = "asc",
}) {
  const allowedSortFields = {
    lastName: 's."lastName"',
    firstName: 's."firstName"',
    admissionNumber: 's."admissionNumber"',
    createdAt: 's."createdAt"',
  };

  const sortColumn = allowedSortFields[sortBy] || allowedSortFields.lastName;
  const sortDirection = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
   FROM "Student" s
   WHERE s."schoolId" = $1
     AND (
       $2::text IS NULL
       OR s."admissionNumber" ILIKE '%' || $2 || '%'
       OR s."firstName" ILIKE '%' || $2 || '%'
       OR s."middleName" ILIKE '%' || $2 || '%'
       OR s."lastName" ILIKE '%' || $2 || '%'
     )
     AND (
       $3::"StudentStatus" IS NULL
       OR s.status = $3::"StudentStatus"
     )`,
    [schoolId, search ?? null, status ?? null],
  );

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
    
      FROM "Student" s

    WHERE s."schoolId" = $1
      AND (
        $2::text IS NULL
        OR s."admissionNumber" ILIKE '%' || $2 || '%'
        OR s."firstName" ILIKE '%' || $2 || '%'
        OR s."middleName" ILIKE '%' || $2 || '%'
        OR s."lastName" ILIKE '%' || $2 || '%'
      )
      AND (
        $3::"StudentStatus" IS NULL
        OR s.status = $3::"StudentStatus"
      )
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $4
    OFFSET $5`,
    [schoolId, search ?? null, status ?? null, limit, (page - 1) * limit],
  );

  const total = countResult.rows[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
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

  const enrollmentResult = await pool.query(
    `SELECT id
   FROM "StudentEnrollment"
   WHERE "studentId" = $1
   LIMIT 1`,
    [studentId],
  );

  if (enrollmentResult.rows.length > 0) {
    const error = new Error(
      "This student cannot be deleted because enrollment history exists. Change the student status instead.",
    );
    error.statusCode = 400;
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

export async function bulkUpdateStudentStatus({
  schoolId,
  studentIds,
  status,
}) {
  const result = await pool.query(
    `UPDATE "Student"
   SET
     status = $1::"StudentStatus",
     "updatedAt" = NOW()
   WHERE "schoolId" = $2
     AND id = ANY($3::text[])
   RETURNING id`,
    [status, schoolId, studentIds],
  );

  return {
    updatedCount: result.rowCount,
    updatedStudentIds: result.rows.map((student) => student.id),
  };
}

export async function admitStudent({
  schoolId,
  student,
  guardian,
  relationship,
  isPrimary = true,
  isEmergencyContact = true,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify that the school exists.
    const schoolResult = await client.query(
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

    // Check for a duplicate student admission number.
    const duplicateStudent = await client.query(
      `SELECT id
       FROM "Student"
       WHERE "schoolId" = $1
         AND "admissionNumber" = $2
       LIMIT 1`,
      [schoolId, student.admissionNumber],
    );

    if (duplicateStudent.rows.length > 0) {
      const error = new Error(
        "A student with this admission number already exists in this school.",
      );
      error.statusCode = 409;
      throw error;
    }

    // Prevent accidental duplicate guardians within the same school.
    const duplicateGuardian = await client.query(
      `SELECT id
       FROM "ParentGuardian"
       WHERE "schoolId" = $1
         AND phone = $2
       LIMIT 1`,
      [schoolId, guardian.phone],
    );

    if (duplicateGuardian.rows.length > 0) {
      const error = new Error(
        "A parent or guardian with this phone number already exists in this school. Find the existing guardian and link them to this student instead.",
      );
      error.statusCode = 409;
      throw error;
    }

    const validRelationships = [
      "FATHER",
      "MOTHER",
      "GUARDIAN",
      "GRANDPARENT",
      "SIBLING",
      "UNCLE",
      "AUNT",
      "OTHER",
    ];

    if (!validRelationships.includes(relationship)) {
      const error = new Error("Invalid guardian relationship.");
      error.statusCode = 400;
      throw error;
    }

    // Create the student.
    const studentId = randomUUID();

    const studentResult = await client.query(
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
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
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
        student.admissionNumber,
        student.firstName,
        student.middleName || null,
        student.lastName,
        student.dateOfBirth || null,
        student.gender,
        student.phone || null,
        student.email || null,
        student.address || null,
      ],
    );

    // Create the parent or guardian.
    const guardianId = randomUUID();

    const guardianResult = await client.query(
      `INSERT INTO "ParentGuardian" (
        id,
        "schoolId",
        "userId",
        "firstName",
        "middleName",
        "lastName",
        phone,
        "alternatePhone",
        email,
        address,
        occupation,
        status,
        "updatedAt"
      )
      VALUES (
        $1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10,
        'ACTIVE', NOW()
      )
      RETURNING
        id,
        "schoolId",
        "firstName",
        "middleName",
        "lastName",
        phone,
        "alternatePhone",
        email,
        address,
        occupation,
        status,
        "createdAt",
        "updatedAt"`,
      [
        guardianId,
        schoolId,
        guardian.firstName,
        guardian.middleName || null,
        guardian.lastName,
        guardian.phone,
        guardian.alternatePhone || null,
        guardian.email || null,
        guardian.address || null,
        guardian.occupation || null,
      ],
    );

    // Link the guardian to the student.
    await client.query(
      `INSERT INTO "StudentGuardian" (
        id,
        "studentId",
        "parentGuardianId",
        relationship,
        "isPrimary",
        "isEmergencyContact",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        randomUUID(),
        studentId,
        guardianId,
        relationship,
        isPrimary,
        isEmergencyContact,
      ],
    );

    await client.query("COMMIT");

    return {
      student: studentResult.rows[0],
      guardian: guardianResult.rows[0],
      relationship,
      isPrimary,
      isEmergencyContact,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    // Handle database uniqueness conflicts safely.
    if (error.code === "23505") {
      const conflictError = new Error(
        "A record with the supplied unique details already exists.",
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  } finally {
    client.release();
  }
}
