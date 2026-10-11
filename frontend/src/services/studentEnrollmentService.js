import api from "./api.js";

export async function createStudentEnrollment(enrollmentData) {
  const response = await api.post("/student-enrollments", enrollmentData);
  return response.data;
}

export async function getCurrentStudentEnrollment(studentId) {
  const response = await api.get(
    `/student-enrollments/student/${studentId}/current`,
  );

  return response.data;
}

export async function getStudentEnrollmentHistory(studentId) {
  const response = await api.get(
    `/student-enrollments/student/${studentId}/history`,
  );

  return response.data;
}

export async function updateStudentEnrollment(enrollmentId, enrollmentData) {
  const response = await api.patch(
    `/student-enrollments/${enrollmentId}`,
    enrollmentData,
  );

  return response.data;
}

export async function deleteStudentEnrollment(enrollmentId) {
  const response = await api.delete(`/student-enrollments/${enrollmentId}`);

  return response.data;
}

export async function promoteStudent(studentId, promotionData) {
  const response = await api.post(
    `/student-enrollments/promote/${studentId}`,
    promotionData,
  );

  return response.data;
}

export async function getAcademicYears() {
  const response = await api.get("/academic-years");
  return response.data;
}

export async function getClassesByAcademicYear(academicYearId) {
  const response = await api.get(`/classes/academic-year/${academicYearId}`);

  return response.data;
}

export async function getStreamsByClass(classId) {
  const response = await api.get(`/streams/class/${classId}`);
  return response.data;
}

export async function getStudentEnrollments({
  academicYearId,
  classId,
  streamId,
  status = "ACTIVE",
  page = 1,
  limit = 100,
}) {
  const response = await api.get("/student-enrollments", {
    params: {
      academicYearId,
      classId,
      streamId: streamId || undefined,
      status,
      page,
      limit,
    },
  });

  return response.data;
}
