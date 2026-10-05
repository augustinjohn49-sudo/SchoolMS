import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

/**
 * Validate a payment amount.
 */
const validatePaymentAmount = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error("Payment amount must be greater than zero.");
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  return numericAmount;
};

/**
 * Create a payment.
 *
 * A payment is recorded independently from its allocations.
 * Allocation to one or more student fee charges is handled separately.
 */
export const createPayment = async ({
  schoolId,
  studentEnrollmentId,
  receivedByUserId,
  amount,
  method,
  reference = null,
  status = "COMPLETED",
  paymentDate = null,
  notes = null,
}) => {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (
    !studentEnrollmentId ||
    !receivedByUserId ||
    amount === undefined ||
    !method
  ) {
    const error = new Error(
      "Student enrollment, received by user, amount, and payment method are required.",
    );
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  const numericAmount = validatePaymentAmount(amount);

  const validMethods = [
    "CASH",
    "MPESA",
    "BANK_TRANSFER",
    "CARD",
    "PAYPAL",
    "PESAPAL",
    "OTHER",
  ];

  if (!validMethods.includes(method)) {
    const error = new Error("Invalid payment method.");
    error.code = "INVALID_PAYMENT_METHOD";
    throw error;
  }

  const validStatuses = [
    "PENDING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
  ];

  if (!validStatuses.includes(status)) {
    const error = new Error("Invalid payment status.");
    error.code = "INVALID_PAYMENT_STATUS";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Verify that the student enrollment belongs to this school.
     */
    const enrollmentResult = await client.query(
      `
      SELECT
        se.id,
        se."studentId",
        se."academicYearId",
        se."classId",
        se."streamId",
        se.status,

        s."schoolId",
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

      LIMIT 1
      `,
      [studentEnrollmentId, schoolId],
    );

    if (enrollmentResult.rows.length === 0) {
      const error = new Error("Student enrollment not found for this school.");
      error.code = "STUDENT_ENROLLMENT_NOT_FOUND";
      throw error;
    }

    const enrollment = enrollmentResult.rows[0];

    /*
     * Verify that the user receiving the payment belongs to the school.
     */
    const userResult = await client.query(
      `
      SELECT
        id,
        "schoolId",
        role
      FROM "User"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
      `,
      [receivedByUserId, schoolId],
    );

    if (userResult.rows.length === 0) {
      const error = new Error(
        "Payment receiver was not found for this school.",
      );
      error.code = "RECEIVED_BY_USER_NOT_FOUND";
      throw error;
    }

    /*
     * If a payment reference is supplied, make sure it has not
     * already been used by another payment in this school.
     */
    if (reference) {
      const referenceResult = await client.query(
        `
        SELECT id
        FROM "Payment"
        WHERE "schoolId" = $1
          AND reference = $2
        LIMIT 1
        `,
        [schoolId, reference.trim()],
      );

      if (referenceResult.rows.length > 0) {
        const error = new Error(
          "A payment with this reference already exists.",
        );
        error.code = "PAYMENT_REFERENCE_EXISTS";
        throw error;
      }
    }

    const paymentId = randomUUID();

    const paymentResult = await client.query(
      `
      INSERT INTO "Payment" (
        id,
        "schoolId",
        "studentEnrollmentId",
        "receivedByUserId",
        amount,
        method,
        reference,
        status,
        "paymentDate",
        notes,
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
        COALESCE($9, NOW()),
        $10,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        "schoolId",
        "studentEnrollmentId",
        "receivedByUserId",
        amount,
        method,
        reference,
        status,
        "paymentDate",
        notes,
        "createdAt",
        "updatedAt"
      `,
      [
        paymentId,
        schoolId,
        studentEnrollmentId,
        receivedByUserId,
        numericAmount,
        method,
        reference ? reference.trim() : null,
        status,
        paymentDate,
        notes,
      ],
    );

    await client.query("COMMIT");

    return {
      ...paymentResult.rows[0],

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

      receivedBy: {
        id: userResult.rows[0].id,
        role: userResult.rows[0].role,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a payment by ID.
 */
export const getPaymentById = async ({ schoolId, paymentId }) => {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      p.id,
      p."schoolId",
      p."studentEnrollmentId",
      p."receivedByUserId",
      p.amount,
      p.method,
      p.reference,
      p.status,
      p."paymentDate",
      p.notes,
      p."createdAt",
      p."updatedAt",

      se."studentId",
      se."academicYearId",
      se."classId",
      se."streamId",
      se.status AS "enrollmentStatus",

      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      ay.name AS "academicYearName",
      c.name AS "className",
      st.name AS "streamName",

      u.role AS "receivedByRole"

    FROM "Payment" p

    INNER JOIN "StudentEnrollment" se
      ON se.id = p."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    INNER JOIN "Class" c
      ON c.id = se."classId"

    LEFT JOIN "Stream" st
      ON st.id = se."streamId"

    INNER JOIN "User" u
      ON u.id = p."receivedByUserId"

    WHERE p.id = $1
      AND p."schoolId" = $2

    LIMIT 1
    `,
    [paymentId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Payment not found.");
    error.code = "PAYMENT_NOT_FOUND";
    throw error;
  }

  const row = result.rows[0];

  /*
   * Retrieve allocations separately so the payment response shows
   * exactly which charges received this payment.
   */
  const allocationsResult = await pool.query(
    `
    SELECT
      pa.id,
      pa."paymentId",
      pa."studentFeeChargeId",
      pa.amount,
      pa."createdAt",
      pa."updatedAt",

      sfc.name AS "chargeName",
      sfc.amount AS "chargeAmount",
      sfc."dueDate"

    FROM "PaymentAllocation" pa

    INNER JOIN "StudentFeeCharge" sfc
      ON sfc.id = pa."studentFeeChargeId"

    WHERE pa."paymentId" = $1

    ORDER BY pa."createdAt" ASC
    `,
    [paymentId],
  );

  const allocatedAmount = allocationsResult.rows.reduce(
    (total, allocation) => total + Number(allocation.amount),
    0,
  );

  const paymentAmount = Number(row.amount);

  return {
    id: row.id,
    schoolId: row.schoolId,
    studentEnrollmentId: row.studentEnrollmentId,
    receivedByUserId: row.receivedByUserId,
    amount: row.amount,
    method: row.method,
    reference: row.reference,
    status: row.status,
    paymentDate: row.paymentDate,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    student: {
      id: row.studentId,
      admissionNumber: row.admissionNumber,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
    },

    enrollment: {
      id: row.studentEnrollmentId,
      academicYearId: row.academicYearId,
      academicYearName: row.academicYearName,
      classId: row.classId,
      className: row.className,
      streamId: row.streamId,
      streamName: row.streamName,
      status: row.enrollmentStatus,
    },

    receivedBy: {
      id: row.receivedByUserId,
      role: row.receivedByRole,
    },

    allocations: allocationsResult.rows,

    allocationSummary: {
      paymentAmount,
      allocatedAmount,
      unallocatedAmount: paymentAmount - allocatedAmount,
    },
  };
};

/**
 * Get payments for a school.
 */
export const getPayments = async ({
  schoolId,
  studentEnrollmentId = null,
  method = null,
  status = null,
  page = 1,
  limit = 20,
}) => {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (parsedPage - 1) * parsedLimit;

  const conditions = [`p."schoolId" = $1`];
  const values = [schoolId];
  let parameterIndex = 2;

  if (studentEnrollmentId) {
    conditions.push(`p."studentEnrollmentId" = $${parameterIndex}`);
    values.push(studentEnrollmentId);
    parameterIndex += 1;
  }

  if (method) {
    conditions.push(`p.method = $${parameterIndex}`);
    values.push(method);
    parameterIndex += 1;
  }

  if (status) {
    conditions.push(`p.status = $${parameterIndex}`);
    values.push(status);
    parameterIndex += 1;
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM "Payment" p
    WHERE ${whereClause}
    `,
    values,
  );

  const total = countResult.rows[0].count;

  values.push(parsedLimit);
  values.push(offset);

  const result = await pool.query(
    `
    SELECT
      p.id,
      p."studentEnrollmentId",
      p."receivedByUserId",
      p.amount,
      p.method,
      p.reference,
      p.status,
      p."paymentDate",
      p.notes,
      p."createdAt",
      p."updatedAt",

      se."studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      ay.name AS "academicYearName",
      c.name AS "className",
      st.name AS "streamName",

      COALESCE(
        SUM(pa.amount),
        0
      ) AS "allocatedAmount"

    FROM "Payment" p

    INNER JOIN "StudentEnrollment" se
      ON se.id = p."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    INNER JOIN "Class" c
      ON c.id = se."classId"

    LEFT JOIN "Stream" st
      ON st.id = se."streamId"

    LEFT JOIN "PaymentAllocation" pa
      ON pa."paymentId" = p.id

    WHERE ${whereClause}

    GROUP BY
      p.id,
      se."studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",
      ay.name,
      c.name,
      st.name

    ORDER BY p."paymentDate" DESC, p."createdAt" DESC

    LIMIT $${parameterIndex}
    OFFSET $${parameterIndex + 1}
    `,
    values,
  );

  return {
    payments: result.rows.map((row) => {
      const paymentAmount = Number(row.amount);
      const allocatedAmount = Number(row.allocatedAmount);

      return {
        id: row.id,
        studentEnrollmentId: row.studentEnrollmentId,
        receivedByUserId: row.receivedByUserId,
        amount: row.amount,
        method: row.method,
        reference: row.reference,
        status: row.status,
        paymentDate: row.paymentDate,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,

        student: {
          id: row.studentId,
          admissionNumber: row.admissionNumber,
          firstName: row.firstName,
          middleName: row.middleName,
          lastName: row.lastName,
        },

        enrollment: {
          academicYearName: row.academicYearName,
          className: row.className,
          streamName: row.streamName,
        },

        allocationSummary: {
          paymentAmount,
          allocatedAmount,
          unallocatedAmount: paymentAmount - allocatedAmount,
        },
      };
    }),

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/**
 * Update payment status.
 *
 * Financial amounts, payment method and payment reference are not
 * changed after creation.
 */
export const updatePaymentStatus = async ({ schoolId, paymentId, status }) => {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const validStatuses = [
    "PENDING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
  ];

  if (!validStatuses.includes(status)) {
    const error = new Error("Invalid payment status.");
    error.code = "INVALID_PAYMENT_STATUS";
    throw error;
  }

  const existingResult = await pool.query(
    `
    SELECT
      id,
      status
    FROM "Payment"
    WHERE id = $1
      AND "schoolId" = $2
    LIMIT 1
    `,
    [paymentId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Payment not found.");
    error.code = "PAYMENT_NOT_FOUND";
    throw error;
  }

  const currentStatus = existingResult.rows[0].status;

  /*
   * Do not allow a completed payment to be moved back to
   * pending, failed, or cancelled.
   */
  if (
    currentStatus === "COMPLETED" &&
    ["PENDING", "FAILED", "CANCELLED"].includes(status)
  ) {
    const error = new Error(
      "A completed payment cannot be moved back to an earlier status.",
    );
    error.code = "INVALID_PAYMENT_STATUS_TRANSITION";
    throw error;
  }

  /*
   * Do not allow a refunded payment to become active again.
   */
  if (currentStatus === "REFUNDED") {
    const error = new Error("A refunded payment cannot be changed.");
    error.code = "PAYMENT_ALREADY_REFUNDED";
    throw error;
  }

  const result = await pool.query(
    `
    UPDATE "Payment"
    SET
      status = $1,
      "updatedAt" = NOW()
    WHERE id = $2
      AND "schoolId" = $3
    RETURNING
      id,
      "schoolId",
      "studentEnrollmentId",
      "receivedByUserId",
      amount,
      method,
      reference,
      status,
      "paymentDate",
      notes,
      "createdAt",
      "updatedAt"
    `,
    [status, paymentId, schoolId],
  );

  return result.rows[0];
};
