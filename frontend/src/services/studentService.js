import api from "./api.js";

export async function getStudents({
  search = "",
  status = "",
  page = 1,
  limit = 10,
  sortBy = "createdAt",
  sortOrder = "desc",
} = {}) {
  const response = await api.get("/students", {
    params: {
      search: search || undefined,
      status: status || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    },
  });

  return response.data;
}

export async function createStudent(studentData) {
  const response = await api.post("/students", studentData);

  return response.data;
}

export async function getStudentById(studentId) {
  const response = await api.get(`/students/${studentId}`);

  return response.data;
}

export async function updateStudent(studentId, studentData) {
  const response = await api.patch(`/students/${studentId}`, studentData);

  return response.data;
}

export async function deleteStudent(studentId) {
  const response = await api.delete(`/students/${studentId}`);
  return response.data;
}
