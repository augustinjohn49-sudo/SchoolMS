import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import Login from "./pages/auth/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Students from "./pages/students/Students.jsx";
import StudentDetails from "./pages/students/StudentDetails.jsx";
import ParentGuardians from "./pages/guardians/ParentGuardians.jsx";
import GuardianDetails from "./pages/guardians/GuardianDetails.jsx";
import GuardianLinkedStudents from "./pages/guardians/GuardianLinkedStudents.jsx";
import Attendance from "./pages/attendance/Attendance.jsx";

function PlaceholderPage({ title }) {
  return (
    <div>
      <h1>{title}</h1>
      <p>This module will be implemented next.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />

            <Route path="/students/:studentId" element={<StudentDetails />} />

            <Route path="/guardians" element={<ParentGuardians />} />

            <Route
              path="/guardians/:parentGuardianId"
              element={<GuardianDetails />}
            />

            <Route
              path="/guardians/:parentGuardianId/students"
              element={<GuardianLinkedStudents />}
            />

            <Route
              path="/schools"
              element={<PlaceholderPage title="Schools" />}
            />

            <Route path="/staff" element={<PlaceholderPage title="Staff" />} />

            <Route
              path="/subjects"
              element={<PlaceholderPage title="Subjects" />}
            />

            <Route
              path="/timetable"
              element={<PlaceholderPage title="Timetable" />}
            />

            <Route path="/attendance" element={<Attendance />} />

            <Route
              path="/report-cards"
              element={<PlaceholderPage title="Report Cards" />}
            />

            <Route
              path="/finance"
              element={<PlaceholderPage title="Finance" />}
            />

            <Route
              path="/messages"
              element={<PlaceholderPage title="Messages" />}
            />

            <Route
              path="/notifications"
              element={<PlaceholderPage title="Notifications" />}
            />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
