import pool from "../config/prisma.js";

/**
 * Create a new staff member
 */
export async function createStaff({
  schoolId,
  userId,
  staffNumber,
  firstName,
  middleName,
  lastName,
  gender,
  dateOfBirth,
  phone,
  email,
  address,
  position,
  employmentType,
  dateJoined,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify school exists
    const schoolResult = await client.query(
      `
      SELECT id
      FROM "School"
      WHERE id = $1
      `,
      [schoolId],
    );

    if (schoolResult.rows.length === 0) {
      throw new Error("School not found.");
    }

    // Prevent duplicate staff number within the same school
    const existingStaff = await client.query(
      `
      SELECT id
      FROM "Staff"
      WHERE "schoolId" = $1
        AND "staffNumber" = $2
      `,
      [schoolId, staffNumber],
    );

    if (existingStaff.rows.length > 0) {
      throw new Error("A staff member with this staff number already exists.");
    }

    // If a user account is supplied, verify it
    if (userId) {
      const userResult = await client.query(
        `
        SELECT id, "schoolId"
        FROM "User"
        WHERE id = $1
        `,
        [userId],
      );

      if (userResult.rows.length === 0) {
        throw new Error("User account not found.");
      }

      if (userResult.rows[0].schoolId !== schoolId) {
        throw new Error("The user account does not belong to this school.");
      }

      // Make sure the user isn't already linked to another staff record
      const linkedStaff = await client.query(
        `
        SELECT id
        FROM "Staff"
        WHERE "userId" = $1
        `,
        [userId],
      );

      if (linkedStaff.rows.length > 0) {
        throw new Error(
          "This user account is already linked to a staff member.",
        );
      }
    }

    const result = await client.query(
      `
      INSERT INTO "Staff" (
        id,
        "schoolId",
        "userId",
        "staffNumber",
        "firstName",
        "middleName",
        "lastName",
        gender,
        "dateOfBirth",
        phone,
        email,
        address,
        position,
        "employmentType",
        status,
        "dateJoined",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
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
        $12,
        $13,
        'ACTIVE',
        $14,
        NOW(),
        NOW()
      )
      RETURNING *
      `,
      [
        schoolId,
        userId || null,
        staffNumber,
        firstName,
        middleName || null,
        lastName,
        gender,
        dateOfBirth || null,
        phone || null,
        email || null,
        address || null,
        position,
        employmentType || "FULL_TIME",
        dateJoined || null,
      ],
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all staff members for a school
 */
export async function getStaffBySchool(schoolId) {
  const result = await pool.query(
    `
    SELECT
      s.*,
      u.email AS "userEmail",
      u.role AS "userRole",
      u.status AS "userStatus"
    FROM "Staff" s
    LEFT JOIN "User" u
      ON s."userId" = u.id
    WHERE s."schoolId" = $1
    ORDER BY s."createdAt" DESC
    `,
    [schoolId],
  );

  return result.rows;
}

/**
 * Get one staff member by ID
 */
export async function getStaffById({ schoolId, staffId }) {
  const result = await pool.query(
    `
    SELECT
      s.*,
      u.email AS "userEmail",
      u.role AS "userRole",
      u.status AS "userStatus"
    FROM "Staff" s
    LEFT JOIN "User" u
      ON s."userId" = u.id
    WHERE s.id = $1
      AND s."schoolId" = $2
    `,
    [staffId, schoolId],
  );

  if (result.rows.length === 0) {
    throw new Error("Staff member not found.");
  }

  return result.rows[0];
}
