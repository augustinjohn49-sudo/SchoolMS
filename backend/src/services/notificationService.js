import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

const VALID_NOTIFICATION_TYPES = [
  "ANNOUNCEMENT",
  "ATTENDANCE",
  "EXAM",
  "RESULT",
  "FEE",
  "GENERAL",
];

export const createNotification = async ({
  schoolId,
  title,
  message,
  type,
  recipientUserIds,
  deduplicationKey = null,
}) => {
  if (!schoolId) {
    const error = new Error("School is required");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!title?.trim() || !message?.trim() || !type) {
    const error = new Error(
      "Title, message, and notification type are required",
    );
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  if (!VALID_NOTIFICATION_TYPES.includes(type)) {
    const error = new Error(`Invalid notification type: ${type}`);
    error.code = "INVALID_NOTIFICATION_TYPE";
    throw error;
  }

  if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
    const error = new Error("At least one notification recipient is required");
    error.code = "RECIPIENTS_REQUIRED";
    throw error;
  }

  const uniqueRecipientUserIds = [...new Set(recipientUserIds)];

  const usersResult = await pool.query(
    `
      SELECT
        id,
        "schoolId" AS "schoolId",
        status
      FROM "User"
      WHERE id = ANY($1)
        AND "schoolId" = $2
        AND status = 'ACTIVE'
    `,
    [uniqueRecipientUserIds, schoolId],
  );

  if (usersResult.rows.length !== uniqueRecipientUserIds.length) {
    const error = new Error(
      "One or more notification recipients were not found, are inactive, or belong to another school",
    );
    error.code = "INVALID_RECIPIENTS";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const notificationId = randomUUID();

    const notificationResult = await client.query(
      `
        INSERT INTO "Notification" (
          id,
          "schoolId",
          title,
          message,
          type,
          "deduplicationKey",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("deduplicationKey")
        DO NOTHING
        RETURNING
          id,
          "schoolId" AS "schoolId",
          title,
          message,
          type,
          "deduplicationKey" AS "deduplicationKey",
          "createdAt" AS "createdAt",
          "updatedAt" AS "updatedAt"
      `,
      [
        notificationId,
        schoolId,
        title.trim(),
        message.trim(),
        type,
        deduplicationKey,
      ],
    );

    if (notificationResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return {
        duplicate: true,
        recipientCount: 0,
      };
    }

    for (const user of usersResult.rows) {
      await client.query(
        `
          INSERT INTO "NotificationRecipient" (
            id,
            "notificationId",
            "userId",
            "isRead",
            "readAt",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            $1,
            $2,
            $3,
            false,
            NULL,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT ("notificationId", "userId")
          DO NOTHING
        `,
        [randomUUID(), notificationId, user.id],
      );
    }

    await client.query("COMMIT");

    return {
      ...notificationResult.rows[0],
      recipientCount: usersResult.rows.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getNotificationsForUser = async ({
  schoolId,
  userId,
  isRead,
  type,
  page = 1,
  limit = 20,
}) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const offset = (parsedPage - 1) * parsedLimit;

  const conditions = [`nr."userId" = $1`, `n."schoolId" = $2`];

  const values = [userId, schoolId];

  if (isRead !== undefined) {
    const readValue = isRead === true || isRead === "true" || isRead === "1";

    values.push(readValue);

    conditions.push(`nr."isRead" = $${values.length}`);
  }

  if (type) {
    if (!VALID_NOTIFICATION_TYPES.includes(type)) {
      const error = new Error(`Invalid notification type: ${type}`);
      error.code = "INVALID_NOTIFICATION_TYPE";
      throw error;
    }

    values.push(type);

    conditions.push(`n.type = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM "NotificationRecipient" nr

      INNER JOIN "Notification" n
        ON n.id = nr."notificationId"

      WHERE ${whereClause}
    `,
    values,
  );

  const total = countResult.rows[0].count;

  values.push(parsedLimit);
  const limitParameter = values.length;

  values.push(offset);
  const offsetParameter = values.length;

  const result = await pool.query(
    `
      SELECT
        n.id,
        n."schoolId" AS "schoolId",
        n.title,
        n.message,
        n.type,
        n."createdAt" AS "createdAt",
        n."updatedAt" AS "updatedAt",

        nr.id AS "recipientId",
        nr."isRead" AS "isRead",
        nr."readAt" AS "readAt"

      FROM "NotificationRecipient" nr

      INNER JOIN "Notification" n
        ON n.id = nr."notificationId"

      WHERE ${whereClause}

      ORDER BY
        nr."isRead" ASC,
        n."createdAt" DESC

      LIMIT $${limitParameter}
      OFFSET $${offsetParameter}
    `,
    values,
  );

  return {
    notifications: result.rows,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

export const getNotificationById = async ({
  schoolId,
  userId,
  notificationId,
}) => {
  const result = await pool.query(
    `
      SELECT
        n.id,
        n."schoolId" AS "schoolId",
        n.title,
        n.message,
        n.type,
        n."createdAt" AS "createdAt",
        n."updatedAt" AS "updatedAt",

        nr.id AS "recipientId",
        nr."userId" AS "userId",
        nr."isRead" AS "isRead",
        nr."readAt" AS "readAt",
        nr."createdAt" AS "recipientCreatedAt",
        nr."updatedAt" AS "recipientUpdatedAt"

      FROM "NotificationRecipient" nr

      INNER JOIN "Notification" n
        ON n.id = nr."notificationId"

      WHERE n.id = $1
        AND n."schoolId" = $2
        AND nr."userId" = $3

      LIMIT 1
    `,
    [notificationId, schoolId, userId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Notification not found");
    error.code = "NOTIFICATION_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
};

export const markNotificationAsRead = async ({
  schoolId,
  userId,
  notificationId,
}) => {
  const result = await pool.query(
    `
      UPDATE "NotificationRecipient" nr

      SET
        "isRead" = true,
        "readAt" = COALESCE(
          nr."readAt",
          CURRENT_TIMESTAMP
        ),
        "updatedAt" = CURRENT_TIMESTAMP

      FROM "Notification" n

      WHERE nr."notificationId" = n.id
        AND nr."notificationId" = $1
        AND nr."userId" = $2
        AND n."schoolId" = $3

      RETURNING
        nr.id,
        nr."notificationId" AS "notificationId",
        nr."userId" AS "userId",
        nr."isRead" AS "isRead",
        nr."readAt" AS "readAt",
        nr."createdAt" AS "createdAt",
        nr."updatedAt" AS "updatedAt"
    `,
    [notificationId, userId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Notification recipient record not found");
    error.code = "NOTIFICATION_RECIPIENT_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
};

export const markAllNotificationsAsRead = async ({ schoolId, userId }) => {
  const result = await pool.query(
    `
      UPDATE "NotificationRecipient" nr

      SET
        "isRead" = true,
        "readAt" = COALESCE(
          nr."readAt",
          CURRENT_TIMESTAMP
        ),
        "updatedAt" = CURRENT_TIMESTAMP

      FROM "Notification" n

      WHERE nr."notificationId" = n.id
        AND nr."userId" = $1
        AND n."schoolId" = $2
        AND nr."isRead" = false

      RETURNING nr.id
    `,
    [userId, schoolId],
  );

  return {
    updatedCount: result.rows.length,
  };
};

export const getUnreadNotificationCount = async ({ schoolId, userId }) => {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM "NotificationRecipient" nr

      INNER JOIN "Notification" n
        ON n.id = nr."notificationId"

      WHERE nr."userId" = $1
        AND n."schoolId" = $2
        AND nr."isRead" = false
    `,
    [userId, schoolId],
  );

  return {
    unreadCount: result.rows[0].count,
  };
};
