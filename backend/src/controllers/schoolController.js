import { randomUUID } from "crypto";
import pool from "../config/prisma.js";

export async function createSchool(req, res) {
  try {
    const { name, code, type, location, email, phone, address, logo } =
      req.body;

    // Validate required fields
    if (!name || !code || !type) {
      return res.status(400).json({
        success: false,
        message: "Name, code, and type are required.",
      });
    }

    // Check whether school code already exists
    const existingSchool = await pool.query(
      `SELECT id FROM "School" WHERE code = $1`,
      [code],
    );

    if (existingSchool.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "A school with this code already exists.",
      });
    }

    const schoolId = randomUUID();
    const now = new Date();

    const result = await pool.query(
      `
      INSERT INTO "School"
      (
        id,
        name,
        code,
        type,
        location,
        email,
        phone,
        address,
        logo,
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        name,
        code,
        type,
        location,
        email,
        phone,
        address,
        logo,
        status,
        "createdAt",
        "updatedAt"
      `,
      [
        schoolId,
        name,
        code,
        type,
        location || null,
        email || null,
        phone || null,
        address || null,
        logo || null,
        now,
        now,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "School created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create school error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create school.",
    });
  }
}

export async function getSchools(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        code,
        type,
        location,
        email,
        phone,
        address,
        logo,
        status,
        "createdAt",
        "updatedAt"
      FROM "School"
      ORDER BY "createdAt" DESC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get schools error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve schools.",
    });
  }
}

export async function getSchoolById(req, res) {
  try {
    const { schoolId } = req.params;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "schoolId is required.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        code,
        type,
        location,
        email,
        phone,
        address,
        logo,
        status,
        "createdAt",
        "updatedAt"
      FROM "School"
      WHERE id = $1
      LIMIT 1
      `,
      [schoolId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "School not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get school by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve school.",
    });
  }
}
