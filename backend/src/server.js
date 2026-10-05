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
import teacherClassSubjectRoutes from "./routes/teacherClassSubjectRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import gradingScaleRoutes from "./routes/gradingScaleRoutes.js";
import gradeRoutes from "./routes/gradeRoutes.js";
import reportCardRoutes from "./routes/reportCardRoutes.js";
import parentGuardianRoutes from "./routes/parentGuardianRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messagingRoutes from "./routes/messagingRoutes.js";
import feeStructureRoutes from "./routes/feeStructureRoutes.js";
import studentFeeChargeRoutes from "./routes/studentFeeChargeRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import paymentAllocationRoutes from "./routes/paymentAllocationRoutes.js";
import studentFeeAccountRoutes from "./routes/studentFeeAccountRoutes.js";
import feeAdjustmentRoutes from "./routes/feeAdjustmentRoutes.js";
import financeReportRoutes from "./routes/financeReportRoutes.js";
import enrollmentReportRoutes from "./routes/enrollmentReportRoutes.js";
import attendanceReportRoutes from "./routes/attendanceReportRoutes.js";

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
app.use("/api/teacher-class-subjects", teacherClassSubjectRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exams", examRoutes); // Exam routes
app.use("/api/grading-scales", gradingScaleRoutes); // Grading Scale routes
app.use("/api/grades", gradeRoutes); // Grade routes
app.use("/api/report-cards", reportCardRoutes);
app.use("/api/parent-guardians", parentGuardianRoutes); // Parent/Guardian routes
app.use("/api/announcements", announcementRoutes); // Announcement routes
app.use("/api/notifications", notificationRoutes); // Notification routes
app.use("/api/messaging", messagingRoutes); // Messaging routes
app.use("/api/fee-structures", feeStructureRoutes); // Fee Structure routes
app.use("/api/student-fee-charges", studentFeeChargeRoutes); // Student Fee Charge routes
app.use("/api/payments", paymentRoutes);
app.use("/api/payment-allocations", paymentAllocationRoutes); // Payment Allocation routes
app.use("/api/student-fee-accounts", studentFeeAccountRoutes); // Student Fee Account routes
app.use("/api/fee-adjustments", feeAdjustmentRoutes); // Fee Adjustment routes
app.use("/api/finance/reports", financeReportRoutes);
app.use("/api/school-reports", enrollmentReportRoutes);
app.use("/api/school-reports", attendanceReportRoutes);

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
