import api from "./api.js";

export async function getDashboardData() {
  const [
    studentsResponse,
    staffResponse,
    subjectsResponse,
    attendanceResponse,
  ] = await Promise.all([
    api.get("/students", {
      params: {
        page: 1,
        limit: 1,
      },
    }),

    api.get("/staff", {
      params: {
        page: 1,
        limit: 1,
      },
    }),

    api.get("/subjects"),

    api.get("/school-reports/attendance", {
      params: {
        page: 1,
        limit: 20,
      },
    }),
  ]);

  const students = studentsResponse.data;
  const staff = staffResponse.data;
  const subjects = subjectsResponse.data;
  const attendance = attendanceResponse.data;

  return {
    totalStudents: students.pagination?.total ?? 0,
    totalStaff: staff.pagination?.total ?? 0,
    totalSubjects: Array.isArray(subjects.data) ? subjects.data.length : 0,
    attendancePercentage: attendance.data?.summary?.attendancePercentage ?? 0,
  };
}
