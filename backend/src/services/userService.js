import { randomUUID } from "crypto";

import pool from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";

export async function findUserByEmail(email) {
  const result = await pool.query(
    `
    SELECT
      id,
      "schoolId",
      "firstName",
      "lastName",
      email,
      "passwordHash",
      role,
      status,
      "createdAt",
      "updatedAt"
    FROM "User"
    WHERE email = $1
    LIMIT 1
    `,
    [email],
  );

  return result.rows[0] || null;
}

export async function createUser({
  firstName,
  lastName,
  email,
  password,
  role = "SCHOOL_ADMIN",
  schoolId = null,
}) {
  // Prevent duplicate email addresses.
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    const error = new Error("A user with this email already exists.");
    error.code = "USER_EMAIL_EXISTS";
    throw error;
  }

  // School-based users must belong to a school.
  const schoolRoles = ["SCHOOL_ADMIN", "TEACHER", "STUDENT", "PARENT"];

  if (schoolRoles.includes(role) && !schoolId) {
    const error = new Error(`${role} must belong to a school.`);
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  // Super Admin is a system-level user.
  if (role === "SUPER_ADMIN" && schoolId) {
    const error = new Error("SUPER_ADMIN cannot belong to a school.");
    error.code = "SUPER_ADMIN_SCHOOL_INVALID";
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const userId = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "User"
    (
      id,
      "schoolId",
      "firstName",
      "lastName",
      email,
      "passwordHash",
      role,
      status,
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING
      id,
      "schoolId",
      "firstName",
      "lastName",
      email,
      role,
      status,
      "createdAt",
      "updatedAt"
    `,
    [
      userId,
      schoolId,
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      "ACTIVE",
      now,
      now,
    ],
  );

  return result.rows[0];
}
