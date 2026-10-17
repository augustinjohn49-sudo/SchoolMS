import cron from "node-cron";
import pool from "../config/prisma.js";
import { generateLowAttendanceNotifications } from "./attendanceNotificationService.js";

const TIME_ZONE = "Africa/Nairobi";
const ATTENDANCE_THRESHOLD = 75;
const WEEKLY_SCHEDULE = "0 16 * * 5";

/**
 * Calculate the previous complete Monday–Sunday week
 * using the calendar date in Kenya.
 */
export function getPreviousFullWeek(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  const today = new Date(Date.UTC(values.year, values.month - 1, values.day));

  // Monday = 0, Tuesday = 1, ..., Sunday = 6.
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;

  const thisMonday = new Date(today);
  thisMonday.setUTCDate(today.getUTCDate() - daysSinceMonday);

  const previousMonday = new Date(thisMonday);
  previousMonday.setUTCDate(thisMonday.getUTCDate() - 7);

  const previousSunday = new Date(thisMonday);
  previousSunday.setUTCDate(thisMonday.getUTCDate() - 1);

  return {
    dateFrom: previousMonday.toISOString().slice(0, 10),
    dateTo: previousSunday.toISOString().slice(0, 10),
  };
}

/**
 * Read-only preview of the weekly job.
 * Does not generate or modify notifications.
 */
export async function dryRunWeeklyAttendanceNotificationJob({
  now = new Date(),
} = {}) {
  const { dateFrom, dateTo } = getPreviousFullWeek(now);

  const schoolsResult = await pool.query(`
    SELECT id, name
    FROM "School"
    WHERE status = 'ACTIVE'
    ORDER BY name
  `);

  const schools = schoolsResult.rows.map((school) => ({
    schoolId: school.id,
    schoolName: school.name,
    threshold: ATTENDANCE_THRESHOLD,
    reportingPeriod: { dateFrom, dateTo },
    action: "NOTIFICATIONS_NOT_CREATED",
  }));

  const summary = {
    dryRun: true,
    reportingPeriod: { dateFrom, dateTo },
    threshold: ATTENDANCE_THRESHOLD,
    activeSchoolsFound: schools.length,
    notificationsCreated: 0,
    databaseWritesPerformed: false,
    schools,
  };

  console.log("[Attendance scheduler] Dry run:", summary);

  return summary;
}

/**
 * Run the weekly notification job manually or from the scheduler.
 * Each school is processed independently so one failure won't
 * stop notifications for the remaining schools.
 */
export async function runWeeklyAttendanceNotificationJob({
  now = new Date(),
} = {}) {
  const { dateFrom, dateTo } = getPreviousFullWeek(now);

  console.log(`[Attendance scheduler] Processing ${dateFrom} to ${dateTo}`);

  const schoolsResult = await pool.query(`
    SELECT id, name
    FROM "School"
    WHERE status = 'ACTIVE'
    ORDER BY name
  `);

  const results = [];

  for (const school of schoolsResult.rows) {
    try {
      const result = await generateLowAttendanceNotifications({
        schoolId: school.id,
        dateFrom,
        dateTo,
        threshold: ATTENDANCE_THRESHOLD,
      });

      results.push({
        schoolId: school.id,
        schoolName: school.name,
        success: true,
        ...result,
      });

      console.log(
        `[Attendance scheduler] ${school.name}: ` +
          `${result.notificationsCreated} created, ` +
          `${result.duplicatesSkipped} duplicates skipped.`,
      );
    } catch (error) {
      results.push({
        schoolId: school.id,
        schoolName: school.name,
        success: false,
        error: error.message,
      });

      console.error(
        `[Attendance scheduler] Failed for ${school.name}:`,
        error.message,
      );
    }
  }

  const summary = {
    reportingPeriod: { dateFrom, dateTo },
    schoolsProcessed: results.length,
    schoolsFailed: results.filter((result) => !result.success).length,
    notificationsCreated: results.reduce(
      (total, result) => total + (result.notificationsCreated ?? 0),
      0,
    ),
    results,
  };

  console.log("[Attendance scheduler] Job completed:", summary);

  return summary;
}

/**
 * Scheduling is opt-in. It remains disabled unless the environment
 * variable is explicitly set to "true".
 */
export function startAttendanceNotificationScheduler() {
  if (process.env.ENABLE_ATTENDANCE_NOTIFICATION_SCHEDULER !== "true") {
    console.log(
      "[Attendance scheduler] Disabled. " +
        "ENABLE_ATTENDANCE_NOTIFICATION_SCHEDULER is not true.",
    );
    return null;
  }

  if (!cron.validate(WEEKLY_SCHEDULE)) {
    throw new Error("Invalid attendance scheduler cron expression.");
  }

  const job = cron.schedule(
    WEEKLY_SCHEDULE,
    () => {
      runWeeklyAttendanceNotificationJob().catch((error) => {
        console.error("[Attendance scheduler] Job failed:", error);
      });
    },
    { timezone: TIME_ZONE },
  );

  console.log(
    "[Attendance scheduler] Scheduled every Friday at 4:00 PM Africa/Nairobi.",
  );

  return job;
}
