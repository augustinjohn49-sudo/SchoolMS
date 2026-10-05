import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

/**
 * Create a student fee charge.
 */
export const createStudentFeeCharge = async ({
  schoolId,
  studentEnrollmentId,
  feeStructureItemId = null,
  name,
  amount,
  dueDate = null,
}) => {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (
    !studentEnrollmentId ||
    !name ||
    amount === undefined ||
    amount === null
  ) {
    const error = new Error(
      "Student enrollment, charge name, and amount are required.",
    );
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error("Amount must be greater than zero.");
    error.code = "INVALID_AMOUNT";
    throw error;
  }

  if (!name.trim()) {
    const error = new Error("Charge name is required.");
    error.code = "NAME_REQUIRED";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Verify that the student enrollment belongs to the school.
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
     * If a fee structure item is supplied, verify that it exists
     * and belongs to this school.
     */
    let feeStructureItem = null;

    if (feeStructureItemId) {
      const feeStructureItemResult = await client.query(
        `
        SELECT
          fsi.id,
          fsi."feeStructureId",
          fsi.name,
          fsi.type,
          fsi.amount,
          fsi.description,
          fs."schoolId",
          fs."academicYearId",
          fs."termId",
          fs."classId",
          fs."streamId",
          fs.name AS "feeStructureName",
          fs.status AS "feeStructureStatus"
        FROM "FeeStructureItem" fsi
        INNER JOIN "FeeStructure" fs
          ON fs.id = fsi."feeStructureId"
        WHERE fsi.id = $1
          AND fs."schoolId" = $2
        LIMIT 1
        `,
        [feeStructureItemId, schoolId],
      );

      if (feeStructureItemResult.rows.length === 0) {
        const error = new Error(
          "Fee structure item not found for this school.",
        );
        error.code = "FEE_STRUCTURE_ITEM_NOT_FOUND";
        throw error;
      }

      feeStructureItem = feeStructureItemResult.rows[0];

      /*
       * Ensure the fee item belongs to the same academic year
       * and class as the student's enrollment.
       */
      if (
        feeStructureItem.academicYearId !== enrollment.academicYearId ||
        feeStructureItem.classId !== enrollment.classId
      ) {
        const error = new Error(
          "Fee structure item does not belong to the student's enrollment.",
        );
        error.code = "FEE_STRUCTURE_ITEM_MISMATCH";
        throw error;
      }

      /*
       * If the fee structure targets a specific stream, make sure
       * the student's enrollment is in that stream.
       */
      if (
        feeStructureItem.streamId &&
        feeStructureItem.streamId !== enrollment.streamId
      ) {
        const error = new Error(
          "Fee structure item does not belong to the student's stream.",
        );
        error.code = "FEE_STRUCTURE_ITEM_MISMATCH";
        throw error;
      }
    }

    /*
     * Create the charge.
     *
     * The amount is intentionally stored on StudentFeeCharge rather
     * than being calculated dynamically from FeeStructureItem. This
     * preserves the historical amount owed by the student.
     */
    const chargeId = randomUUID();

    const chargeResult = await client.query(
      `
      INSERT INTO "StudentFeeCharge" (
        id,
        "studentEnrollmentId",
        "feeStructureItemId",
        name,
        amount,
        "dueDate",
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
        NOW(),
        NOW()
      )
      RETURNING
        id,
        "studentEnrollmentId",
        "feeStructureItemId",
        name,
        amount,
        "dueDate",
        "createdAt",
        "updatedAt"
      `,
      [
        chargeId,
        studentEnrollmentId,
        feeStructureItemId,
        name.trim(),
        numericAmount,
        dueDate,
      ],
    );

    await client.query("COMMIT");

    return {
      ...chargeResult.rows[0],
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
      feeStructureItem,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a student fee charge by ID.
 */
export const getStudentFeeChargeById = async ({
  schoolId,
  studentFeeChargeId,
}) => {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      sfc.id,
      sfc."studentEnrollmentId",
      sfc."feeStructureItemId",
      sfc.name,
      sfc.amount,
      sfc."dueDate",
      sfc."createdAt",
      sfc."updatedAt",

      se."studentId",
      se."academicYearId",
      se."classId",
      se."streamId",
      se.status AS "enrollmentStatus",

      s."schoolId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      ay.name AS "academicYearName",
      c.name AS "className",
      st.name AS "streamName",

      fsi.name AS "feeStructureItemName",
      fsi.type AS "feeStructureItemType",
      fsi.amount AS "feeStructureItemAmount",

      fs.id AS "feeStructureId",
      fs.name AS "feeStructureName",
      fs.status AS "feeStructureStatus"

    FROM "StudentFeeCharge" sfc

    INNER JOIN "StudentEnrollment" se
      ON se.id = sfc."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    INNER JOIN "Class" c
      ON c.id = se."classId"

    LEFT JOIN "Stream" st
      ON st.id = se."streamId"

    LEFT JOIN "FeeStructureItem" fsi
      ON fsi.id = sfc."feeStructureItemId"

    LEFT JOIN "FeeStructure" fs
      ON fs.id = fsi."feeStructureId"

    WHERE sfc.id = $1
      AND s."schoolId" = $2

    LIMIT 1
    `,
    [studentFeeChargeId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Student fee charge not found.");
    error.code = "STUDENT_FEE_CHARGE_NOT_FOUND";
    throw error;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    studentEnrollmentId: row.studentEnrollmentId,
    feeStructureItemId: row.feeStructureItemId,
    name: row.name,
    amount: row.amount,
    dueDate: row.dueDate,
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

    feeStructureItem: row.feeStructureItemId
      ? {
          id: row.feeStructureItemId,
          name: row.feeStructureItemName,
          type: row.feeStructureItemType,
          amount: row.feeStructureItemAmount,
          feeStructureId: row.feeStructureId,
          feeStructureName: row.feeStructureName,
          feeStructureStatus: row.feeStructureStatus,
        }
      : null,
  };
};

/**
 * Get student fee charges for a school.
 */
export const getStudentFeeCharges = async ({
  schoolId,
  studentEnrollmentId = null,
  feeStructureItemId = null,
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

  const conditions = [`s."schoolId" = $1`];
  const values = [schoolId];
  let parameterIndex = 2;

  if (studentEnrollmentId) {
    conditions.push(`sfc."studentEnrollmentId" = $${parameterIndex}`);
    values.push(studentEnrollmentId);
    parameterIndex += 1;
  }

  if (feeStructureItemId) {
    conditions.push(`sfc."feeStructureItemId" = $${parameterIndex}`);
    values.push(feeStructureItemId);
    parameterIndex += 1;
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM "StudentFeeCharge" sfc
    INNER JOIN "StudentEnrollment" se
      ON se.id = sfc."studentEnrollmentId"
    INNER JOIN "Student" s
      ON s.id = se."studentId"
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
      sfc.id,
      sfc."studentEnrollmentId",
      sfc."feeStructureItemId",
      sfc.name,
      sfc.amount,
      sfc."dueDate",
      sfc."createdAt",
      sfc."updatedAt",

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

      fsi.name AS "feeStructureItemName",
      fsi.type AS "feeStructureItemType",

      fs.id AS "feeStructureId",
      fs.name AS "feeStructureName"

    FROM "StudentFeeCharge" sfc

    INNER JOIN "StudentEnrollment" se
      ON se.id = sfc."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = se."academicYearId"

    INNER JOIN "Class" c
      ON c.id = se."classId"

    LEFT JOIN "Stream" st
      ON st.id = se."streamId"

    LEFT JOIN "FeeStructureItem" fsi
      ON fsi.id = sfc."feeStructureItemId"

    LEFT JOIN "FeeStructure" fs
      ON fs.id = fsi."feeStructureId"

    WHERE ${whereClause}

    ORDER BY sfc."createdAt" DESC

    LIMIT $${parameterIndex}
    OFFSET $${parameterIndex + 1}
    `,
    values,
  );

  return {
    studentFeeCharges: result.rows.map((row) => ({
      id: row.id,
      studentEnrollmentId: row.studentEnrollmentId,
      feeStructureItemId: row.feeStructureItemId,
      name: row.name,
      amount: row.amount,
      dueDate: row.dueDate,
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

      feeStructureItem: row.feeStructureItemId
        ? {
            id: row.feeStructureItemId,
            name: row.feeStructureItemName,
            type: row.feeStructureItemType,
            feeStructureId: row.feeStructureId,
            feeStructureName: row.feeStructureName,
          }
        : null,
    })),

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/**
 * Update a student fee charge.
 *
 * Charges that already have payments or adjustments should not be
 * freely modified because that could corrupt the financial history.
 */
export const updateStudentFeeCharge = async ({
  schoolId,
  studentFeeChargeId,
  name,
  amount,
  dueDate,
}) => {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const existingResult = await pool.query(
    `
    SELECT
      sfc.id,
      sfc.name,
      sfc.amount,
      sfc."dueDate"
    FROM "StudentFeeCharge" sfc
    INNER JOIN "StudentEnrollment" se
      ON se.id = sfc."studentEnrollmentId"
    INNER JOIN "Student" s
      ON s.id = se."studentId"
    WHERE sfc.id = $1
      AND s."schoolId" = $2
    LIMIT 1
    `,
    [studentFeeChargeId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Student fee charge not found.");
    error.code = "STUDENT_FEE_CHARGE_NOT_FOUND";
    throw error;
  }

  const paymentResult = await pool.query(
    `
    SELECT 1
    FROM "PaymentAllocation"
    WHERE "studentFeeChargeId" = $1
    LIMIT 1
    `,
    [studentFeeChargeId],
  );

  if (paymentResult.rows.length > 0) {
    const error = new Error(
      "Student fee charge cannot be updated because it has payments.",
    );
    error.code = "FEE_CHARGE_HAS_PAYMENTS";
    throw error;
  }

  const adjustmentResult = await pool.query(
    `
    SELECT 1
    FROM "FeeAdjustment"
    WHERE "studentFeeChargeId" = $1
    LIMIT 1
    `,
    [studentFeeChargeId],
  );

  if (adjustmentResult.rows.length > 0) {
    const error = new Error(
      "Student fee charge cannot be updated because it has adjustments.",
    );
    error.code = "FEE_CHARGE_HAS_ADJUSTMENTS";
    throw error;
  }

  const current = existingResult.rows[0];

  const updatedName = name !== undefined ? String(name).trim() : current.name;

  if (!updatedName) {
    const error = new Error("Charge name is required.");
    error.code = "NAME_REQUIRED";
    throw error;
  }

  let updatedAmount = current.amount;

  if (amount !== undefined) {
    updatedAmount = Number(amount);

    if (!Number.isFinite(updatedAmount) || updatedAmount <= 0) {
      const error = new Error("Amount must be greater than zero.");
      error.code = "INVALID_AMOUNT";
      throw error;
    }
  }

  const updatedDueDate = dueDate !== undefined ? dueDate : current.dueDate;

  const result = await pool.query(
    `
    UPDATE "StudentFeeCharge"
    SET
      name = $1,
      amount = $2,
      "dueDate" = $3,
      "updatedAt" = NOW()
    WHERE id = $4
    RETURNING
      id,
      "studentEnrollmentId",
      "feeStructureItemId",
      name,
      amount,
      "dueDate",
      "createdAt",
      "updatedAt"
    `,
    [updatedName, updatedAmount, updatedDueDate, studentFeeChargeId],
  );

  return result.rows[0];
};

/**
 * Delete a student fee charge.
 */
export const deleteStudentFeeCharge = async ({
  schoolId,
  studentFeeChargeId,
}) => {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const existingResult = await pool.query(
    `
    SELECT sfc.id
    FROM "StudentFeeCharge" sfc
    INNER JOIN "StudentEnrollment" se
      ON se.id = sfc."studentEnrollmentId"
    INNER JOIN "Student" s
      ON s.id = se."studentId"
    WHERE sfc.id = $1
      AND s."schoolId" = $2
    LIMIT 1
    `,
    [studentFeeChargeId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Student fee charge not found.");
    error.code = "STUDENT_FEE_CHARGE_NOT_FOUND";
    throw error;
  }

  const paymentResult = await pool.query(
    `
    SELECT 1
    FROM "PaymentAllocation"
    WHERE "studentFeeChargeId" = $1
    LIMIT 1
    `,
    [studentFeeChargeId],
  );

  if (paymentResult.rows.length > 0) {
    const error = new Error(
      "Student fee charge cannot be deleted because it has payments.",
    );
    error.code = "FEE_CHARGE_HAS_PAYMENTS";
    throw error;
  }

  const adjustmentResult = await pool.query(
    `
    SELECT 1
    FROM "FeeAdjustment"
    WHERE "studentFeeChargeId" = $1
    LIMIT 1
    `,
    [studentFeeChargeId],
  );

  if (adjustmentResult.rows.length > 0) {
    const error = new Error(
      "Student fee charge cannot be deleted because it has adjustments.",
    );
    error.code = "FEE_CHARGE_HAS_ADJUSTMENTS";
    throw error;
  }

  await pool.query(
    `
    DELETE FROM "StudentFeeCharge"
    WHERE id = $1
    `,
    [studentFeeChargeId],
  );

  return {
    id: studentFeeChargeId,
  };
};
