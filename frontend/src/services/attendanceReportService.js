import api from "./api.js";

export async function getAttendanceReport(filters = {}) {
  const response = await api.get("/school-reports/attendance", {
    params: filters,
  });

  return response.data;
}
