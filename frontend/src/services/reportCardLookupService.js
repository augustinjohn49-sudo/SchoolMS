import api from "./api.js";

// Fetch terms belonging to an academic year.
export async function getTermsByAcademicYear(academicYearId) {
  const response = await api.get(`/terms/academic-year/${academicYearId}`);

  return response.data;
}

// Fetch grading scales available to the authenticated school.
export async function getGradingScales() {
  const response = await api.get("/grading-scales");
  return response.data;
}

// Fetch exams, optionally filtered by academic year and term.

export async function getExams({ academicYearId, termId, status } = {}) {
  const response = await api.get("/exams", {
    params: {
      academicYearId,
      termId,
      status,
    },
  });

  return response.data;
}

// Fetch exam results for a specific student.
export async function getExamResults(examId, studentId) {
  const response = await api.get(`/exams/${examId}/results`, {
    params: { studentId },
  });

  return response.data;
}
