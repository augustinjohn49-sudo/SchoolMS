import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

function getAdjustmentEffect(type, amount) {
  if (type === "DEBIT") {
    return amount;
  }

  return -amount;
}

export async function createFeeAdjustment({
  schoolId,
  studentFeeChargeId,
  type,
  amount,
  reason,
  createdByUserId,
}) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (
    !studentFeeChargeId ||
    !type ||
    amount === undefined ||
    !reason ||
    !createdByUserId
  ) {
    const error = new Error(
      "Student fee charge, adjustment type, amount, reason, and created by user are required.",
    );
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error("Adjustment amount must be greater than zero.");
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  const validTypes = ["DEBIT", "CREDIT", "REFUND", "CORRECTION"];

  if (!validTypes.includes(type)) {
    const error = new Error("Invalid adjustment type.");
    error.code = "INVALID_ADJUSTMENT_TYPE";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const chargeResult = await client.query(
      `
        SELECT
            sfc.id,
            sfc."studentEnrollmentId",
            sfc.name,
            sfc.amount,
            ay."schoolId",
            COALESCE(
            (
                SELECT SUM(fa.amount)
                FROM "FeeAdjustment" fa
                WHERE fa."studentFeeChargeId" = sfc.id
            ),
            0
            ) AS "existingAdjustmentAmount"
        FROM "StudentFeeCharge" sfc
        INNER JOIN "StudentEnrollment" se
            ON se.id = sfc."studentEnrollmentId"
        INNER JOIN "AcademicYear" ay
            ON ay.id = se."academicYearId"
        WHERE sfc.id = $1
            AND ay."schoolId" = $2
        FOR UPDATE
        `,
      [studentFeeChargeId, schoolId],
    );

    if (chargeResult.rows.length === 0) {
      const error = new Error("Student fee charge not found.");
      error.code = "STUDENT_FEE_CHARGE_NOT_FOUND";
      throw error;
    }

    const charge = chargeResult.rows[0];

    const existingAdjustmentAmount = Number(charge.existingAdjustmentAmount);

    const adjustedAmount = Number(charge.amount) + existingAdjustmentAmount;

    const adjustmentEffect = getAdjustmentEffect(type, numericAmount);

    const newAdjustedAmount = adjustedAmount + adjustmentEffect;

    if (newAdjustedAmount < 0) {
      const error = new Error(
        "Adjustment cannot reduce the charge below zero.",
      );
      error.code = "ADJUSTMENT_EXCEEDS_CHARGE";
      throw error;
    }

    const userResult = await client.query(
      `
      SELECT id, "schoolId", role
      FROM "User"
      WHERE id = $1
        AND "schoolId" = $2
      `,
      [createdByUserId, schoolId],
    );

    if (userResult.rows.length === 0) {
      const error = new Error(
        "User is not authorized to create this adjustment.",
      );
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    const adjustmentId = randomUUID();

    const adjustmentResult = await client.query(
      `
      INSERT INTO "FeeAdjustment" (
        id,
        "studentFeeChargeId",
        type,
        amount,
        reason,
        "createdByUserId",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING
        id,
        "studentFeeChargeId",
        type,
        amount,
        reason,
        "createdByUserId",
        "createdAt",
        "updatedAt"
      `,
      [
        adjustmentId,
        studentFeeChargeId,
        type,
        numericAmount,
        reason,
        createdByUserId,
      ],
    );

    await client.query("COMMIT");

    return adjustmentResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getFeeAdjustmentById({ schoolId, adjustmentId }) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!adjustmentId) {
    const error = new Error("Adjustment ID is required.");
    error.code = "ADJUSTMENT_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      fa.id,
      fa."studentFeeChargeId",
      fa.type,
      fa.amount,
      fa.reason,
      fa."createdByUserId",
      fa."createdAt",
      fa."updatedAt",

      sfc.name AS "chargeName",
      sfc.amount AS "chargeAmount",

      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      u.id AS "createdById",
      u.role AS "createdByRole"

    FROM "FeeAdjustment" fa

    INNER JOIN "StudentFeeCharge" sfc
      ON sfc.id = fa."studentFeeChargeId"

    INNER JOIN "StudentEnrollment" se
      ON se.id = sfc."studentEnrollmentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "User" u
      ON u.id = fa."createdByUserId"

    WHERE fa.id = $1
      AND ay."schoolId" = $2
    `,
    [adjustmentId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Fee adjustment not found.");
    error.code = "FEE_ADJUSTMENT_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function getFeeAdjustments({ schoolId, studentFeeChargeId }) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  let query = `
    SELECT
      fa.id,
      fa."studentFeeChargeId",
      fa.type,
      fa.amount,
      fa.reason,
      fa."createdByUserId",
      fa."createdAt",
      fa."updatedAt",

      sfc.name AS "chargeName",
      sfc.amount AS "chargeAmount",

      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName"

    FROM "FeeAdjustment" fa

    INNER JOIN "StudentFeeCharge" sfc
      ON sfc.id = fa."studentFeeChargeId"

    INNER JOIN "StudentEnrollment" se
      ON se.id = sfc."studentEnrollmentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    WHERE ay."schoolId" = $1
  `;

  const values = [schoolId];

  if (studentFeeChargeId) {
    query += `
      AND fa."studentFeeChargeId" = $2
    `;

    values.push(studentFeeChargeId);
  }

  query += `
    ORDER BY fa."createdAt" DESC
  `;

  const result = await pool.query(query, values);

  return result.rows;
}
