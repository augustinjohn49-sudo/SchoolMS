import pool from "../config/prisma.js";

export async function getFinanceSummary({ schoolId, academicYearId, termId }) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  /*
   * Build the common enrollment filter.
   *
   * StudentEnrollment does not contain schoolId directly.
   * School ownership is reached through AcademicYear.
   */
  const enrollmentConditions = [`ay."schoolId" = $1`];
  const enrollmentValues = [schoolId];

  if (academicYearId) {
    enrollmentConditions.push(
      `se."academicYearId" = $${enrollmentValues.length + 1}`,
    );
    enrollmentValues.push(academicYearId);
  }

  if (termId) {
    enrollmentConditions.push(
      `EXISTS (
        SELECT 1
        FROM "Term" t
        WHERE t.id = $${enrollmentValues.length + 1}
          AND t."academicYearId" = se."academicYearId"
      )`,
    );
    enrollmentValues.push(termId);
  }

  const enrollmentFilter = enrollmentConditions.join("\nAND ");

  /*
   * Charges and adjustments
   */
  const chargeResult = await pool.query(
    `
  SELECT
    COALESCE(SUM(sfc.amount), 0) AS "totalCharges",

    COALESCE(
      SUM(
        COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN fa.type = 'DEBIT' THEN fa.amount
                WHEN fa.type IN ('CREDIT', 'REFUND') THEN -fa.amount
                WHEN fa.type = 'CORRECTION' THEN -fa.amount
                ELSE 0
              END
            )
            FROM "FeeAdjustment" fa
            WHERE fa."studentFeeChargeId" = sfc.id
          ),
          0
        )
      ),
      0
    ) AS "netAdjustment",

    COALESCE(
      SUM(
        sfc.amount
        +
        COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN fa2.type = 'DEBIT' THEN fa2.amount
                WHEN fa2.type IN ('CREDIT', 'REFUND') THEN -fa2.amount
                WHEN fa2.type = 'CORRECTION' THEN -fa2.amount
                ELSE 0
              END
            )
            FROM "FeeAdjustment" fa2
            WHERE fa2."studentFeeChargeId" = sfc.id
          ),
          0
        )
      ),
      0
    ) AS "totalBilled"

  FROM "StudentFeeCharge" sfc

  INNER JOIN "StudentEnrollment" se
    ON se.id = sfc."studentEnrollmentId"

  INNER JOIN "AcademicYear" ay
    ON ay.id = se."academicYearId"

  WHERE ${enrollmentFilter}
  `,
    enrollmentValues,
  );

  /*
   * Payments
   */
  const paymentResult = await pool.query(
    `
    SELECT
      COALESCE(SUM(p.amount), 0) AS "totalPayments",

      COALESCE(
        SUM(
          COALESCE(
            (
              SELECT SUM(pa.amount)
              FROM "PaymentAllocation" pa
              WHERE pa."paymentId" = p.id
            ),
            0
          )
        ),
        0
      ) AS "totalAllocatedPayments",

      COALESCE(
        SUM(
          p.amount -
          COALESCE(
            (
              SELECT SUM(pa.amount)
              FROM "PaymentAllocation" pa
              WHERE pa."paymentId" = p.id
            ),
            0
          )
        ),
        0
      ) AS "totalUnallocatedPayments"

    FROM "Payment" p

    INNER JOIN "StudentEnrollment" se
      ON se.id = p."studentEnrollmentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    WHERE ${enrollmentFilter}
      AND p.status = 'COMPLETED'
    `,
    enrollmentValues,
  );

  /*
   * Payments by method
   */
  const paymentMethodResult = await pool.query(
    `
    SELECT
      p.method,
      COUNT(p.id)::INTEGER AS "paymentCount",
      COALESCE(SUM(p.amount), 0) AS amount
    FROM "Payment" p

    INNER JOIN "StudentEnrollment" se
      ON se.id = p."studentEnrollmentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    WHERE ${enrollmentFilter}
      AND p.status = 'COMPLETED'

    GROUP BY p.method
    ORDER BY amount DESC
    `,
    enrollmentValues,
  );

  /*
   * Payments by status
   */
  const paymentStatusResult = await pool.query(
    `
    SELECT
      p.status,
      COUNT(p.id)::INTEGER AS "paymentCount",
      COALESCE(SUM(p.amount), 0) AS amount
    FROM "Payment" p

    INNER JOIN "StudentEnrollment" se
      ON se.id = p."studentEnrollmentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    WHERE ${enrollmentFilter}

    GROUP BY p.status
    ORDER BY amount DESC
    `,
    enrollmentValues,
  );

  /*
   * Adjustments by type
   */
  const adjustmentResult = await pool.query(
    `
    SELECT
      fa.type,
      COUNT(fa.id)::INTEGER AS "adjustmentCount",
      COALESCE(SUM(fa.amount), 0) AS amount
    FROM "FeeAdjustment" fa

    INNER JOIN "StudentFeeCharge" sfc
      ON sfc.id = fa."studentFeeChargeId"

    INNER JOIN "StudentEnrollment" se
      ON se.id = sfc."studentEnrollmentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    WHERE ${enrollmentFilter}

    GROUP BY fa.type
    ORDER BY amount DESC
    `,
    enrollmentValues,
  );

  const charges = chargeResult.rows[0];
  const payments = paymentResult.rows[0];

  const totalCharges = Number(charges.totalCharges);
  const netAdjustment = Number(charges.netAdjustment);
  const totalBilled = Number(charges.totalBilled);
  const totalPayments = Number(payments.totalPayments);
  const totalAllocatedPayments = Number(payments.totalAllocatedPayments);
  const totalUnallocatedPayments = Number(payments.totalUnallocatedPayments);

  /*
   * Outstanding balance is based on the amount billed,
   * not simply all money received.
   */
  const outstandingBalance = totalBilled - totalAllocatedPayments;

  return {
    filters: {
      academicYearId: academicYearId || null,
      termId: termId || null,
    },

    summary: {
      totalCharges,
      totalAdjustments: netAdjustment,
      totalBilled,
      totalPaymentsReceived: totalPayments,
      totalAllocatedPayments,
      totalUnallocatedPayments,
      outstandingBalance,
    },

    paymentsByMethod: paymentMethodResult.rows.map((row) => ({
      method: row.method,
      paymentCount: Number(row.paymentCount),
      amount: Number(row.amount),
    })),

    paymentsByStatus: paymentStatusResult.rows.map((row) => ({
      status: row.status,
      paymentCount: Number(row.paymentCount),
      amount: Number(row.amount),
    })),

    adjustmentsByType: adjustmentResult.rows.map((row) => ({
      type: row.type,
      adjustmentCount: Number(row.adjustmentCount),
      amount: Number(row.amount),
    })),
  };
}

export async function getStudentBalances({
  schoolId,
  academicYearId,
  termId,
  classId,
  streamId,
  outstandingOnly = false,
  page = 1,
  limit = 20,
}) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));

  const offset = (parsedPage - 1) * parsedLimit;

  const conditions = [`ay."schoolId" = $1`];
  const values = [schoolId];

  if (academicYearId) {
    conditions.push(`se."academicYearId" = $${values.length + 1}`);
    values.push(academicYearId);
  }

  if (termId) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM "StudentFeeCharge" termCharge
        INNER JOIN "FeeStructureItem" termItem
          ON termItem.id = termCharge."feeStructureItemId"
        INNER JOIN "FeeStructure" termStructure
          ON termStructure.id = termItem."feeStructureId"
        WHERE termCharge."studentEnrollmentId" = se.id
          AND termStructure."termId" = $${values.length + 1}
      )
    `);

    values.push(termId);
  }

  if (classId) {
    conditions.push(`se."classId" = $${values.length + 1}`);
    values.push(classId);
  }

  if (streamId) {
    conditions.push(`se."streamId" = $${values.length + 1}`);
    values.push(streamId);
  }

  const whereClause = conditions.join("\nAND ");

  const termParameterIndex = termId ? values.indexOf(termId) + 1 : null;

  const chargeTermCondition = termParameterIndex
    ? `
      AND EXISTS (
        SELECT 1
        FROM "FeeStructureItem" filteredItem
        INNER JOIN "FeeStructure" filteredStructure
          ON filteredStructure.id = filteredItem."feeStructureId"
        WHERE filteredItem.id = sfc."feeStructureItemId"
          AND filteredStructure."termId" = $${termParameterIndex}
      )
    `
    : "";

  const allocatedPaymentTermCondition = termParameterIndex
    ? `
      AND EXISTS (
        SELECT 1
        FROM "FeeStructureItem" paidItem
        INNER JOIN "FeeStructure" paidStructure
          ON paidStructure.id = paidItem."feeStructureId"
        WHERE paidItem.id = paidCharge."feeStructureItemId"
          AND paidStructure."termId" = $${termParameterIndex}
      )
    `
    : "";

  /*
   * Build the student balance dataset first.
   * Pagination and outstanding filtering are applied
   * after the financial values have been calculated.
   */
  const balanceQuery = `
    SELECT
      se.id AS "studentEnrollmentId",

      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      ay.id AS "academicYearId",
      ay.name AS "academicYear",

      c.id AS "classId",
      c.name AS "className",

      st.id AS "streamId",
      st.name AS "streamName",

      se.status AS "status",

      COALESCE(
        (
          SELECT SUM(sfc.amount)
          FROM "StudentFeeCharge" sfc
          WHERE sfc."studentEnrollmentId" = se.id
          ${chargeTermCondition}
        ),
        0
      ) AS "totalCharges",

      COALESCE(
        (
          SELECT SUM(
            CASE
              WHEN fa.type = 'DEBIT'
                THEN fa.amount
              WHEN fa.type IN (
                'CREDIT',
                'REFUND',
                'CORRECTION'
              )
                THEN -fa.amount
              ELSE 0
            END
          )
          FROM "FeeAdjustment" fa
          INNER JOIN "StudentFeeCharge" sfc
            ON sfc.id = fa."studentFeeChargeId"
          WHERE sfc."studentEnrollmentId" = se.id
          ${chargeTermCondition}
        ),
        0
      ) AS "totalAdjustments",

      COALESCE(
        (
          SELECT SUM(
            sfc.amount
            +
            COALESCE(
              (
                SELECT SUM(
                  CASE
                    WHEN fa.type = 'DEBIT'
                      THEN fa.amount
                    WHEN fa.type IN (
                      'CREDIT',
                      'REFUND',
                      'CORRECTION'
                    )
                      THEN -fa.amount
                    ELSE 0
                  END
                )
                FROM "FeeAdjustment" fa
                WHERE fa."studentFeeChargeId" = sfc.id
              ),
              0
            )
          )
          FROM "StudentFeeCharge" sfc
          WHERE sfc."studentEnrollmentId" = se.id
          ${chargeTermCondition}
        ),
        0
      ) AS "totalBilled",

      COALESCE(
        (
          SELECT SUM(pa.amount)
          FROM "PaymentAllocation" pa

          INNER JOIN "Payment" p
            ON p.id = pa."paymentId"

          INNER JOIN "StudentFeeCharge" paidCharge
            ON paidCharge.id = pa."studentFeeChargeId"

          WHERE p."studentEnrollmentId" = se.id
            AND p.status = 'COMPLETED'

          ${allocatedPaymentTermCondition}
        ),
        0
      ) AS "totalPaid",

      COALESCE(
        (
          SELECT SUM(p.amount)
          FROM "Payment" p
          WHERE p."studentEnrollmentId" = se.id
            AND p.status = 'COMPLETED'
        ),
        0
      )
      -
      COALESCE(
        (
          SELECT SUM(pa.amount)
          FROM "PaymentAllocation" pa

          INNER JOIN "Payment" p
            ON p.id = pa."paymentId"

          WHERE p."studentEnrollmentId" = se.id
            AND p.status = 'COMPLETED'
        ),
        0
      ) AS "totalUnallocatedPayments"

    FROM "StudentEnrollment" se

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    INNER JOIN "Class" c
      ON c.id = se."classId"

    LEFT JOIN "Stream" st
      ON st.id = se."streamId"

    WHERE ${whereClause}
  `;

  /*
   * We use a CTE so outstandingOnly can be applied
   * to the calculated outstanding balance.
   */
  const filteredQuery = `
    WITH student_balances AS (
      ${balanceQuery}
    )

    SELECT *
    FROM student_balances

    ${outstandingOnly ? `WHERE "totalBilled" - "totalPaid" > 0` : ""}

    ORDER BY
      "lastName" ASC,
      "firstName" ASC

    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const paginatedValues = [...values, parsedLimit, offset];

  const countQuery = `
    WITH student_balances AS (
      ${balanceQuery}
    )

    SELECT COUNT(*)::INTEGER AS total
    FROM student_balances

    ${outstandingOnly ? `WHERE "totalBilled" - "totalPaid" > 0` : ""}
  `;

  const [result, countResult] = await Promise.all([
    pool.query(filteredQuery, paginatedValues),
    pool.query(countQuery, values),
  ]);

  const total = Number(countResult.rows[0].total);
  const totalPages = total === 0 ? 0 : Math.ceil(total / parsedLimit);

  const balances = result.rows.map((row) => {
    const totalCharges = Number(row.totalCharges);
    const totalAdjustments = Number(row.totalAdjustments);
    const totalBilled = Number(row.totalBilled);
    const totalPaid = Number(row.totalPaid);
    const totalUnallocatedPayments = Number(row.totalUnallocatedPayments);

    return {
      studentEnrollmentId: row.studentEnrollmentId,

      student: {
        id: row.studentId,
        admissionNumber: row.admissionNumber,
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
      },

      enrollment: {
        academicYearId: row.academicYearId,
        academicYear: String(row.academicYear),
        classId: row.classId,
        className: row.className,
        streamId: row.streamId,
        streamName: row.streamName,
        status: row.status,
      },

      totalCharges,
      totalAdjustments,
      totalBilled,
      totalPaid,
      outstandingBalance: totalBilled - totalPaid,
      totalUnallocatedPayments,
    };
  });

  return {
    balances,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPreviousPage: parsedPage > 1,
    },
    filters: {
      academicYearId: academicYearId || null,
      termId: termId || null,
      classId: classId || null,
      streamId: streamId || null,
      outstandingOnly: Boolean(outstandingOnly),
    },
  };
}

export async function getPaymentReport({
  schoolId,
  academicYearId,
  termId,
  classId,
  streamId,
  method,
  status,
  dateFrom,
  dateTo,
  page = 1,
  limit = 20,
}) {
  if (!schoolId) {
    const error = new Error("School is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));

  const offset = (parsedPage - 1) * parsedLimit;

  const conditions = [`ay."schoolId" = $1`];
  const values = [schoolId];

  if (academicYearId) {
    conditions.push(`se."academicYearId" = $${values.length + 1}`);
    values.push(academicYearId);
  }

  if (classId) {
    conditions.push(`se."classId" = $${values.length + 1}`);
    values.push(classId);
  }

  if (streamId) {
    conditions.push(`se."streamId" = $${values.length + 1}`);
    values.push(streamId);
  }

  if (method) {
    conditions.push(`p.method = $${values.length + 1}`);
    values.push(method);
  }

  if (status) {
    conditions.push(`p.status = $${values.length + 1}`);
    values.push(status);
  }

  if (dateFrom) {
    conditions.push(`p."paymentDate" >= $${values.length + 1}`);
    values.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(
      `p."paymentDate" < ($${values.length + 1}::date + INTERVAL '1 day')`,
    );
    values.push(dateTo);
  }

  /*
   * Term filtering is based on the charge to which
   * the payment was allocated.
   *
   * This is deliberately an EXISTS condition so a payment
   * cannot be duplicated simply because it has multiple
   * allocations.
   */
  if (termId) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM "PaymentAllocation" termAllocation
        INNER JOIN "StudentFeeCharge" termCharge
          ON termCharge.id = termAllocation."studentFeeChargeId"
        INNER JOIN "FeeStructureItem" termItem
          ON termItem.id = termCharge."feeStructureItemId"
        INNER JOIN "FeeStructure" termStructure
          ON termStructure.id = termItem."feeStructureId"
        WHERE termAllocation."paymentId" = p.id
          AND termStructure."termId" = $${values.length + 1}
      )
    `);

    values.push(termId);
  }

  const whereClause = conditions.join("\nAND ");

  const baseQuery = `
    SELECT
      p.id AS "paymentId",

      p.amount,
      p.method,
      p.reference,
      p.status,
      p."paymentDate",
      p.notes,

      p."createdAt",
      p."updatedAt",

      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      se.id AS "studentEnrollmentId",
      se.status AS "enrollmentStatus",

      ay.id AS "academicYearId",
      ay.name AS "academicYear",

      c.id AS "classId",
      c.name AS "className",

      st.id AS "streamId",
      st.name AS "streamName",

      u.id AS "receivedByUserId",
      u.role AS "receivedByRole",

      COALESCE(
        (
          SELECT SUM(pa.amount)
          FROM "PaymentAllocation" pa
          WHERE pa."paymentId" = p.id
        ),
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

    INNER JOIN "User" u
      ON u.id = p."receivedByUserId"

    WHERE ${whereClause}
  `;

  const paginatedQuery = `
    WITH payment_report AS (
      ${baseQuery}
    )

    SELECT *
    FROM payment_report

    ORDER BY
      "paymentDate" DESC,
      "createdAt" DESC

    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const countQuery = `
    WITH payment_report AS (
      ${baseQuery}
    )

    SELECT COUNT(*)::INTEGER AS total
    FROM payment_report
  `;

  const paginatedValues = [...values, parsedLimit, offset];

  const [result, countResult] = await Promise.all([
    pool.query(paginatedQuery, paginatedValues),
    pool.query(countQuery, values),
  ]);

  const total = Number(countResult.rows[0].total);

  const totalPages = total === 0 ? 0 : Math.ceil(total / parsedLimit);

  const payments = result.rows.map((row) => {
    const amount = Number(row.amount);
    const allocatedAmount = Number(row.allocatedAmount);

    return {
      id: row.paymentId,

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
        academicYear: String(row.academicYear),
        classId: row.classId,
        className: row.className,
        streamId: row.streamId,
        streamName: row.streamName,
        status: row.enrollmentStatus,
      },

      amount,
      method: row.method,
      reference: row.reference,
      status: row.status,
      paymentDate: row.paymentDate,
      notes: row.notes,

      allocatedAmount,
      unallocatedAmount: amount - allocatedAmount,

      receivedBy: {
        id: row.receivedByUserId,
        role: row.receivedByRole,
      },

      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });

  return {
    payments,

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPreviousPage: parsedPage > 1,
    },

    filters: {
      academicYearId: academicYearId || null,
      termId: termId || null,
      classId: classId || null,
      streamId: streamId || null,
      method: method || null,
      status: status || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    },
  };
}
