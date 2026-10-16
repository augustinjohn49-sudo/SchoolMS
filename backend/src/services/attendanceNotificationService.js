import pool from "../config/prisma.js";
import { getLowAttendanceAlerts } from "./attendanceAlertService.js";
import { createNotification } from "./notificationService.js";

export async function generateLowAttendanceNotifications({
  schoolId,
  dateFrom,
  dateTo,
  threshold = 75,
  academicYearId = null,
  classId = null,
}) {
  if (!schoolId) {
    const error = new Error("School ID is required.");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  const report = await getLowAttendanceAlerts({
    schoolId,
    dateFrom,
    dateTo,
    threshold,
    academicYearId,
    classId,
  });

  if (report.alerts.length === 0) {
    return {
      reportingPeriod: { dateFrom, dateTo },
      threshold: Number(threshold),
      studentsBelowThreshold: 0,
      notificationsCreated: 0,
      duplicatesSkipped: 0,
    };
  }

  const administratorsResult = await pool.query(
    `
      SELECT id
      FROM "User"
      WHERE "schoolId" = $1
        AND role = 'SCHOOL_ADMIN'
        AND status = 'ACTIVE'
      ORDER BY id
    `,
    [schoolId],
  );

  const recipientUserIds = administratorsResult.rows.map(
    (administrator) => administrator.id,
  );

  if (recipientUserIds.length === 0) {
    const error = new Error(
      "No active school administrators were found for this school.",
    );
    error.code = "NO_ACTIVE_SCHOOL_ADMIN";
    throw error;
  }

  let notificationsCreated = 0;
  let duplicatesSkipped = 0;

  for (const student of report.alerts) {
    const studentName = [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const deduplicationKey = JSON.stringify([
      "attendance",
      schoolId,
      student.studentId,
      dateFrom,
      dateTo,
      Number(threshold),
      academicYearId,
      classId,
    ]);

    const notification = await createNotification({
      schoolId,
      title: "Low Student Attendance",
      message:
        `${studentName} (${student.admissionNumber}) has ` +
        `${student.attendancePercentage}% attendance ` +
        `from ${dateFrom} to ${dateTo}, below the ` +
        `${Number(threshold)}% threshold. ` +
        `Class: ${student.className}.`,
      type: "ATTENDANCE",
      recipientUserIds,
      deduplicationKey,
    });

    if (notification.duplicate) {
      duplicatesSkipped += 1;
    } else {
      notificationsCreated += 1;
    }
  }

  return {
    reportingPeriod: { dateFrom, dateTo },
    threshold: Number(threshold),
    studentsBelowThreshold: report.alerts.length,
    notificationsCreated,
    duplicatesSkipped,
  };
}
