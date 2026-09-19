import "dotenv/config";
import express from "express";

// import prisma from "./config/prisma.js";
import healthRoutes from "./routes/healthRoutes.js";
import schoolRoutes from "./routes/schoolRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import schoolAdminRoutes from "./routes/schoolAdminRoutes.js";
import academicYearRoutes from "./routes/academicYearRoutes.js";

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
