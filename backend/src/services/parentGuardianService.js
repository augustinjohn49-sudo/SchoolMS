import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

export async function createParentGuardian({
  schoolId,
  userId = null,
  firstName,
  middleName = null,
  lastName,
  phone,
  alternatePhone = null,
  email = null,
  address = null,
  occupation = null,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!firstName || !lastName || !phone) {
    const error = new Error("First name, last name, and phone are required.");
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  if (userId) {
    const userResult = await pool.query(
      `
      SELECT id, "schoolId", role
      FROM "User"
      WHERE id = $1
      `,
      [userId],
    );

    if (userResult.rows.length === 0) {
      const error = new Error("User not found.");
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    const user = userResult.rows[0];

    if (user.schoolId !== schoolId) {
      const error = new Error("User does not belong to this school.");
      error.code = "USER_SCHOOL_MISMATCH";
      throw error;
    }

    if (user.role !== "PARENT") {
      const error = new Error("User must have the PARENT role.");
      error.code = "INVALID_USER_ROLE";
      throw error;
    }
  }

  const existingGuardian = await pool.query(
    `
    SELECT id
    FROM "ParentGuardian"
    WHERE "schoolId" = $1
      AND phone = $2
    LIMIT 1
    `,
    [schoolId, phone],
  );

  if (existingGuardian.rows.length > 0) {
    const error = new Error(
      "A parent or guardian with this phone number already exists.",
    );
    error.code = "GUARDIAN_PHONE_EXISTS";
    throw error;
  }

  if (userId) {
    const existingUserGuardian = await pool.query(
      `
      SELECT id
      FROM "ParentGuardian"
      WHERE "userId" = $1
      LIMIT 1
      `,
      [userId],
    );

    if (existingUserGuardian.rows.length > 0) {
      const error = new Error(
        "This user is already linked to a parent or guardian.",
      );
      error.code = "USER_ALREADY_GUARDIAN";
      throw error;
    }
  }

  const guardianId = randomUUID();

  const result = await pool.query(
    `
    INSERT INTO "ParentGuardian" (
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
      $9,
      $10,
      $11,
      'ACTIVE',
      NOW(),
      NOW()
    )
    RETURNING *
    `,
    [
      guardianId,
      schoolId,
      userId,
      firstName,
      middleName,
      lastName,
      phone,
      alternatePhone,
      email,
      address,
      occupation,
    ],
  );

  return result.rows[0];
}

export async function getParentGuardianById({ schoolId, parentGuardianId }) {
  const result = await pool.query(
    `
    SELECT
      pg.*,
      u.email AS "userEmail",
      u.role AS "userRole",
      u.status AS "userStatus"
    FROM "ParentGuardian" pg
    LEFT JOIN "User" u
      ON u.id = pg."userId"
    WHERE pg.id = $1
      AND pg."schoolId" = $2
    `,
    [parentGuardianId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Parent or guardian not found.");
    error.code = "GUARDIAN_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function getParentGuardians({
  schoolId,
  status = null,
  search = null,
}) {
  const conditions = [`pg."schoolId" = $1`];
  const values = [schoolId];

  if (status) {
    values.push(status);
    conditions.push(`pg.status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);

    conditions.push(`
      (
        pg."firstName" ILIKE $${values.length}
        OR pg."middleName" ILIKE $${values.length}
        OR pg."lastName" ILIKE $${values.length}
        OR pg.phone ILIKE $${values.length}
        OR pg.email ILIKE $${values.length}
      )
    `);
  }

  const result = await pool.query(
    `
    SELECT
      pg.*,
      COUNT(sg.id)::int AS "studentCount"
    FROM "ParentGuardian" pg
    LEFT JOIN "StudentGuardian" sg
      ON sg."parentGuardianId" = pg.id
    WHERE ${conditions.join(" AND ")}
    GROUP BY pg.id
    ORDER BY pg."firstName", pg."lastName"
    `,
    values,
  );

  return result.rows;
}

export async function updateParentGuardian({
  schoolId,
  parentGuardianId,
  firstName,
  middleName = null,
  lastName,
  phone,
  alternatePhone = null,
  email = null,
  address = null,
  occupation = null,
}) {
  if (!firstName || !lastName || !phone) {
    const error = new Error("First name, last name, and phone are required.");
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  const existingGuardian = await pool.query(
    `
    SELECT id
    FROM "ParentGuardian"
    WHERE "schoolId" = $1
      AND phone = $2
      AND id <> $3
    LIMIT 1
    `,
    [schoolId, phone, parentGuardianId],
  );

  if (existingGuardian.rows.length > 0) {
    const error = new Error(
      "Another parent or guardian already uses this phone number.",
    );
    error.code = "GUARDIAN_PHONE_EXISTS";
    throw error;
  }

  const result = await pool.query(
    `
    UPDATE "ParentGuardian"
    SET
      "firstName" = $1,
      "middleName" = $2,
      "lastName" = $3,
      phone = $4,
      "alternatePhone" = $5,
      email = $6,
      address = $7,
      occupation = $8,
      "updatedAt" = NOW()
    WHERE id = $9
      AND "schoolId" = $10
    RETURNING *
    `,
    [
      firstName,
      middleName,
      lastName,
      phone,
      alternatePhone,
      email,
      address,
      occupation,
      parentGuardianId,
      schoolId,
    ],
  );

  if (result.rows.length === 0) {
    const error = new Error("Parent or guardian not found.");
    error.code = "GUARDIAN_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function deactivateParentGuardian({ schoolId, parentGuardianId }) {
  const result = await pool.query(
    `
    UPDATE "ParentGuardian"
    SET
      status = 'INACTIVE',
      "updatedAt" = NOW()
    WHERE id = $1
      AND "schoolId" = $2
    RETURNING *
    `,
    [parentGuardianId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Parent or guardian not found.");
    error.code = "GUARDIAN_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function linkGuardianToStudent({
  schoolId,
  parentGuardianId,
  studentId,
  relationship,
  isPrimary = false,
  isEmergencyContact = false,
}) {
  if (!relationship) {
    const error = new Error("Guardian relationship is required.");
    error.code = "RELATIONSHIP_REQUIRED";
    throw error;
  }

  const guardianResult = await pool.query(
    `
    SELECT id
    FROM "ParentGuardian"
    WHERE id = $1
      AND "schoolId" = $2
      AND status = 'ACTIVE'
    `,
    [parentGuardianId, schoolId],
  );

  if (guardianResult.rows.length === 0) {
    const error = new Error("Active parent or guardian not found.");
    error.code = "GUARDIAN_NOT_FOUND";
    throw error;
  }

  const studentResult = await pool.query(
    `
    SELECT id
    FROM "Student"
    WHERE id = $1
      AND "schoolId" = $2
    `,
    [studentId, schoolId],
  );

  if (studentResult.rows.length === 0) {
    const error = new Error("Student not found.");
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  const existingRelationship = await pool.query(
    `
    SELECT id
    FROM "StudentGuardian"
    WHERE "studentId" = $1
      AND "parentGuardianId" = $2
    `,
    [studentId, parentGuardianId],
  );

  if (existingRelationship.rows.length > 0) {
    const error = new Error("This guardian is already linked to this student.");
    error.code = "RELATIONSHIP_EXISTS";
    throw error;
  }

  if (isPrimary) {
    await pool.query(
      `
      UPDATE "StudentGuardian"
      SET
        "isPrimary" = false,
        "updatedAt" = NOW()
      WHERE "studentId" = $1
        AND "isPrimary" = true
      `,
      [studentId],
    );
  }

  const relationshipId = randomUUID();

  const result = await pool.query(
    `
    INSERT INTO "StudentGuardian" (
      id,
      "studentId",
      "parentGuardianId",
      relationship,
      "isPrimary",
      "isEmergencyContact",
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
    [
      relationshipId,
      studentId,
      parentGuardianId,
      relationship,
      isPrimary,
      isEmergencyContact,
    ],
  );

  return result.rows[0];
}

export async function unlinkGuardianFromStudent({
  schoolId,
  parentGuardianId,
  studentId,
}) {
  const result = await pool.query(
    `
    DELETE FROM "StudentGuardian" sg
    USING "ParentGuardian" pg, "Student" s
    WHERE sg."parentGuardianId" = pg.id
      AND sg."studentId" = s.id
      AND sg."parentGuardianId" = $1
      AND sg."studentId" = $2
      AND pg."schoolId" = $3
      AND s."schoolId" = $3
    RETURNING sg.*
    `,
    [parentGuardianId, studentId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Guardian-student relationship not found.");
    error.code = "RELATIONSHIP_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function getStudentGuardians({ schoolId, studentId }) {
  const studentResult = await pool.query(
    `
    SELECT id
    FROM "Student"
    WHERE id = $1
      AND "schoolId" = $2
    `,
    [studentId, schoolId],
  );

  if (studentResult.rows.length === 0) {
    const error = new Error("Student not found.");
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      sg.id AS "relationshipId",
      sg.relationship,
      sg."isPrimary",
      sg."isEmergencyContact",
      pg.id AS "parentGuardianId",
      pg."firstName",
      pg."middleName",
      pg."lastName",
      pg.phone,
      pg."alternatePhone",
      pg.email,
      pg.address,
      pg.occupation,
      pg.status
    FROM "StudentGuardian" sg
    INNER JOIN "ParentGuardian" pg
      ON pg.id = sg."parentGuardianId"
    WHERE sg."studentId" = $1
      AND pg."schoolId" = $2
    ORDER BY sg."isPrimary" DESC, pg."firstName", pg."lastName"
    `,
    [studentId, schoolId],
  );

  return result.rows;
}

export async function getGuardianStudents({ schoolId, parentGuardianId }) {
  const guardianResult = await pool.query(
    `
    SELECT id
    FROM "ParentGuardian"
    WHERE id = $1
      AND "schoolId" = $2
    `,
    [parentGuardianId, schoolId],
  );

  if (guardianResult.rows.length === 0) {
    const error = new Error("Parent or guardian not found.");
    error.code = "GUARDIAN_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      sg.id AS "relationshipId",
      sg.relationship,
      sg."isPrimary",
      sg."isEmergencyContact",
      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",
      s."dateOfBirth",
      s.gender,
      s.phone,
      s.email,
      s.status AS "studentStatus"
    FROM "StudentGuardian" sg
    INNER JOIN "Student" s
      ON s.id = sg."studentId"
    WHERE sg."parentGuardianId" = $1
      AND s."schoolId" = $2
    ORDER BY s."firstName", s."lastName"
    `,
    [parentGuardianId, schoolId],
  );

  return result.rows;
}

export const activateParentGuardian = async ({
  schoolId,
  parentGuardianId,
}) => {
  const result = await pool.query(
    `
    UPDATE "ParentGuardian" pg
    SET
      "status" = 'ACTIVE',
      "updatedAt" = NOW()
    WHERE pg."id" = $1
      AND pg."schoolId" = $2
      AND pg."status" = 'INACTIVE'
    RETURNING
      pg."id",
      pg."schoolId",
      pg."userId",
      pg."firstName",
      pg."middleName",
      pg."lastName",
      pg."phone",
      pg."alternatePhone",
      pg."email",
      pg."address",
      pg."occupation",
      pg."status",
      pg."createdAt",
      pg."updatedAt"
    `,
    [parentGuardianId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Inactive parent or guardian not found.");
    error.code = "GUARDIAN_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
};
