import { randomUUID } from "crypto";

import pool from "../config/prisma.js";

function validateTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return false;
  }

  const [hours, minutes] = time.split(":").map(Number);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function validateDayOfWeek(dayOfWeek) {
  return Number.isInteger(dayOfWeek) && dayOfWeek >= 1 && dayOfWeek <= 6;
}

export async function createTimetableEntry({
  schoolId,
  classId,
  teacherClassSubjectId,
  dayOfWeek,
  startTime,
  endTime,
  room = null,
  notes = null,
}) {
  if (!validateDayOfWeek(dayOfWeek)) {
    const error = new Error("dayOfWeek must be an integer between 1 and 6.");

    error.code = "INVALID_DAY";
    throw error;
  }

  if (!validateTime(startTime) || !validateTime(endTime)) {
    const error = new Error("startTime and endTime must use HH:MM format.");

    error.code = "INVALID_TIME";
    throw error;
  }

  if (startTime >= endTime) {
    const error = new Error("startTime must be earlier than endTime.");

    error.code = "INVALID_TIME_RANGE";
    throw error;
  }

  const classResult = await pool.query(
    `
    SELECT
      c.id,
      c.name,
      ay.id AS "academicYearId",
      ay.name AS "academicYearName",
      ay."schoolId"
    FROM "Class" c
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE c.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [classId, schoolId],
  );

  const classRecord = classResult.rows[0];

  if (!classRecord) {
    const error = new Error("Class not found.");
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const teacherSubjectResult = await pool.query(
    `
    SELECT
      tcs.id,
      tcs."staffId",
      cs."classId",
      cs."subjectId",
      st."firstName" AS "teacherFirstName",
      st."lastName" AS "teacherLastName",
      s.name AS "subjectName",
      s.code AS "subjectCode"
    FROM "TeacherClassSubject" tcs
    INNER JOIN "Staff" st
      ON st.id = tcs."staffId"
    INNER JOIN "ClassSubject" cs
      ON cs.id = tcs."classSubjectId"
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    INNER JOIN "Class" c
      ON c.id = cs."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE tcs.id = $1
      AND cs."classId" = $2
      AND ay."schoolId" = $3
      AND st."schoolId" = $3
    LIMIT 1
    `,
    [teacherClassSubjectId, classId, schoolId],
  );

  const teacherSubject = teacherSubjectResult.rows[0];

  if (!teacherSubject) {
    const error = new Error(
      "Teacher-class-subject assignment not found for this class.",
    );

    error.code = "TEACHER_CLASS_SUBJECT_NOT_FOUND";
    throw error;
  }

  const teacherConflictResult = await pool.query(
    `
    SELECT te.id
    FROM "TimetableEntry" te
    INNER JOIN "TeacherClassSubject" tcs
        ON tcs.id = te."teacherClassSubjectId"
    WHERE tcs."staffId" = $1
        AND te."dayOfWeek" = $2
        AND te."startTime" < $4
        AND te."endTime" > $3
    LIMIT 1
    `,
    [teacherSubject.staffId, dayOfWeek, startTime, endTime],
  );

  if (teacherConflictResult.rows.length > 0) {
    const error = new Error(
      "The teacher already has a timetable entry during this time.",
    );

    error.code = "TEACHER_TIMETABLE_CONFLICT";
    throw error;
  }

  const classConflictResult = await pool.query(
    `
    SELECT id
    FROM "TimetableEntry"
    WHERE "classId" = $1
      AND "dayOfWeek" = $2
      AND "startTime" < $4
      AND "endTime" > $3
    LIMIT 1
    `,
    [classId, dayOfWeek, startTime, endTime],
  );

  if (classConflictResult.rows.length > 0) {
    const error = new Error(
      "The class already has a timetable entry during this time.",
    );

    error.code = "CLASS_TIMETABLE_CONFLICT";
    throw error;
  }

  const id = randomUUID();
  const now = new Date();

  const result = await pool.query(
    `
    INSERT INTO "TimetableEntry"
    (
      id,
      "classId",
      "teacherClassSubjectId",
      "dayOfWeek",
      "startTime",
      "endTime",
      room,
      notes,
      "createdAt",
      "updatedAt"
    )
    VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING
      id,
      "classId",
      "teacherClassSubjectId",
      "dayOfWeek",
      "startTime",
      "endTime",
      room,
      notes,
      "createdAt",
      "updatedAt"
    `,
    [
      id,
      classId,
      teacherClassSubjectId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      notes,
      now,
      now,
    ],
  );

  return result.rows[0];
}

export async function getClassTimetable({ schoolId, classId }) {
  const classResult = await pool.query(
    `
    SELECT
      c.id,
      c.name
    FROM "Class" c
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    WHERE c.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [classId, schoolId],
  );

  if (classResult.rows.length === 0) {
    const error = new Error("Class not found.");
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      te.id,
      te."classId",
      c.name AS "className",
      te."teacherClassSubjectId",
      st.id AS "staffId",
      st."firstName" AS "teacherFirstName",
      st."lastName" AS "teacherLastName",
      s.id AS "subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode",
      te."dayOfWeek",
      te."startTime",
      te."endTime",
      te.room,
      te.notes,
      te."createdAt",
      te."updatedAt"
    FROM "TimetableEntry" te
    INNER JOIN "Class" c
      ON c.id = te."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    INNER JOIN "TeacherClassSubject" tcs
      ON tcs.id = te."teacherClassSubjectId"
    INNER JOIN "Staff" st
      ON st.id = tcs."staffId"
    INNER JOIN "ClassSubject" cs
      ON cs.id = tcs."classSubjectId"
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    WHERE te."classId" = $1
      AND ay."schoolId" = $2
    ORDER BY te."dayOfWeek" ASC, te."startTime" ASC
    `,
    [classId, schoolId],
  );

  return result.rows;
}

export async function getTimetableEntryById({ schoolId, timetableEntryId }) {
  const result = await pool.query(
    `
    SELECT
      te.id,
      te."classId",
      c.name AS "className",
      te."teacherClassSubjectId",
      st.id AS "staffId",
      st."firstName" AS "teacherFirstName",
      st."lastName" AS "teacherLastName",
      s.id AS "subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode",
      te."dayOfWeek",
      te."startTime",
      te."endTime",
      te.room,
      te.notes,
      te."createdAt",
      te."updatedAt"
    FROM "TimetableEntry" te
    INNER JOIN "Class" c
      ON c.id = te."classId"
    INNER JOIN "AcademicYear" ay
      ON ay.id = c."academicYearId"
    INNER JOIN "TeacherClassSubject" tcs
      ON tcs.id = te."teacherClassSubjectId"
    INNER JOIN "Staff" st
      ON st.id = tcs."staffId"
    INNER JOIN "ClassSubject" cs
      ON cs.id = tcs."classSubjectId"
    INNER JOIN "Subject" s
      ON s.id = cs."subjectId"
    WHERE te.id = $1
      AND ay."schoolId" = $2
    LIMIT 1
    `,
    [timetableEntryId, schoolId],
  );

  const entry = result.rows[0];

  if (!entry) {
    const error = new Error("Timetable entry not found.");
    error.code = "TIMETABLE_ENTRY_NOT_FOUND";
    throw error;
  }

  return entry;
}

export async function updateTimetableEntry({
  schoolId,
  timetableEntryId,
  dayOfWeek,
  startTime,
  endTime,
  room,
  notes,
}) {
  const existingEntry = await getTimetableEntryById({
    schoolId,
    timetableEntryId,
  });

  const nextDay = dayOfWeek === undefined ? existingEntry.dayOfWeek : dayOfWeek;

  const nextStartTime =
    startTime === undefined ? existingEntry.startTime : startTime;

  const nextEndTime = endTime === undefined ? existingEntry.endTime : endTime;

  if (!validateDayOfWeek(nextDay)) {
    const error = new Error("dayOfWeek must be an integer between 1 and 6.");

    error.code = "INVALID_DAY";
    throw error;
  }

  if (!validateTime(nextStartTime) || !validateTime(nextEndTime)) {
    const error = new Error("startTime and endTime must use HH:MM format.");

    error.code = "INVALID_TIME";
    throw error;
  }

  if (nextStartTime >= nextEndTime) {
    const error = new Error("startTime must be earlier than endTime.");

    error.code = "INVALID_TIME_RANGE";
    throw error;
  }

  const teacherConflictResult = await pool.query(
    `
    SELECT te.id
    FROM "TimetableEntry" te
    INNER JOIN "TeacherClassSubject" tcs
        ON tcs.id = te."teacherClassSubjectId"
    WHERE tcs."staffId" = $1
        AND te."dayOfWeek" = $2
        AND te."startTime" < $4
        AND te."endTime" > $3
        AND te.id <> $5
    LIMIT 1
    `,
    [
      existingEntry.staffId,
      nextDay,
      nextStartTime,
      nextEndTime,
      timetableEntryId,
    ],
  );

  if (teacherConflictResult.rows.length > 0) {
    const error = new Error(
      "The teacher already has a timetable entry during this time.",
    );

    error.code = "TEACHER_TIMETABLE_CONFLICT";
    throw error;
  }

  const classConflictResult = await pool.query(
    `
    SELECT id
    FROM "TimetableEntry"
    WHERE "classId" = $1
      AND "dayOfWeek" = $2
      AND "startTime" < $4
      AND "endTime" > $3
      AND id <> $5
    LIMIT 1
    `,
    [
      existingEntry.classId,
      nextDay,
      nextStartTime,
      nextEndTime,
      timetableEntryId,
    ],
  );

  if (classConflictResult.rows.length > 0) {
    const error = new Error(
      "The class already has a timetable entry during this time.",
    );

    error.code = "CLASS_TIMETABLE_CONFLICT";
    throw error;
  }

  const result = await pool.query(
    `
    UPDATE "TimetableEntry"
    SET
      "dayOfWeek" = $1,
      "startTime" = $2,
      "endTime" = $3,
      room = $4,
      notes = $5,
      "updatedAt" = $6
    WHERE id = $7
    RETURNING
      id,
      "classId",
      "teacherClassSubjectId",
      "dayOfWeek",
      "startTime",
      "endTime",
      room,
      notes,
      "createdAt",
      "updatedAt"
    `,
    [
      nextDay,
      nextStartTime,
      nextEndTime,
      room === undefined ? existingEntry.room : room,
      notes === undefined ? existingEntry.notes : notes,
      new Date(),
      timetableEntryId,
    ],
  );

  return result.rows[0];
}

export async function deleteTimetableEntry({ schoolId, timetableEntryId }) {
  await getTimetableEntryById({
    schoolId,
    timetableEntryId,
  });

  await pool.query(
    `
    DELETE FROM "TimetableEntry"
    WHERE id = $1
    `,
    [timetableEntryId],
  );

  return {
    id: timetableEntryId,
  };
}
