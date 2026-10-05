import pool from "../config/prisma.js";

export async function getStudentFeeAccount({ schoolId, studentEnrollmentId }) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!studentEnrollmentId) {
    const error = new Error("Student enrollment is required.");
    error.code = "ENROLLMENT_REQUIRED";
    throw error;
  }

  // Verify enrollment belongs to the authenticated school.
  const enrollmentResult = await pool.query(
    `SELECT
       se.id,
       se."studentId",
       se."academicYearId",
       se."classId",
       se."streamId",
       se.status,

       s."admissionNumber",
       s."firstName",
       s."middleName",
       s."lastName",

       ay.name AS "academicYearName",
       c.name AS "className",
       st.name AS "streamName"

     FROM "StudentEnrollment" se

     INNER JOIN "Student" s
       ON s.id = se."studentId"

     INNER JOIN "AcademicYear" ay
       ON ay.id = se."academicYearId"

     INNER JOIN "Class" c
       ON c.id = se."classId"

     LEFT JOIN "Stream" st
       ON st.id = se."streamId"

     WHERE se.id = $1
       AND s."schoolId" = $2

     LIMIT 1`,
    [studentEnrollmentId, schoolId],
  );

  if (enrollmentResult.rows.length === 0) {
    const error = new Error("Student enrollment not found.");
    error.code = "ENROLLMENT_NOT_FOUND";
    throw error;
  }

  const enrollment = enrollmentResult.rows[0];

  // Get all charges with their allocated payment amounts.
  const chargesResult = await pool.query(
    `SELECT
       sfc.id,
       sfc."feeStructureItemId",
       sfc.name,
       sfc.amount,
       sfc."dueDate",
       sfc."createdAt",

       COALESCE(pa."allocatedAmount", 0) AS "allocatedAmount",

       COALESCE(adj."adjustmentAmount", 0) AS "adjustmentAmount"

     FROM "StudentFeeCharge" sfc

     LEFT JOIN (
       SELECT
         "studentFeeChargeId",
         SUM(amount) AS "allocatedAmount"
       FROM "PaymentAllocation"
       GROUP BY "studentFeeChargeId"
     ) pa
       ON pa."studentFeeChargeId" = sfc.id

     LEFT JOIN (
       SELECT
         "studentFeeChargeId",
         SUM(
           CASE
             WHEN type = 'DEBIT' THEN amount
             WHEN type IN ('CREDIT', 'REFUND') THEN -amount
             ELSE 0
           END
         ) AS "adjustmentAmount"
       FROM "FeeAdjustment"
       GROUP BY "studentFeeChargeId"
     ) adj
       ON adj."studentFeeChargeId" = sfc.id

     WHERE sfc."studentEnrollmentId" = $1

     ORDER BY
       sfc."dueDate" ASC NULLS LAST,
       sfc."createdAt" ASC`,
    [studentEnrollmentId],
  );

  const charges = chargesResult.rows.map((charge) => {
    const amount = Number(charge.amount);
    const adjustmentAmount = Number(charge.adjustmentAmount);
    const allocatedAmount = Number(charge.allocatedAmount);

    const adjustedAmount = amount + adjustmentAmount;
    const outstandingAmount = adjustedAmount - allocatedAmount;

    return {
      id: charge.id,
      feeStructureItemId: charge.feeStructureItemId,
      name: charge.name,
      amount,
      adjustmentAmount,
      adjustedAmount,
      allocatedAmount,
      outstandingAmount,
      dueDate: charge.dueDate,
      createdAt: charge.createdAt,
    };
  });

  // Get payments belonging to this enrollment.
  const paymentsResult = await pool.query(
    `SELECT
       p.id,
       p.amount,
       p.method,
       p.reference,
       p.status,
       p."paymentDate",
       p.notes,
       p."createdAt",

       COALESCE(pa."allocatedAmount", 0) AS "allocatedAmount"

     FROM "Payment" p

     LEFT JOIN (
       SELECT
         "paymentId",
         SUM(amount) AS "allocatedAmount"
       FROM "PaymentAllocation"
       GROUP BY "paymentId"
     ) pa
       ON pa."paymentId" = p.id

     WHERE p."schoolId" = $1
       AND p."studentEnrollmentId" = $2

     ORDER BY p."paymentDate" DESC, p."createdAt" DESC`,
    [schoolId, studentEnrollmentId],
  );

  const payments = paymentsResult.rows.map((payment) => {
    const amount = Number(payment.amount);
    const allocatedAmount = Number(payment.allocatedAmount);

    return {
      id: payment.id,
      amount,
      method: payment.method,
      reference: payment.reference,
      status: payment.status,
      paymentDate: payment.paymentDate,
      notes: payment.notes,
      allocatedAmount,
      unallocatedAmount: amount - allocatedAmount,
      createdAt: payment.createdAt,
    };
  });

  // Calculate account totals.
  const totalCharges = charges.reduce(
    (total, charge) => total + charge.amount,
    0,
  );

  const totalAdjustments = charges.reduce(
    (total, charge) => total + charge.adjustmentAmount,
    0,
  );

  const totalBilled = totalCharges + totalAdjustments;

  const totalPaid = payments
    .filter((payment) => payment.status === "COMPLETED")
    .reduce((total, payment) => total + payment.allocatedAmount, 0);

  const outstandingBalance = totalBilled - totalPaid;

  const totalUnallocatedPayments = payments
    .filter((payment) => payment.status === "COMPLETED")
    .reduce((total, payment) => total + payment.unallocatedAmount, 0);

  return {
    student: {
      id: enrollment.studentId,
      admissionNumber: enrollment.admissionNumber,
      firstName: enrollment.firstName,
      middleName: enrollment.middleName,
      lastName: enrollment.lastName,
    },

    enrollment: {
      id: enrollment.id,
      academicYearId: enrollment.academicYearId,
      academicYearName: enrollment.academicYearName,
      classId: enrollment.classId,
      className: enrollment.className,
      streamId: enrollment.streamId,
      streamName: enrollment.streamName,
      status: enrollment.status,
    },

    summary: {
      totalCharges,
      totalAdjustments,
      totalBilled,
      totalPaid,
      outstandingBalance,
      totalUnallocatedPayments,
    },

    charges,
    payments,
  };
}
