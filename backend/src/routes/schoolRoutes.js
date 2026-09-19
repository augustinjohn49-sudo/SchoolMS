import express from "express";

import { createSchool, getSchools } from "../controllers/schoolController.js";

const router = express.Router();

router.post("/", createSchool);

router.get("/", getSchools);

export default router;
