import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

export async function createReportCard({
  schoolId,
  studentEnrollmentId,
  academicYearId,
  termId,
  gradingScaleId,
  title = null,
  overallRemarks = null,
  classTeacherComment = null,
  headTeacherComment = null,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!studentEnrollmentId) {
    const error = new Error("Student enrollment ID is required.");
    error.code = "STUDENT_ENROLLMENT_REQUIRED";
    throw error;
  }

  if (!academicYearId) {
    const error = new Error("Academic year ID is required.");
    error.code = "ACADEMIC_YEAR_REQUIRED";
    throw error;
  }

  if (!termId) {
    const error = new Error("Term ID is required.");
    error.code = "TERM_REQUIRED";
    throw error;
  }

  if (!gradingScaleId) {
    const error = new Error("Grading scale ID is required.");
    error.code = "GRADING_SCALE_REQUIRED";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
        s."lastName"
      FROM "StudentEnrollment" se
      INNER JOIN "Student" s
        ON s.id = se."studentId"
      WHERE se.id = $1
        AND s."schoolId" = $2
      LIMIT 1
      `,
      [studentEnrollmentId, schoolId],
    );

    if (enrollmentResult.rows.length === 0) {
      const error = new Error("Student enrollment not found.");
      error.code = "STUDENT_ENROLLMENT_NOT_FOUND";
      throw error;
    }

    const enrollment = enrollmentResult.rows[0];

    if (enrollment.academicYearId !== academicYearId) {
      const error = new Error(
        "Student enrollment does not belong to the specified academic year.",
      );
      error.code = "ACADEMIC_YEAR_MISMATCH";
      throw error;
    }

    const termResult = await client.query(
      `
      SELECT
        id,
        "academicYearId",
        name,
        "startDate",
        "endDate",
        status
      FROM "Term"
      WHERE id = $1
        AND "academicYearId" = $2
      LIMIT 1
      `,
      [termId, academicYearId],
    );

    if (termResult.rows.length === 0) {
      const error = new Error(
        "Term not found or does not belong to the specified academic year.",
      );
      error.code = "TERM_NOT_FOUND";
      throw error;
    }

    const term = termResult.rows[0];

    const gradingScaleResult = await client.query(
      `
      SELECT
        id,
        "schoolId",
        name,
        description,
        "isDefault"
      FROM "GradingScale"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
      `,
      [gradingScaleId, schoolId],
    );

    if (gradingScaleResult.rows.length === 0) {
      const error = new Error("Grading scale not found.");
      error.code = "GRADING_SCALE_NOT_FOUND";
      throw error;
    }

    const gradingScale = gradingScaleResult.rows[0];

    const existingResult = await client.query(
      `
      SELECT id
      FROM "ReportCard"
      WHERE "studentEnrollmentId" = $1
        AND "termId" = $2
      LIMIT 1
      `,
      [studentEnrollmentId, termId],
    );

    if (existingResult.rows.length > 0) {
      const error = new Error(
        "A report card already exists for this student enrollment and term.",
      );
      error.code = "REPORT_CARD_EXISTS";
      throw error;
    }

    const reportCardId = randomUUID();
    const now = new Date();

    const insertResult = await client.query(
      `
    INSERT INTO "ReportCard" (
      id,
      "studentEnrollmentId",
      "academicYearId",
      "termId",
      "gradingScaleId",
      title,
      "overallRemarks",
      "classTeacherComment",
      "headTeacherComment",
      "generatedAt",
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
      $9,
      $10,
      $11,
      $12
    )
    RETURNING
      id,
      "studentEnrollmentId",
      "academicYearId",
      "termId",
      "gradingScaleId",
      title,
      "overallRemarks",
      "classTeacherComment",
      "headTeacherComment",
      "generatedAt",
      "createdAt",
      "updatedAt"
  `,
      [
        reportCardId,
        studentEnrollmentId,
        academicYearId,
        termId,
        gradingScaleId,
        title,
        overallRemarks,
        classTeacherComment,
        headTeacherComment,
        null,
        now,
        now,
      ],
    );

    await client.query("COMMIT");

    return {
      ...insertResult.rows[0],
      enrollment,
      term,
      gradingScale,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const duplicateError = new Error(
        "A report card already exists for this student enrollment and term.",
      );
      duplicateError.code = "REPORT_CARD_EXISTS";
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function createReportCardSubject({
  schoolId,
  reportCardId,
  examResultId,
  remarks = null,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!reportCardId) {
    const error = new Error("Report card ID is required.");
    error.code = "REPORT_CARD_REQUIRED";
    throw error;
  }

  if (!examResultId) {
    const error = new Error("Exam result ID is required.");
    error.code = "EXAM_RESULT_REQUIRED";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reportCardResult = await client.query(
      `
      SELECT
        rc.id,
        rc."studentEnrollmentId",
        rc."academicYearId",
        rc."termId",
        rc."gradingScaleId",
        s."schoolId"
      FROM "ReportCard" rc
      INNER JOIN "StudentEnrollment" se
        ON se.id = rc."studentEnrollmentId"
      INNER JOIN "Student" s
        ON s.id = se."studentId"
      WHERE rc.id = $1
        AND s."schoolId" = $2
      LIMIT 1
      `,
      [reportCardId, schoolId],
    );

    if (reportCardResult.rows.length === 0) {
      const error = new Error("Report card not found.");
      error.code = "REPORT_CARD_NOT_FOUND";
      throw error;
    }

    const reportCard = reportCardResult.rows[0];

    const examResultQuery = await client.query(
      `
      SELECT
        er.id,
        er."studentId",
        er."examSubjectId",
        er.marks,
        er."maxMarks",
        er.remarks AS "resultRemarks",

        e."schoolId",
        e."academicYearId",
        e."termId",
        e.name AS "examName",

        es."classSubjectId",

        cs."classId",

        s.id AS "subjectId",
        s.name AS "subjectName",
        s.code AS "subjectCode"
      FROM "ExamResult" er
      INNER JOIN "ExamSubject" es
        ON es.id = er."examSubjectId"
      INNER JOIN "Exam" e
        ON e.id = es."examId"
      INNER JOIN "ClassSubject" cs
        ON cs.id = es."classSubjectId"
      INNER JOIN "Subject" s
        ON s.id = cs."subjectId"
      WHERE er.id = $1
        AND e."schoolId" = $2
      LIMIT 1
      `,
      [examResultId, schoolId],
    );

    if (examResultQuery.rows.length === 0) {
      const error = new Error("Exam result not found.");
      error.code = "EXAM_RESULT_NOT_FOUND";
      throw error;
    }

    const examResult = examResultQuery.rows[0];

    const enrollmentStudentResult = await client.query(
      `
      SELECT
        se."studentId",
        se."classId",
        se."academicYearId"
      FROM "StudentEnrollment" se
      WHERE se.id = $1
      LIMIT 1
      `,
      [reportCard.studentEnrollmentId],
    );

    if (enrollmentStudentResult.rows.length === 0) {
      const error = new Error("Student enrollment not found.");
      error.code = "STUDENT_ENROLLMENT_NOT_FOUND";
      throw error;
    }

    const enrollment = enrollmentStudentResult.rows[0];

    if (enrollment.studentId !== examResult.studentId) {
      const error = new Error(
        "Exam result does not belong to the student on this report card.",
      );
      error.code = "STUDENT_MISMATCH";
      throw error;
    }

    if (examResult.academicYearId !== reportCard.academicYearId) {
      const error = new Error(
        "Exam result does not belong to the report card academic year.",
      );
      error.code = "ACADEMIC_YEAR_MISMATCH";
      throw error;
    }

    if (examResult.termId !== reportCard.termId) {
      const error = new Error(
        "Exam result does not belong to the report card term.",
      );
      error.code = "TERM_MISMATCH";
      throw error;
    }

    if (examResult.classId !== enrollment.classId) {
      const error = new Error(
        "Exam result does not belong to the student's enrolled class.",
      );
      error.code = "CLASS_MISMATCH";
      throw error;
    }

    const numericMarks = Number(examResult.marks);
    const numericMaxMarks = Number(examResult.maxMarks);

    if (!Number.isFinite(numericMarks) || !Number.isFinite(numericMaxMarks)) {
      const error = new Error("Exam result contains invalid marks.");
      error.code = "INVALID_EXAM_RESULT_MARKS";
      throw error;
    }

    if (numericMaxMarks <= 0) {
      const error = new Error(
        "Exam result maximum marks must be greater than zero.",
      );
      error.code = "INVALID_EXAM_RESULT_MAX_MARKS";
      throw error;
    }

    const percentage = (numericMarks / numericMaxMarks) * 100;

    const gradeResult = await client.query(
      `
      SELECT
        id,
        name,
        "minPercentage",
        "maxPercentage",
        remarks
      FROM "Grade"
      WHERE "gradingScaleId" = $1
        AND $2 >= "minPercentage"
        AND $2 <= "maxPercentage"
      ORDER BY "minPercentage" DESC
      LIMIT 1
      `,
      [reportCard.gradingScaleId, percentage],
    );

    if (gradeResult.rows.length === 0) {
      const error = new Error(
        "No grade matches the exam result percentage in the report card grading scale.",
      );
      error.code = "GRADE_NOT_FOUND";
      throw error;
    }

    const grade = gradeResult.rows[0];

    const existingResult = await client.query(
      `
      SELECT id
      FROM "ReportCardSubject"
      WHERE "reportCardId" = $1
        AND "examResultId" = $2
      LIMIT 1
      `,
      [reportCardId, examResultId],
    );

    if (existingResult.rows.length > 0) {
      const error = new Error(
        "This exam result has already been added to the report card.",
      );
      error.code = "REPORT_CARD_SUBJECT_EXISTS";
      throw error;
    }

    const reportCardSubjectId = randomUUID();
    const now = new Date();

    const insertResult = await client.query(
      `
      INSERT INTO "ReportCardSubject" (
        id,
        "reportCardId",
        "examResultId",
        "subjectName",
        marks,
        "maxMarks",
        percentage,
        "gradeName",
        "gradeRemarks",
        remarks,
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
        $9,
        $10,
        $11,
        $12
      )
      RETURNING
        id,
        "reportCardId",
        "examResultId",
        "subjectName",
        marks,
        "maxMarks",
        percentage,
        "gradeName",
        "gradeRemarks",
        remarks,
        "createdAt",
        "updatedAt"
      `,
      [
        reportCardSubjectId,
        reportCardId,
        examResultId,
        examResult.subjectName,
        numericMarks,
        numericMaxMarks,
        percentage,
        grade.name,
        grade.remarks,
        remarks ?? examResult.resultRemarks ?? null,
        now,
        now,
      ],
    );

    await client.query("COMMIT");

    return {
      ...insertResult.rows[0],
      examResult: {
        id: examResult.id,
        examSubjectId: examResult.examSubjectId,
        examName: examResult.examName,
        subjectId: examResult.subjectId,
        subjectName: examResult.subjectName,
        subjectCode: examResult.subjectCode,
      },
      grade,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      const duplicateError = new Error(
        "This exam result has already been added to the report card.",
      );
      duplicateError.code = "REPORT_CARD_SUBJECT_EXISTS";
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function updateClassTeacherComment({
  schoolId,
  reportCardId,
  classTeacherComment,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!reportCardId) {
    const error = new Error("Report card ID is required.");
    error.code = "REPORT_CARD_REQUIRED";
    throw error;
  }

  const normalizedComment =
    classTeacherComment === null ||
    classTeacherComment === undefined ||
    String(classTeacherComment).trim() === ""
      ? null
      : String(classTeacherComment).trim();

  const result = await pool.query(
    `
      UPDATE "ReportCard" rc
      SET
        "classTeacherComment" = $1,
        "updatedAt" = NOW()
      FROM "StudentEnrollment" se
      INNER JOIN "Student" s
        ON s.id = se."studentId"
      WHERE rc.id = $2
        AND rc."studentEnrollmentId" = se.id
        AND s."schoolId" = $3
      RETURNING
        rc.id,
        rc."studentEnrollmentId",
        rc."academicYearId",
        rc."termId",
        rc."gradingScaleId",
        rc.title,
        rc."overallRemarks",
        rc."classTeacherComment",
        rc."headTeacherComment",
        rc."generatedAt",
        rc."createdAt",
        rc."updatedAt"
    `,
    [normalizedComment, reportCardId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Report card not found.");
    error.code = "REPORT_CARD_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function updateHeadTeacherComment({
  schoolId,
  reportCardId,
  headTeacherComment,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!reportCardId) {
    const error = new Error("Report card ID is required.");
    error.code = "REPORT_CARD_REQUIRED";
    throw error;
  }

  const normalizedComment =
    headTeacherComment === null ||
    headTeacherComment === undefined ||
    String(headTeacherComment).trim() === ""
      ? null
      : String(headTeacherComment).trim();

  const result = await pool.query(
    `
      UPDATE "ReportCard" rc
      SET
        "headTeacherComment" = $1,
        "updatedAt" = NOW()
      FROM "StudentEnrollment" se
      INNER JOIN "Student" s
        ON s.id = se."studentId"
      WHERE rc.id = $2
        AND rc."studentEnrollmentId" = se.id
        AND s."schoolId" = $3
      RETURNING
        rc.id,
        rc."studentEnrollmentId",
        rc."academicYearId",
        rc."termId",
        rc."gradingScaleId",
        rc.title,
        rc."overallRemarks",
        rc."classTeacherComment",
        rc."headTeacherComment",
        rc."generatedAt",
        rc."createdAt",
        rc."updatedAt"
    `,
    [normalizedComment, reportCardId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Report card not found.");
    error.code = "REPORT_CARD_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function getReportCards({
  schoolId,
  academicYearId = null,
  termId = null,
  studentId = null,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const values = [schoolId];

  let query = `
    SELECT
      rc.id,
      rc."studentEnrollmentId",
      rc."academicYearId",
      rc."termId",
      rc."gradingScaleId",

      rc.title,
      rc."overallRemarks",
      rc."classTeacherComment",
      rc."headTeacherComment",
      rc."generatedAt",
      rc."createdAt",
      rc."updatedAt",

      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      se."classId",
      se."streamId",
      se.status AS "enrollmentStatus",

      ay.name AS "academicYearName",

      t.name AS "termName",
      t.status AS "termStatus",

      gs.name AS "gradingScaleName",
      gs."isDefault" AS "gradingScaleIsDefault"

    FROM "ReportCard" rc

    INNER JOIN "StudentEnrollment" se
      ON se.id = rc."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = rc."academicYearId"

    INNER JOIN "Term" t
      ON t.id = rc."termId"

    INNER JOIN "GradingScale" gs
      ON gs.id = rc."gradingScaleId"

    WHERE s."schoolId" = $1
  `;

  if (academicYearId) {
    values.push(academicYearId);
    query += ` AND rc."academicYearId" = $${values.length}`;
  }

  if (termId) {
    values.push(termId);
    query += ` AND rc."termId" = $${values.length}`;
  }

  if (studentId) {
    values.push(studentId);
    query += ` AND s.id = $${values.length}`;
  }

  query += `
    ORDER BY rc."createdAt" DESC
  `;

  const result = await pool.query(query, values);

  return result.rows;
}

export async function getReportCardById({ schoolId, reportCardId }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!reportCardId) {
    const error = new Error("Report card ID is required.");
    error.code = "REPORT_CARD_REQUIRED";
    throw error;
  }

  const reportCardResult = await pool.query(
    `
    SELECT
      rc.id,
      rc."studentEnrollmentId",
      rc."academicYearId",
      rc."termId",
      rc."gradingScaleId",

      rc.title,
      rc."overallRemarks",
      rc."classTeacherComment",
      rc."headTeacherComment",
      rc."status",
      rc."generatedAt",
      rc."createdAt",
      rc."updatedAt",

      s.id AS "studentId",
      s."admissionNumber",
      s."firstName",
      s."middleName",
      s."lastName",

      se."classId",
      se."streamId",
      se.status AS "enrollmentStatus",

      ay.name AS "academicYearName",

      t.name AS "termName",
      t.status AS "termStatus",

      gs.name AS "gradingScaleName",
      gs."isDefault" AS "gradingScaleIsDefault"

    FROM "ReportCard" rc

    INNER JOIN "StudentEnrollment" se
      ON se.id = rc."studentEnrollmentId"

    INNER JOIN "Student" s
      ON s.id = se."studentId"

    INNER JOIN "AcademicYear" ay
      ON ay.id = rc."academicYearId"

    INNER JOIN "Term" t
      ON t.id = rc."termId"

    INNER JOIN "GradingScale" gs
      ON gs.id = rc."gradingScaleId"

    WHERE rc.id = $1
      AND s."schoolId" = $2

    LIMIT 1
    `,
    [reportCardId, schoolId],
  );

  if (reportCardResult.rows.length === 0) {
    const error = new Error("Report card not found.");
    error.code = "REPORT_CARD_NOT_FOUND";
    throw error;
  }

  const reportCard = reportCardResult.rows[0];

  const subjectsResult = await pool.query(
    `
      SELECT
        rcs.id,
        rcs."reportCardId",
        rcs."examResultId",
        rcs."subjectName",
        rcs.marks,
        rcs."maxMarks",
        rcs.percentage,
        rcs."gradeName",
        rcs."gradeRemarks",
        rcs.remarks,
        rcs."createdAt",
        rcs."updatedAt"
      FROM "ReportCardSubject" rcs
      WHERE rcs."reportCardId" = $1
      ORDER BY rcs."createdAt"
    `,
    [reportCardId],
  );

  // Get attendance summary for this student,
  // academic year, and term
  const attendanceResult = await pool.query(
    `
      SELECT
        COUNT(*)::int AS "totalDays",

        COUNT(*) FILTER (
          WHERE a.status = 'PRESENT'
        )::int AS present,

        COUNT(*) FILTER (
          WHERE a.status = 'ABSENT'
        )::int AS absent,

        COUNT(*) FILTER (
          WHERE a.status = 'LATE'
        )::int AS late,

        COUNT(*) FILTER (
          WHERE a.status = 'EXCUSED'
        )::int AS excused

      FROM "Attendance" a

      WHERE a."studentId" = $1
        AND a."academicYearId" = $2
        AND a."termId" = $3
    `,
    [reportCard.studentId, reportCard.academicYearId, reportCard.termId],
  );

  const attendance = attendanceResult.rows[0];

  const totalDays = Number(attendance.totalDays || 0);
  const present = Number(attendance.present || 0);
  const absent = Number(attendance.absent || 0);
  const late = Number(attendance.late || 0);
  const excused = Number(attendance.excused || 0);

  const attendancePercentage =
    totalDays > 0 ? Number(((present / totalDays) * 100).toFixed(2)) : 0;

  return {
    ...reportCard,

    subjects: subjectsResult.rows,

    attendance: {
      totalDays,
      present,
      absent,
      late,
      excused,
      attendancePercentage,
    },
  };
}

export async function approveReportCard({ schoolId, reportCardId }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!reportCardId) {
    const error = new Error("Report card ID is required.");
    error.code = "REPORT_CARD_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE "ReportCard" rc
      SET
        "status" = 'APPROVED',
        "updatedAt" = NOW()
      FROM "StudentEnrollment" se
      INNER JOIN "Student" s
        ON s."id" = se."studentId"
      WHERE rc."id" = $1
        AND rc."studentEnrollmentId" = se."id"
        AND s."schoolId" = $2
        AND rc."status" = 'DRAFT'
      RETURNING
        rc."id",
        rc."studentEnrollmentId",
        rc."academicYearId",
        rc."termId",
        rc."gradingScaleId",
        rc."title",
        rc."overallRemarks",
        rc."classTeacherComment",
        rc."headTeacherComment",
        rc."status",
        rc."generatedAt",
        rc."createdAt",
        rc."updatedAt"
    `,
    [reportCardId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Report card not found or cannot be approved.");
    error.code = "REPORT_CARD_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function publishReportCard({ schoolId, reportCardId }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!reportCardId) {
    const error = new Error("Report card ID is required.");
    error.code = "REPORT_CARD_REQUIRED";
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE "ReportCard" rc
      SET
        "status" = 'PUBLISHED',
        "generatedAt" = COALESCE(rc."generatedAt", NOW()),
        "updatedAt" = NOW()
      FROM "StudentEnrollment" se
      INNER JOIN "Student" s
        ON s."id" = se."studentId"
      WHERE rc."id" = $1
        AND rc."studentEnrollmentId" = se."id"
        AND s."schoolId" = $2
        AND rc."status" = 'APPROVED'
      RETURNING
        rc."id",
        rc."studentEnrollmentId",
        rc."academicYearId",
        rc."termId",
        rc."gradingScaleId",
        rc."title",
        rc."overallRemarks",
        rc."classTeacherComment",
        rc."headTeacherComment",
        rc."status",
        rc."generatedAt",
        rc."createdAt",
        rc."updatedAt"
    `,
    [reportCardId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Report card not found or cannot be published.");
    error.code = "REPORT_CARD_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function generateReportCard({ schoolId, reportCardId }) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!reportCardId) {
    const error = new Error("Report card ID is required.");
    error.code = "REPORT_CARD_REQUIRED";
    throw error;
  }

  const reportCard = await getReportCardById({
    schoolId,
    reportCardId,
  });

  if (reportCard.status !== "PUBLISHED") {
    const error = new Error("Only published report cards can be generated.");
    error.code = "REPORT_CARD_NOT_PUBLISHED";
    throw error;
  }

  return {
    ...reportCard,
    generatedAt: reportCard.generatedAt,
  };
}
