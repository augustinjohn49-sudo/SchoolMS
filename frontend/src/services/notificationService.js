import api from "./api";

export async function getNotifications({
  page = 1,
  limit = 20,
  isRead,
  type,
} = {}) {
  const response = await api.get("/notifications", {
    params: { page, limit, isRead, type },
  });

  return response.data;
}

export async function getUnreadNotificationCount() {
  const response = await api.get("/notifications/unread-count");
  return response.data;
}

export async function markNotificationAsRead(notificationId) {
  const response = await api.patch(`/notifications/${notificationId}/read`);

  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await api.patch("/notifications/read-all");
  return response.data;
}

export async function generateLowAttendanceNotifications({
  dateFrom,
  dateTo,
  threshold = 75,
  academicYearId,
  classId,
}) {
  const response = await api.post(
    "/school-reports/attendance/low-attendance-alerts/notifications",
    {
      dateFrom,
      dateTo,
      threshold,
      academicYearId,
      classId,
    },
  );

  return response.data;
}
