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
