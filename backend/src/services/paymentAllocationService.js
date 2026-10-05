import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

export async function createPaymentAllocation({
  schoolId,
  paymentId,
  studentFeeChargeId,
  amount,
}) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!paymentId || !studentFeeChargeId || amount === undefined) {
    const error = new Error(
      "Payment, student fee charge, and amount are required.",
    );
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  const allocationAmount = Number(amount);

  if (!Number.isFinite(allocationAmount) || allocationAmount <= 0) {
    const error = new Error("Allocation amount must be greater than zero.");
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get and lock the payment.
    const paymentResult = await client.query(
      `SELECT
         p.id,
         p."schoolId",
         p."studentEnrollmentId",
         p.amount,
         p.status
       FROM "Payment" p
       WHERE p.id = $1
         AND p."schoolId" = $2
       FOR UPDATE`,
      [paymentId, schoolId],
    );

    if (paymentResult.rows.length === 0) {
      const error = new Error("Payment not found.");
      error.code = "PAYMENT_NOT_FOUND";
      throw error;
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== "COMPLETED") {
      const error = new Error("Only completed payments can be allocated.");
      error.code = "PAYMENT_NOT_COMPLETED";
      throw error;
    }

    // Verify the fee charge and make sure it belongs to the same enrollment.
    const chargeResult = await client.query(
      `SELECT
         sfc.id,
         sfc."studentEnrollmentId",
         sfc.amount
       FROM "StudentFeeCharge" sfc
       INNER JOIN "StudentEnrollment" se
         ON se.id = sfc."studentEnrollmentId"
       INNER JOIN "Student" s
         ON s.id = se."studentId"
       WHERE sfc.id = $1
         AND s."schoolId" = $2
       FOR UPDATE`,
      [studentFeeChargeId, schoolId],
    );

    if (chargeResult.rows.length === 0) {
      const error = new Error("Student fee charge not found.");
      error.code = "STUDENT_FEE_CHARGE_NOT_FOUND";
      throw error;
    }

    const charge = chargeResult.rows[0];

    if (charge.studentEnrollmentId !== payment.studentEnrollmentId) {
      const error = new Error(
        "Payment and student fee charge must belong to the same student enrollment.",
      );
      error.code = "ENROLLMENT_MISMATCH";
      throw error;
    }

    // Calculate how much of the payment has already been allocated.
    const allocatedPaymentResult = await client.query(
      `SELECT COALESCE(SUM(pa.amount), 0) AS "allocatedAmount"
       FROM "PaymentAllocation" pa
       WHERE pa."paymentId" = $1`,
      [paymentId],
    );

    const allocatedPayment = Number(
      allocatedPaymentResult.rows[0].allocatedAmount,
    );

    const paymentAmount = Number(payment.amount);
    const unallocatedPayment = paymentAmount - allocatedPayment;

    if (allocationAmount > unallocatedPayment) {
      const error = new Error(
        `Allocation amount exceeds the payment's unallocated amount of ${unallocatedPayment}.`,
      );
      error.code = "INSUFFICIENT_UNALLOCATED_PAYMENT";
      throw error;
    }

    // Calculate how much of the fee charge has already been paid.
    const allocatedChargeResult = await client.query(
      `SELECT COALESCE(SUM(pa.amount), 0) AS "allocatedAmount"
       FROM "PaymentAllocation" pa
       WHERE pa."studentFeeChargeId" = $1`,
      [studentFeeChargeId],
    );

    const allocatedCharge = Number(
      allocatedChargeResult.rows[0].allocatedAmount,
    );

    // Calculate adjustments affecting the charge.
    const adjustmentResult = await client.query(
      `SELECT
         COALESCE(
           SUM(
             CASE
               WHEN "type" = 'DEBIT' THEN amount
               WHEN "type" IN ('CREDIT', 'REFUND') THEN -amount
               ELSE 0
             END
           ),
           0
         ) AS "adjustmentAmount"
       FROM "FeeAdjustment"
       WHERE "studentFeeChargeId" = $1`,
      [studentFeeChargeId],
    );

    const adjustmentAmount = Number(adjustmentResult.rows[0].adjustmentAmount);

    const chargeAmount = Number(charge.amount);

    const outstandingCharge = chargeAmount + adjustmentAmount - allocatedCharge;

    if (allocationAmount > outstandingCharge) {
      const error = new Error(
        `Allocation amount exceeds the fee charge's outstanding amount of ${outstandingCharge}.`,
      );
      error.code = "INSUFFICIENT_CHARGE_BALANCE";
      throw error;
    }

    const allocationId = randomUUID();

    const allocationResult = await client.query(
      `INSERT INTO "PaymentAllocation" (
         id,
         "paymentId",
         "studentFeeChargeId",
         amount,
         "updatedAt"
       )
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING
         id,
         "paymentId",
         "studentFeeChargeId",
         amount,
         "createdAt",
         "updatedAt"`,
      [allocationId, paymentId, studentFeeChargeId, allocationAmount],
    );

    await client.query("COMMIT");

    return allocationResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPaymentAllocationById({ schoolId, allocationId }) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `SELECT
       pa.id,
       pa."paymentId",
       pa."studentFeeChargeId",
       pa.amount,
       pa."createdAt",
       pa."updatedAt",

       p.amount AS "paymentAmount",
       p.method AS "paymentMethod",
       p.reference AS "paymentReference",
       p.status AS "paymentStatus",

       sfc.name AS "chargeName",
       sfc.amount AS "chargeAmount",

       s.id AS "studentId",
       s."admissionNumber",
       s."firstName",
       s."middleName",
       s."lastName"

     FROM "PaymentAllocation" pa

     INNER JOIN "Payment" p
       ON p.id = pa."paymentId"

     INNER JOIN "StudentFeeCharge" sfc
       ON sfc.id = pa."studentFeeChargeId"

     INNER JOIN "StudentEnrollment" se
       ON se.id = sfc."studentEnrollmentId"

     INNER JOIN "Student" s
       ON s.id = se."studentId"

     WHERE pa.id = $1
       AND p."schoolId" = $2

     LIMIT 1`,
    [allocationId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Payment allocation not found.");
    error.code = "PAYMENT_ALLOCATION_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function getPaymentAllocations({
  schoolId,
  paymentId,
  studentFeeChargeId,
}) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `SELECT
       pa.id,
       pa."paymentId",
       pa."studentFeeChargeId",
       pa.amount,
       pa."createdAt",
       pa."updatedAt",

       p.amount AS "paymentAmount",
       p.method AS "paymentMethod",
       p.reference AS "paymentReference",

       sfc.name AS "chargeName",
       sfc.amount AS "chargeAmount",

       s.id AS "studentId",
       s."admissionNumber",
       s."firstName",
       s."middleName",
       s."lastName"

     FROM "PaymentAllocation" pa

     INNER JOIN "Payment" p
       ON p.id = pa."paymentId"

     INNER JOIN "StudentFeeCharge" sfc
       ON sfc.id = pa."studentFeeChargeId"

     INNER JOIN "StudentEnrollment" se
       ON se.id = sfc."studentEnrollmentId"

     INNER JOIN "Student" s
       ON s.id = se."studentId"

     WHERE p."schoolId" = $1
       AND ($2::uuid IS NULL OR pa."paymentId" = $2)
       AND ($3::uuid IS NULL OR pa."studentFeeChargeId" = $3)

     ORDER BY pa."createdAt" DESC`,
    [schoolId, paymentId || null, studentFeeChargeId || null],
  );

  return result.rows;
}
