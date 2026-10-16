import { useEffect, useState } from "react";
import {
  Users,
  UserRound,
  BookOpen,
  CalendarCheck,
  School,
  ClipboardList,
  CreditCard,
} from "lucide-react";

import { getDashboardData } from "../../services/dashboardService.js";
import DashboardStats from "./components/DashboardStats.jsx";
import QuickActions from "./components/QuickActions.jsx";
import SystemOverview from "./components/SystemOverview.jsx";
import "./Dashboard.css";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    totalStaff: 0,
    totalSubjects: 0,
    attendancePercentage: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError("");

        const data = await getDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);

        setError(
          err.response?.data?.message || "Unable to load dashboard statistics.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const stats = [
    {
      title: "Total Students",
      value: loading ? "..." : dashboardData.totalStudents,
      icon: Users,
      color: "stat-blue",
      description: "Students enrolled in your school",
    },
    {
      title: "Total Staff",
      value: loading ? "..." : dashboardData.totalStaff,
      icon: UserRound,
      color: "stat-green",
      description: "Active and registered staff",
    },
    {
      title: "Total Subjects",
      value: loading ? "..." : dashboardData.totalSubjects,
      icon: BookOpen,
      color: "stat-purple",
      description: "Subjects in the curriculum",
    },
    {
      title: "Attendance",
      value: loading ? "..." : `${dashboardData.attendancePercentage}%`,
      icon: CalendarCheck,
      color: "stat-orange",
      description: "Current attendance rate",
    },
  ];

  const quickActions = [
    {
      title: "Manage Students",
      description: "View and manage student records",
      icon: Users,
      href: "/students",
      color: "action-blue",
    },
    {
      title: "Manage Staff",
      description: "View teachers and staff",
      icon: UserRound,
      href: "/staff",
      color: "action-green",
    },
    {
      title: "Manage Subjects",
      description: "Manage curriculum subjects",
      icon: BookOpen,
      href: "/subjects",
      color: "action-purple",
    },
    {
      title: "View Attendance",
      description: "Review student attendance",
      icon: ClipboardList,
      href: "/attendance",
      color: "action-orange",
    },
    {
      title: "Report Cards",
      description: "View student academic reports",
      icon: School,
      href: "/report-cards",
      color: "action-blue",
    },
    {
      title: "Exam Marks Entry",
      description: "Enter and manage exam marks",
      icon: ClipboardList,
      href: "/exam-marks",
      color: "action-purple",
    },
    {
      title: "Finance",
      description: "Manage fees and payments",
      icon: CreditCard,
      href: "/finance",
      color: "action-green",
    },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">SCHOOL ADMINISTRATION</span>
          <h1>Dashboard Overview</h1>
          <p>
            Welcome to your school management dashboard. Monitor your school's
            key information and access your daily tasks from here.
          </p>
        </div>
      </header>

      {error && (
        <div className="dashboard-error" role="alert">
          {error}
        </div>
      )}

      <DashboardStats stats={stats} />

      <QuickActions actions={quickActions} />

      <SystemOverview />
    </div>
  );
}
