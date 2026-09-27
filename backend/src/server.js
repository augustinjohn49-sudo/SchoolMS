import "dotenv/config";
import express from "express";

// import prisma from "./config/prisma.js";
import healthRoutes from "./routes/healthRoutes.js";
import schoolRoutes from "./routes/schoolRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import schoolAdminRoutes from "./routes/schoolAdminRoutes.js";
import academicYearRoutes from "./routes/academicYearRoutes.js";
import termRoutes from "./routes/termRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import studentEnrollmentRoutes from "./routes/studentEnrollmentRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import classSubjectRoutes from "./routes/classSubjectRoutes.js";

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Basic route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Multi-School Management System API is running.",
  });
});

// Routes
app.use("/api/health", healthRoutes); // Health routes
app.use("/api/schools", schoolRoutes); // School routes
app.use("/api/auth", authRoutes); // Auth routes
app.use("/api/school-admins", schoolAdminRoutes); // School Admin routes
app.use("/api/academic-years", academicYearRoutes); // Academic Year routes
app.use("/api/terms", termRoutes); // Term routes
app.use("/api/classes", classRoutes); // Class routes
app.use("/api/streams", streamRoutes); // Stream routes
app.use("/api/students", studentRoutes); // Student routes
app.use("/api/student-enrollments", studentEnrollmentRoutes);
app.use("/api/staff", staffRoutes); // Staff routes
app.use("/api/subjects", subjectRoutes);
app.use("/api/class-subjects", classSubjectRoutes);

// Start server
async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:");
    console.error(error);

    process.exit(1);
  }
}
startServer();
