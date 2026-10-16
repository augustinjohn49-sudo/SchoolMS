import api from "./api.js";

export async function getDashboardData() {
  const [
    studentsResponse,
    staffResponse,
    subjectsResponse,
    attendanceResponse,
    performanceResponse,
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

    api.get("/school-reports/student-performance", {
      params: {
        page: 1,
        limit: 1,
      },
    }),
  ]);

  const students = studentsResponse.data;
  const staff = staffResponse.data;
  const subjects = subjectsResponse.data;
  const attendance = attendanceResponse.data;
  const performance = performanceResponse.data?.data;

  return {
    totalStudents: students.pagination?.total ?? 0,
    totalStaff: staff.pagination?.total ?? 0,
    totalSubjects: Array.isArray(subjects.data) ? subjects.data.length : 0,
    attendancePercentage: attendance.data?.summary?.attendancePercentage ?? 0,

    academicPerformance: {
      totalReportCards: performance?.summary?.totalReportCards ?? 0,
      studentsWithResults: performance?.summary?.studentsWithResults ?? 0,
      averagePercentage: performance?.summary?.averagePercentage ?? 0,
      highestPercentage: performance?.summary?.highestPercentage ?? 0,
      lowestPercentage: performance?.summary?.lowestPercentage ?? 0,
      gradeDistribution: performance?.gradeDistribution ?? [],
    },
  };
}
