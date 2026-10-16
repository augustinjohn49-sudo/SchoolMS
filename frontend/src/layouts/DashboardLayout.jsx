import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { getUnreadNotificationCount } from "../services/notificationService.js";
import {
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  Bell,
  LogOut,
} from "lucide-react";

const navigationItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Schools",
    path: "/schools",
    icon: School,
  },
  {
    label: "Students",
    path: "/students",
    icon: GraduationCap,
  },
  {
    label: "Staff",
    path: "/staff",
    icon: Users,
  },
  {
    label: "Subjects",
    path: "/subjects",
    icon: BookOpen,
  },
  {
    label: "Timetable",
    path: "/timetable",
    icon: CalendarDays,
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "Attendance Reports",
    path: "/attendance/reports",
    icon: FileText,
  },
  {
    label: "Low Attendance Alerts",
    path: "/attendance/low-attendance-alerts",
    icon: AlertTriangle,
  },
  {
    label: "Report Cards",
    path: "/report-cards",
    icon: FileText,
  },
  {
    label: "Finance",
    path: "/finance",
    icon: CreditCard,
  },
  {
    label: "Messages",
    path: "/messages",
    icon: MessageSquare,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      try {
        const result = await getUnreadNotificationCount();

        const count = Number(result.unreadCount ?? result.count ?? 0);

        if (active) {
          setUnreadCount(Number.isFinite(count) ? count : 0);
        }
      } catch (error) {
        console.error("Failed to load unread notification count:", error);
      }
    }

    loadUnreadCount();

    const intervalId = window.setInterval(loadUnreadCount, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <School size={28} />
          <div>
            <h1>SchoolMS</h1>
            <span>Management System</span>
          </div>
        </div>

        <nav className="sidebar-navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `navigation-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button className="logout-button" onClick={logout}>
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="dashboard-content">
        <header className="top-header">
          <div>
            <h2>School Management System</h2>
            <p>Manage your school from one place.</p>
          </div>

          <NavLink
            to="/notifications"
            className="header-notification-link"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell size={22} />

            {unreadCount > 0 && (
              <span className="header-notification-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>

          <div className="user-profile">
            <div className="user-avatar">
              {user?.firstName?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="user-details">
              <strong>
                {user
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : "User"}
              </strong>
              <span>{user?.role || "User"}</span>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
