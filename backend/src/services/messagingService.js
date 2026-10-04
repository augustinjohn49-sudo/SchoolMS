import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

const validateUserIds = (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    const error = new Error(
      "At least one conversation participant is required",
    );
    error.code = "PARTICIPANTS_REQUIRED";
    throw error;
  }

  const uniqueUserIds = [...new Set(userIds)];

  if (uniqueUserIds.length < 1) {
    const error = new Error(
      "At least one conversation participant is required",
    );
    error.code = "PARTICIPANTS_REQUIRED";
    throw error;
  }

  return uniqueUserIds;
};

const verifyActiveSchoolUsers = async ({ schoolId, userIds }) => {
  const result = await pool.query(
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
    [userIds, schoolId],
  );

  if (result.rows.length !== userIds.length) {
    const error = new Error(
      "One or more conversation participants were not found, are inactive, or belong to another school",
    );
    error.code = "INVALID_PARTICIPANTS";
    throw error;
  }

  return result.rows;
};

const verifyConversationParticipant = async ({
  conversationId,
  schoolId,
  userId,
}) => {
  const result = await pool.query(
    `
      SELECT
        c.id,
        c."schoolId" AS "schoolId"
      FROM "Conversation" c

      INNER JOIN "ConversationParticipant" cp
        ON cp."conversationId" = c.id

      WHERE c.id = $1
        AND c."schoolId" = $2
        AND cp."userId" = $3

      LIMIT 1
    `,
    [conversationId, schoolId, userId],
  );

  if (result.rows.length === 0) {
    const error = new Error(
      "Conversation not found or user is not a participant",
    );
    error.code = "CONVERSATION_ACCESS_DENIED";
    throw error;
  }

  return result.rows[0];
};

export const createConversation = async ({
  schoolId,
  createdByUserId,
  participantUserIds,
}) => {
  if (!schoolId) {
    const error = new Error("School is required");
    error.code = "SCHOOL_REQUIRED";
    throw error;
  }

  if (!createdByUserId) {
    const error = new Error("Conversation creator is required");
    error.code = "CREATOR_REQUIRED";
    throw error;
  }

  const uniqueParticipantUserIds = validateUserIds(participantUserIds);

  if (!uniqueParticipantUserIds.includes(createdByUserId)) {
    uniqueParticipantUserIds.push(createdByUserId);
  }

  await verifyActiveSchoolUsers({
    schoolId,
    userIds: uniqueParticipantUserIds,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const conversationId = randomUUID();

    const conversationResult = await client.query(
      `
        INSERT INTO "Conversation" (
          id,
          "schoolId",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1,
          $2,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING
          id,
          "schoolId" AS "schoolId",
          "createdAt" AS "createdAt",
          "updatedAt" AS "updatedAt"
      `,
      [conversationId, schoolId],
    );

    for (const userId of uniqueParticipantUserIds) {
      await client.query(
        `
          INSERT INTO "ConversationParticipant" (
            id,
            "conversationId",
            "userId",
            "joinedAt",
            "lastReadAt"
          )
          VALUES (
            $1,
            $2,
            $3,
            CURRENT_TIMESTAMP,
            NULL
          )
        `,
        [randomUUID(), conversationId, userId],
      );
    }

    await client.query("COMMIT");

    return {
      ...conversationResult.rows[0],
      participantCount: uniqueParticipantUserIds.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getConversationsForUser = async ({
  schoolId,
  userId,
  page = 1,
  limit = 20,
}) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const offset = (parsedPage - 1) * parsedLimit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM "ConversationParticipant" cp

      INNER JOIN "Conversation" c
        ON c.id = cp."conversationId"

      WHERE cp."userId" = $1
        AND c."schoolId" = $2
    `,
    [userId, schoolId],
  );

  const total = countResult.rows[0].count;

  const result = await pool.query(
    `
      SELECT
        c.id,
        c."schoolId" AS "schoolId",
        c."createdAt" AS "createdAt",
        c."updatedAt" AS "updatedAt",

        cp."lastReadAt" AS "lastReadAt",

        COUNT(DISTINCT cp2.id)::int
          AS "participantCount",

        COUNT(DISTINCT m.id)::int 
          AS "messageCount",

        MAX(m."createdAt")
          AS "lastMessageAt"

      FROM "ConversationParticipant" cp

      INNER JOIN "Conversation" c
        ON c.id = cp."conversationId"

      LEFT JOIN "ConversationParticipant" cp2
        ON cp2."conversationId" = c.id

      LEFT JOIN "Message" m
        ON m."conversationId" = c.id

      WHERE cp."userId" = $1
        AND c."schoolId" = $2

      GROUP BY
        c.id,
        cp."lastReadAt"

      ORDER BY
        COALESCE(
          MAX(m."createdAt"),
          c."createdAt"
        ) DESC

      LIMIT $3
      OFFSET $4
    `,
    [userId, schoolId, parsedLimit, offset],
  );

  return {
    conversations: result.rows,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

export const getConversationById = async ({
  schoolId,
  userId,
  conversationId,
}) => {
  await verifyConversationParticipant({
    conversationId,
    schoolId,
    userId,
  });

  const conversationResult = await pool.query(
    `
      SELECT
        c.id,
        c."schoolId" AS "schoolId",
        c."createdAt" AS "createdAt",
        c."updatedAt" AS "updatedAt"
      FROM "Conversation" c

      WHERE c.id = $1
        AND c."schoolId" = $2

      LIMIT 1
    `,
    [conversationId, schoolId],
  );

  const participantsResult = await pool.query(
    `
      SELECT
        cp.id,
        cp."userId" AS "userId",
        cp."joinedAt" AS "joinedAt",
        cp."lastReadAt" AS "lastReadAt",

        u."firstName" AS "firstName",
        u."lastName" AS "lastName",
        u.email,
        u.role,
        u.status

      FROM "ConversationParticipant" cp

      INNER JOIN "User" u
        ON u.id = cp."userId"

      WHERE cp."conversationId" = $1

      ORDER BY cp."joinedAt" ASC
    `,
    [conversationId],
  );

  return {
    ...conversationResult.rows[0],
    participants: participantsResult.rows,
  };
};

export const sendMessage = async ({
  schoolId,
  senderUserId,
  conversationId,
  content,
}) => {
  if (!content?.trim()) {
    const error = new Error("Message content is required");
    error.code = "MESSAGE_CONTENT_REQUIRED";
    throw error;
  }

  await verifyConversationParticipant({
    conversationId,
    schoolId,
    userId: senderUserId,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const messageId = randomUUID();

    const messageResult = await client.query(
      `
        INSERT INTO "Message" (
          id,
          "conversationId",
          "senderUserId",
          content,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING
          id,
          "conversationId" AS "conversationId",
          "senderUserId" AS "senderUserId",
          content,
          "createdAt" AS "createdAt",
          "updatedAt" AS "updatedAt"
      `,
      [messageId, conversationId, senderUserId, content.trim()],
    );

    await client.query(
      `
        UPDATE "Conversation"
        SET
          "updatedAt" = CURRENT_TIMESTAMP

        WHERE id = $1
          AND "schoolId" = $2
      `,
      [conversationId, schoolId],
    );

    await client.query("COMMIT");

    return messageResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getConversationMessages = async ({
  schoolId,
  userId,
  conversationId,
  page = 1,
  limit = 50,
}) => {
  await verifyConversationParticipant({
    conversationId,
    schoolId,
    userId,
  });

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

  const offset = (parsedPage - 1) * parsedLimit;

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM "Message" m

      WHERE m."conversationId" = $1
    `,
    [conversationId],
  );

  const total = countResult.rows[0].count;

  const result = await pool.query(
    `
      SELECT
        m.id,
        m."conversationId" AS "conversationId",
        m."senderUserId" AS "senderUserId",
        m.content,
        m."createdAt" AS "createdAt",
        m."updatedAt" AS "updatedAt",

        u."firstName" AS "senderFirstName",
        u."lastName" AS "senderLastName"

      FROM "Message" m

      INNER JOIN "User" u
        ON u.id = m."senderUserId"

      WHERE m."conversationId" = $1

      ORDER BY m."createdAt" ASC

      LIMIT $2
      OFFSET $3
    `,
    [conversationId, parsedLimit, offset],
  );

  return {
    messages: result.rows,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

export const markConversationAsRead = async ({
  schoolId,
  userId,
  conversationId,
}) => {
  await verifyConversationParticipant({
    conversationId,
    schoolId,
    userId,
  });

  const result = await pool.query(
    `
      UPDATE "ConversationParticipant"
      SET
        "lastReadAt" = CURRENT_TIMESTAMP

      WHERE "conversationId" = $1
        AND "userId" = $2

      RETURNING
        id,
        "conversationId" AS "conversationId",
        "userId" AS "userId",
        "joinedAt" AS "joinedAt",
        "lastReadAt" AS "lastReadAt"
    `,
    [conversationId, userId],
  );

  return result.rows[0];
};
