import api from "./api.js";

export async function getAttendanceByClassAndDate(classId, date) {
  const response = await api.get(`/attendance/class/${classId}`, {
    params: { date },
  });

  return response.data;
}

export async function createAttendance(attendanceData) {
  const response = await api.post("/attendance", attendanceData);

  return response.data;
}

export async function updateAttendance(attendanceId, attendanceData) {
  const response = await api.patch(
    `/attendance/${attendanceId}`,
    attendanceData,
  );

  return response.data;
}

export async function getStudentAttendance(
  studentId,
  startDate,
  endDate,
) {
  const response = await api.get(`/attendance/student/${studentId}`, {
    params: { startDate, endDate },
  });

  return response.data;
}

export async function getStudentAttendanceSummary(
  studentId,
  startDate,
  endDate,
) {
  const response = await api.get(
    `/attendance/student/${studentId}/summary`,
    {
      params: { startDate, endDate },
    },
  );

  return response.data;
}
