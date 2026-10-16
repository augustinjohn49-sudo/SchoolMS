import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  Check,
} from "lucide-react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../services/notificationService.js";
import "./Notifications.css";

function formatDate(dateValue) {
  if (!dateValue) return "Date unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString();
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  async function loadNotifications() {
    try {
      setError("");
      setLoading(true);

      const result = await getNotifications({ page: 1, limit: 50 });
      const items = Array.isArray(result)
        ? result
        : (result.notifications ?? result.data ?? []);

      setNotifications(items);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load notifications. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "UNREAD") return !notification.isRead;
    if (filter === "ATTENDANCE") return notification.type === "ATTENDANCE";
    return true;
  });

  async function handleMarkRead(notificationId) {
    try {
      setMarkingId(notificationId);
      setError("");

      await markNotificationAsRead(notificationId);

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to mark this notification as read.",
      );
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;

    try {
      setMarkingAll(true);
      setError("");

      await markAllNotificationsAsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to mark notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <section className="notifications-page">
      <div className="notifications-heading">
        <div>
          <h1>Notifications</h1>
          <p>Stay updated on attendance alerts and school activities.</p>
        </div>

        <button
          className="notifications-refresh-button"
          onClick={loadNotifications}
          disabled={loading}
          type="button"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="notifications-summary">
        <div className="notifications-summary-icon">
          <Bell size={22} />
        </div>
        <div>
          <strong>{unreadCount} unread</strong>
          <span>{notifications.length} notifications loaded</span>
        </div>

        <button
          className="notifications-mark-all-button"
          onClick={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
          type="button"
        >
          <CheckCheck size={17} />
          {markingAll ? "Marking..." : "Mark all as read"}
        </button>
      </div>

      <div className="notifications-filters">
        {[
          { value: "ALL", label: "All notifications" },
          { value: "UNREAD", label: "Unread" },
          { value: "ATTENDANCE", label: "Attendance" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            className={
              filter === item.value
                ? "notifications-filter active"
                : "notifications-filter"
            }
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="notifications-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="notifications-state">
          <RefreshCw size={22} />
          <p>Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="notifications-state">
          <Bell size={28} />
          <h2>No notifications found</h2>
          <p>
            {filter === "UNREAD"
              ? "You are all caught up."
              : "Notifications will appear here when they are available."}
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((notification) => (
            <article
              key={notification.id}
              className={
                notification.isRead
                  ? "notification-card"
                  : "notification-card unread"
              }
            >
              <div className="notification-type-icon">
                {notification.type === "ATTENDANCE" ? (
                  <AlertTriangle size={20} />
                ) : (
                  <Bell size={20} />
                )}
              </div>

              <div className="notification-card-content">
                <div className="notification-card-title-row">
                  <h2>{notification.title}</h2>
                  {!notification.isRead && (
                    <span className="notification-unread-label">Unread</span>
                  )}
                </div>

                <p>{notification.message}</p>

                <div className="notification-card-meta">
                  <span>
                    <Clock size={14} />
                    {formatDate(notification.createdAt)}
                  </span>
                  <span>{notification.type || "GENERAL"}</span>
                </div>
              </div>

              {!notification.isRead && (
                <button
                  className="notification-mark-read-button"
                  type="button"
                  onClick={() => handleMarkRead(notification.id)}
                  disabled={markingId === notification.id}
                  aria-label={`Mark ${notification.title} as read`}
                  title="Mark as read"
                >
                  <Check size={18} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
