import express from "express";
import { databaseHealth } from "../controllers/healthController.js";

const router = express.Router();

router.get("/database", databaseHealth);

export default router;
