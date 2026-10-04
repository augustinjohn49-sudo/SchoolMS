import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

const VALID_AUDIENCES = ["ALL", "TEACHERS", "PARENTS", "STUDENTS"];

const AUDIENCE_ROLES = {
  TEACHERS: ["TEACHER"],
  PARENTS: ["PARENT"],
  STUDENTS: ["STUDENT"],
};

/**
 * Create a new announcement as a draft.
 */
export const createAnnouncement = async ({
  schoolId,
  createdByUserId,
  title,
  content,
  audience,
}) => {
  if (!schoolId) {
    const error = new Error("School is required");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!title?.trim() || !content?.trim() || !audience) {
    const error = new Error("Title, content, and audience are required");
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  if (!VALID_AUDIENCES.includes(audience)) {
    const error = new Error(`Invalid announcement audience: ${audience}`);
    error.code = "INVALID_AUDIENCE";
    throw error;
  }

  // Verify the creator belongs to this school.
  const creatorResult = await pool.query(
    `
      SELECT
        id,
        "schoolId",
        role,
        status
      FROM "User"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
    `,
    [createdByUserId, schoolId],
  );

  if (creatorResult.rows.length === 0) {
    const error = new Error("Announcement creator not found");
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  const creator = creatorResult.rows[0];

  if (creator.role !== "SCHOOL_ADMIN") {
    const error = new Error(
      "Only a school administrator can create announcements",
    );
    error.code = "INVALID_USER_ROLE";
    throw error;
  }

  if (creator.status !== "ACTIVE") {
    const error = new Error("Inactive users cannot create announcements");
    error.code = "USER_INACTIVE";
    throw error;
  }

  const announcementId = randomUUID();

  const result = await pool.query(
    `
    INSERT INTO "Announcement" (
      id,
      "schoolId",
      "createdByUserId",
      title,
      content,
      audience,
      status,
      "publishedAt",
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
      'DRAFT',
      NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING
      id,
      "schoolId" AS "schoolId",
      "createdByUserId" AS "createdByUserId",
      title,
      content,
      audience,
      status,
      "publishedAt" AS "publishedAt",
      "createdAt" AS "createdAt",
      "updatedAt" AS "updatedAt"
  `,
    [
      announcementId,
      schoolId,
      createdByUserId,
      title.trim(),
      content.trim(),
      audience,
    ],
  );

  return result.rows[0];
};

/**
 * Get one announcement by ID.
 */
export const getAnnouncementById = async ({ schoolId, announcementId }) => {
  const result = await pool.query(
    `
      SELECT
        a.id,
        a."schoolId" AS "schoolId",
        a."createdByUserId" AS "createdByUserId",
        a.title,
        a.content,
        a.audience,
        a.status,
        a."publishedAt" AS "publishedAt",
        a."createdAt" AS "createdAt",
        a."updatedAt" AS "updatedAt",

        u."firstName" AS "creatorFirstName",
        u."lastName" AS "creatorLastName",

        COUNT(ar.id)::int AS "recipientCount",

        COUNT(ar.id)
          FILTER (WHERE ar."isRead" = true)::int
          AS "readCount"

      FROM "Announcement" a

      INNER JOIN "User" u
        ON u.id = a."createdByUserId"

      LEFT JOIN "AnnouncementRecipient" ar
        ON ar."announcementId" = a.id

      WHERE a.id = $1
        AND a."schoolId" = $2

      GROUP BY
        a.id,
        u."firstName",
        u."lastName"

      LIMIT 1
    `,
    [announcementId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Announcement not found");
    error.code = "ANNOUNCEMENT_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
};

/**
 * Get announcements for a school.
 */
export const getAnnouncements = async ({
  schoolId,
  status,
  audience,
  search,
  page = 1,
  limit = 20,
}) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const offset = (parsedPage - 1) * parsedLimit;

  const conditions = [`a."schoolId" = $1`];
  const values = [schoolId];

  if (status) {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }

  if (audience) {
    if (!VALID_AUDIENCES.includes(audience)) {
      const error = new Error(`Invalid announcement audience: ${audience}`);
      error.code = "INVALID_AUDIENCE";
      throw error;
    }

    values.push(audience);
    conditions.push(`a.audience = $${values.length}`);
  }

  if (search?.trim()) {
    values.push(`%${search.trim()}%`);

    conditions.push(`
      (
        a.title ILIKE $${values.length}
        OR a.content ILIKE $${values.length}
      )
    `);
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM "Announcement" a
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
        a.id,
        a."schoolId" AS "schoolId",
        a."createdByUserId" AS "createdByUserId",
        a.title,
        a.content,
        a.audience,
        a.status,
        a."publishedAt" AS "publishedAt",
        a."createdAt" AS "createdAt",
        a."updatedAt" AS "updatedAt",

        u."firstName" AS "creatorFirstName",
        u."lastName" AS "creatorLastName",

        COUNT(ar.id)::int AS "recipientCount",

        COUNT(ar.id)
          FILTER (WHERE ar."isRead" = true)::int
          AS "readCount"

      FROM "Announcement" a

      INNER JOIN "User" u
        ON u.id = a."createdByUserId"

      LEFT JOIN "AnnouncementRecipient" ar
        ON ar."announcementId" = a.id

      WHERE ${whereClause}

      GROUP BY
        a.id,
        u."firstName",
        u."lastName"

      ORDER BY a."createdAt" DESC

      LIMIT $${limitParameter}
      OFFSET $${offsetParameter}
    `,
    values,
  );

  return {
    announcements: result.rows,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/**
 * Update a draft announcement.
 */
export const updateAnnouncement = async ({
  schoolId,
  announcementId,
  title,
  content,
  audience,
}) => {
  if (!title?.trim() || !content?.trim() || !audience) {
    const error = new Error("Title, content, and audience are required");
    error.code = "REQUIRED_FIELDS";
    throw error;
  }

  if (!VALID_AUDIENCES.includes(audience)) {
    const error = new Error(`Invalid announcement audience: ${audience}`);
    error.code = "INVALID_AUDIENCE";
    throw error;
  }

  const existingResult = await pool.query(
    `
      SELECT
        id,
        status
      FROM "Announcement"
      WHERE id = $1
        AND "schoolId" = $2
      LIMIT 1
    `,
    [announcementId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Announcement not found");
    error.code = "ANNOUNCEMENT_NOT_FOUND";
    throw error;
  }

  if (existingResult.rows[0].status !== "DRAFT") {
    const error = new Error("Only draft announcements can be updated");
    error.code = "ANNOUNCEMENT_NOT_EDITABLE";
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE "Announcement"
      SET
        title = $1,
        content = $2,
        audience = $3,
        "updatedAt" = CURRENT_TIMESTAMP

      WHERE id = $4
        AND "schoolId" = $5
        AND status = 'DRAFT'

      RETURNING
        id,
        "schoolId" AS "schoolId",
        "createdByUserId" AS "createdByUserId",
        title,
        content,
        audience,
        status,
        "publishedAt" AS "publishedAt",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
    `,
    [title.trim(), content.trim(), audience, announcementId, schoolId],
  );

  return result.rows[0];
};

/**
 * Publish an announcement and create recipient records.
 */
export const publishAnnouncement = async ({ schoolId, announcementId }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const announcementResult = await client.query(
      `
        SELECT
          id,
          "schoolId" AS "schoolId",
          audience,
          status
        FROM "Announcement"

        WHERE id = $1
          AND "schoolId" = $2

        FOR UPDATE
      `,
      [announcementId, schoolId],
    );

    if (announcementResult.rows.length === 0) {
      const error = new Error("Announcement not found");
      error.code = "ANNOUNCEMENT_NOT_FOUND";
      throw error;
    }

    const announcement = announcementResult.rows[0];

    if (announcement.status !== "DRAFT") {
      const error = new Error("Only draft announcements can be published");
      error.code = "INVALID_STATUS_TRANSITION";
      throw error;
    }

    let recipientCondition = `
      u."schoolId" = $1
      AND u.status = 'ACTIVE'
      AND u.role <> 'SCHOOL_ADMIN'
    `;

    const recipientValues = [schoolId];

    if (announcement.audience !== "ALL") {
      const roles = AUDIENCE_ROLES[announcement.audience];

      if (!roles) {
        const error = new Error(
          `Invalid announcement audience: ${announcement.audience}`,
        );
        error.code = "INVALID_AUDIENCE";
        throw error;
      }

      recipientValues.push(roles);

      recipientCondition += `
        AND u.role = ANY($${recipientValues.length})
      `;
    }

    const recipientsResult = await client.query(
      `
        SELECT u.id
        FROM "User" u
        WHERE ${recipientCondition}
      `,
      recipientValues,
    );

    for (const recipient of recipientsResult.rows) {
      await client.query(
        `
          INSERT INTO "AnnouncementRecipient" (
            id,
            "announcementId",
            "userId"
          )
          VALUES (
            $1,
            $2,
            $3
          )
          ON CONFLICT ("announcementId", "userId")
          DO NOTHING
        `,
        [randomUUID(), announcementId, recipient.id],
      );
    }

    const updatedResult = await client.query(
      `
        UPDATE "Announcement"
        SET
          status = 'PUBLISHED',
          "publishedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP

        WHERE id = $1
          AND "schoolId" = $2

        RETURNING
          id,
          "schoolId" AS "schoolId",
          "createdByUserId" AS "createdByUserId",
          title,
          content,
          audience,
          status,
          "publishedAt" AS "publishedAt",
          "createdAt" AS "createdAt",
          "updatedAt" AS "updatedAt"
      `,
      [announcementId, schoolId],
    );

    await client.query("COMMIT");

    return {
      ...updatedResult.rows[0],
      recipientCount: recipientsResult.rows.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Archive a published announcement.
 */
export const archiveAnnouncement = async ({ schoolId, announcementId }) => {
  const existingResult = await pool.query(
    `
      SELECT
        id,
        status
      FROM "Announcement"

      WHERE id = $1
        AND "schoolId" = $2

      LIMIT 1
    `,
    [announcementId, schoolId],
  );

  if (existingResult.rows.length === 0) {
    const error = new Error("Announcement not found");
    error.code = "ANNOUNCEMENT_NOT_FOUND";
    throw error;
  }

  if (existingResult.rows[0].status !== "PUBLISHED") {
    const error = new Error("Only published announcements can be archived");
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE "Announcement"
      SET
        status = 'ARCHIVED',
        "updatedAt" = CURRENT_TIMESTAMP

      WHERE id = $1
        AND "schoolId" = $2

      RETURNING
        id,
        "schoolId" AS "schoolId",
        "createdByUserId" AS "createdByUserId",
        title,
        content,
        audience,
        status,
        "publishedAt" AS "publishedAt",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
    `,
    [announcementId, schoolId],
  );

  return result.rows[0];
};

/**
 * Get announcement recipients.
 */
export const getAnnouncementRecipients = async ({
  schoolId,
  announcementId,
  isRead,
  page = 1,
  limit = 20,
}) => {
  const announcementResult = await pool.query(
    `
      SELECT id
      FROM "Announcement"

      WHERE id = $1
        AND "schoolId" = $2

      LIMIT 1
    `,
    [announcementId, schoolId],
  );

  if (announcementResult.rows.length === 0) {
    const error = new Error("Announcement not found");
    error.code = "ANNOUNCEMENT_NOT_FOUND";
    throw error;
  }

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const offset = (parsedPage - 1) * parsedLimit;

  const conditions = [`ar."announcementId" = $1`];

  const values = [announcementId];

  if (isRead !== undefined) {
    const readValue = isRead === true || isRead === "true" || isRead === "1";

    values.push(readValue);

    conditions.push(`ar."isRead" = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM "AnnouncementRecipient" ar
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
        ar.id,
        ar."announcementId" AS "announcementId",
        ar."userId" AS "userId",
        ar."isRead" AS "isRead",
        ar."readAt" AS "readAt",
        ar."createdAt" AS "createdAt",

        u."firstName" AS "firstName",
        u."lastName" AS "lastName",
        u.email,
        u.role,
        u.status AS "userStatus"

      FROM "AnnouncementRecipient" ar

      INNER JOIN "User" u
        ON u.id = ar."userId"

      WHERE ${whereClause}

      ORDER BY ar."createdAt" DESC

      LIMIT $${limitParameter}
      OFFSET $${offsetParameter}
    `,
    values,
  );

  return {
    recipients: result.rows,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/**
 * Mark an announcement as read by the recipient.
 */
export const markAnnouncementAsRead = async ({
  schoolId,
  announcementId,
  userId,
}) => {
  const result = await pool.query(
    `
      UPDATE "AnnouncementRecipient" ar

      SET
        "isRead" = true,
        "readAt" = COALESCE(
          ar."readAt",
          CURRENT_TIMESTAMP
        )

      FROM "Announcement" a

      WHERE ar."announcementId" = a.id
        AND ar."announcementId" = $1
        AND ar."userId" = $2
        AND a."schoolId" = $3
        AND a.status = 'PUBLISHED'

      RETURNING
        ar.id,
        ar."announcementId" AS "announcementId",
        ar."userId" AS "userId",
        ar."isRead" AS "isRead",
        ar."readAt" AS "readAt",
        ar."createdAt" AS "createdAt"
    `,
    [announcementId, userId, schoolId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Announcement recipient record not found");

    error.code = "ANNOUNCEMENT_RECIPIENT_NOT_FOUND";

    throw error;
  }

  return result.rows[0];
};
