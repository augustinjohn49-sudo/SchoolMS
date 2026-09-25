import { randomUUID } from "crypto";
import pool from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";

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

/**
 * Update a staff member
 */
export async function updateStaff({
  schoolId,
  staffId,
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
  status,
  dateJoined,
}) {
  const existingResult = await pool.query(
    `
    SELECT *
    FROM "Staff"
    WHERE id = $1
      AND "schoolId" = $2
    `,
    [staffId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    throw new Error("Staff member not found.");
  }

  const existingStaff = existingResult.rows[0];

  // If staff number is being changed, make sure it is not already used
  if (staffNumber !== undefined && staffNumber !== existingStaff.staffNumber) {
    const duplicateResult = await pool.query(
      `
      SELECT id
      FROM "Staff"
      WHERE "schoolId" = $1
        AND "staffNumber" = $2
        AND id <> $3
      `,
      [schoolId, staffNumber, staffId],
    );

    if (duplicateResult.rows.length > 0) {
      throw new Error("A staff member with this staff number already exists.");
    }
  }

  const result = await pool.query(
    `
    UPDATE "Staff"
    SET
      "staffNumber" = COALESCE($1, "staffNumber"),
      "firstName" = COALESCE($2, "firstName"),
      "middleName" = $3,
      "lastName" = COALESCE($4, "lastName"),
      gender = COALESCE($5, gender),
      "dateOfBirth" = $6,
      phone = $7,
      email = $8,
      address = $9,
      position = COALESCE($10, position),
      "employmentType" = COALESCE($11, "employmentType"),
      status = COALESCE($12, status),
      "dateJoined" = $13,
      "updatedAt" = NOW()
    WHERE id = $14
      AND "schoolId" = $15
    RETURNING *
    `,
    [
      staffNumber,
      firstName,
      middleName ?? existingStaff.middleName,
      lastName,
      gender,
      dateOfBirth ?? existingStaff.dateOfBirth,
      phone ?? existingStaff.phone,
      email ?? existingStaff.email,
      address ?? existingStaff.address,
      position,
      employmentType,
      status,
      dateJoined ?? existingStaff.dateJoined,
      staffId,
      schoolId,
    ],
  );

  return result.rows[0];
}

/**
 * Create a login account for a staff member
 */
export async function createStaffAccount({
  schoolId,
  staffId,
  email,
  password,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const staffResult = await client.query(
      `
      SELECT
        id,
        "schoolId",
        "userId",
        "firstName",
        "lastName",
        position
      FROM "Staff"
      WHERE id = $1
        AND "schoolId" = $2
      FOR UPDATE
      `,
      [staffId, schoolId],
    );

    if (staffResult.rows.length === 0) {
      throw new Error("Staff member not found.");
    }

    const staff = staffResult.rows[0];

    // A staff member can only have one login account
    if (staff.userId) {
      throw new Error("This staff member already has a login account.");
    }

    // For now, only teachers can receive the TEACHER system role
    if (staff.position !== "TEACHER") {
      throw new Error(
        "Only staff with the TEACHER position can currently receive a teacher login account.",
      );
    }

    // Check whether the email is already registered
    const existingUserResult = await client.query(
      `
      SELECT id
      FROM "User"
      WHERE email = $1
      `,
      [email],
    );

    if (existingUserResult.rows.length > 0) {
      throw new Error("A user with this email already exists.");
    }

    const passwordHash = await hashPassword(password);
    const userId = randomUUID();
    const now = new Date();

    // Create the User account
    const userResult = await client.query(
      `
      INSERT INTO "User" (
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
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'TEACHER',
        'ACTIVE',
        $7,
        $7
      )
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
        staff.firstName,
        staff.lastName,
        email,
        passwordHash,
        now,
      ],
    );

    // Link Staff to User
    await client.query(
      `
      UPDATE "Staff"
      SET
        "userId" = $1,
        "updatedAt" = NOW()
      WHERE id = $2
        AND "schoolId" = $3
      `,
      [userId, staffId, schoolId],
    );

    await client.query("COMMIT");

    return {
      staff: {
        id: staff.id,
        // staffNumber: undefined,
        firstName: staff.firstName,
        lastName: staff.lastName,
        position: staff.position,
      },
      user: userResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateStaffAccountStatus({ schoolId, staffId, status }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!staffId) {
    const error = new Error("Staff ID is required.");
    error.code = "STAFF_ID_REQUIRED";
    throw error;
  }

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    const error = new Error("Account status must be ACTIVE or INACTIVE.");
    error.code = "INVALID_ACCOUNT_STATUS";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find the staff member and its linked user account.
    const staffResult = await client.query(
      `
        SELECT
            s.id,
            s."userId",
            s."firstName",
            s."lastName",
            u.email,
            u.status AS "userStatus"
        FROM "Staff" s
        LEFT JOIN "User" u
            ON u.id = s."userId"
        WHERE s.id = $1
            AND s."schoolId" = $2
        `,
      [staffId, schoolId],
    );

    if (staffResult.rows.length === 0) {
      const error = new Error("Staff member not found.");
      error.code = "STAFF_NOT_FOUND";
      throw error;
    }

    const staff = staffResult.rows[0];

    if (!staff.userId) {
      const error = new Error(
        "This staff member does not have a login account.",
      );
      error.code = "STAFF_ACCOUNT_NOT_FOUND";
      throw error;
    }

    const updateResult = await client.query(
      `
      UPDATE "User"
      SET
        status = $1,
        "updatedAt" = NOW()
      WHERE id = $2
        AND "schoolId" = $3
      RETURNING
        id,
        "schoolId",
        "firstName",
        "lastName",
        email,
        role,
        status,
        "updatedAt"
      `,
      [status, staff.userId, schoolId],
    );

    if (updateResult.rows.length === 0) {
      const error = new Error("User account not found.");
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    await client.query("COMMIT");

    return {
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
      },
      user: updateResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
