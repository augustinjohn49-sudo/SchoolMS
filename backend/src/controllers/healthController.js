import pool from "../config/prisma.js";

export async function databaseHealth(req, res) {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      success: true,
      message: "Database connection is healthy.",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed.",
    });
  }
}
