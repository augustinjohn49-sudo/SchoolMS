import api from "./api.js";

/**
 * Get exams, optionally filtered by academic year and term.
 */
export async function getExams(params = {}) {
  const response = await api.get("/exams", { params });
  return response.data;
}

/**
 * Get subjects assigned to an examination.
 */
export async function getExamSubjects(examId) {
  const response = await api.get(`/exams/${examId}/subjects`);
  return response.data;
}

/**
 * Get students and their existing results for an examination.
 * Optionally filter results by student ID.
 */
export async function getExamResults(examId, studentId) {
  const response = await api.get(`/exams/${examId}/results`, {
    params: studentId ? { studentId } : {},
  });

  return response.data;
}

/**
 * Save a student's marks for an assigned examination subject.
 */
export async function createExamResult(examId, resultData) {
  const response = await api.post(`/exams/${examId}/results`, resultData);

  return response.data;
}

/**
 * Update an existing examination result.
 */
export async function updateExamResult(examId, examResultId, resultData) {
  const response = await api.patch(
    `/exams/${examId}/results/${examResultId}`,
    resultData,
  );

  return response.data;
}

export async function getStudentEnrollments(params = {}) {
  const response = await api.get("/student-enrollments", { params });
  return response.data;
}
