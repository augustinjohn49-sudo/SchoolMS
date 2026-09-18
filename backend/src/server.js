import express from "express";

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Test route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "School Management System API is running",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
