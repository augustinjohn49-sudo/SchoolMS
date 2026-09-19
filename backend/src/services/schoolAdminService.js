import pool from "../config/prisma.js";
import { createUser } from "./userService.js";

export async function createSchoolAdmin({
  firstName,
  lastName,
  email,
  password,
  schoolId,
}) {
  // Verify that the school exists.
  const schoolResult = await pool.query(
    `
    SELECT
      id,
      name,
      code,
      status
    FROM "School"
    WHERE id = $1
    LIMIT 1
    `,
    [schoolId],
  );

  const school = schoolResult.rows[0];

  if (!school) {
    const error = new Error("School not found.");
    error.code = "SCHOOL_NOT_FOUND";
    throw error;
  }

  // Do not allow administrators to be assigned to inactive schools.
  if (school.status !== "ACTIVE") {
    const error = new Error(
      "Cannot create an administrator for an inactive school.",
    );
    error.code = "SCHOOL_INACTIVE";
    throw error;
  }

  // Always create this account specifically as SCHOOL_ADMIN.
  return createUser({
    firstName,
    lastName,
    email,
    password,
    role: "SCHOOL_ADMIN",
    schoolId: school.id,
  });
}
