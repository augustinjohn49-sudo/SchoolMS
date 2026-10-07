import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Users,
  UserRound,
  BookOpen,
  CalendarCheck,
  School,
  UserPlus,
  ClipboardList,
  CreditCard,
} from "lucide-react";
import { getDashboardData } from "../../services/dashboardService.js";

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
      description: "Students enrolled in your school",
    },
    {
      title: "Total Staff",
      value: loading ? "..." : dashboardData.totalStaff,
      icon: UserRound,
      description: "Active and registered staff",
    },
    {
      title: "Total Subjects",
      value: loading ? "..." : dashboardData.totalSubjects,
      icon: BookOpen,
      description: "Subjects in the curriculum",
    },
    {
      title: "Attendance",
      value: loading ? "..." : `${dashboardData.attendancePercentage}%`,
      icon: CalendarCheck,
      description: "Current attendance rate",
    },
  ];

  const quickActions = [
    {
      title: "Manage Students",
      description: "View and manage student records",
      icon: Users,
      href: "/students",
    },
    {
      title: "Manage Staff",
      description: "View teachers and staff",
      icon: UserRound,
      href: "/staff",
    },
    {
      title: "Manage Subjects",
      description: "Manage curriculum subjects",
      icon: BookOpen,
      href: "/subjects",
    },
    {
      title: "View Attendance",
      description: "Review student attendance",
      icon: ClipboardList,
      href: "/attendance",
    },
    {
      title: "Report Cards",
      description: "View student academic reports",
      icon: School,
      href: "/report-cards",
    },
    {
      title: "Finance",
      description: "Manage fees and payments",
      icon: CreditCard,
      href: "/finance",
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome to your school management dashboard. Here's an overview of
            your school's current data.
          </p>
        </div>
      </section>

      {error && <div className="dashboard-error">{error}</div>}

      <section className="dashboard-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="dashboard-stat-card" key={stat.title}>
              <div className="dashboard-stat-icon">
                <Icon size={22} />
              </div>

              <div className="dashboard-stat-content">
                <span className="dashboard-stat-title">{stat.title}</span>

                <strong className="dashboard-stat-value">{stat.value}</strong>

                <span className="dashboard-stat-description">
                  {stat.description}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Quick Actions</h2>
            <p>Access the most frequently used school management features.</p>
          </div>
        </div>

        <div className="dashboard-quick-actions">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                to={action.href}
                className="dashboard-action-card"
                key={action.title}
              >
                <div className="dashboard-action-icon">
                  <Icon size={21} />
                </div>

                <div>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>System Overview</h2>
            <p>
              Your school management system is connected to the backend and
              PostgreSQL database.
            </p>
          </div>
        </div>

        <div className="dashboard-overview">
          <div>
            <School size={20} />
            <span>School Management</span>
          </div>

          <div>
            <UserPlus size={20} />
            <span>Student & Staff Management</span>
          </div>

          <div>
            <BookOpen size={20} />
            <span>Academic Management</span>
          </div>

          <div>
            <CreditCard size={20} />
            <span>Finance Management</span>
          </div>
        </div>
      </section>
    </div>
  );
}
