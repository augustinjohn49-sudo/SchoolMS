import api from "./api.js";

// Fetch report cards using optional filters.
export async function getReportCards(filters = {}) {
  const response = await api.get("/report-cards", {
    params: filters,
  });

  return response.data;
}

// Fetch one report card, including its subjects and attendance summary.
export async function getReportCardById(reportCardId) {
  const response = await api.get(`/report-cards/${reportCardId}`);

  return response.data;
}

// Create a report card for a student enrollment.
export async function createReportCard(data) {
  const response = await api.post("/report-cards", data);

  return response.data;
}

// Add an exam result to a report card.
export async function addReportCardSubject(reportCardId, data) {
  const response = await api.post(
    `/report-cards/${reportCardId}/subjects`,
    data,
  );

  return response.data;
}

// Update the class teacher's comment.
export async function updateClassTeacherComment(
  reportCardId,
  classTeacherComment,
) {
  const response = await api.patch(
    `/report-cards/${reportCardId}/class-teacher-comment`,
    { classTeacherComment },
  );

  return response.data;
}

// Update the head teacher's comment.
export async function updateHeadTeacherComment(
  reportCardId,
  headTeacherComment,
) {
  const response = await api.patch(
    `/report-cards/${reportCardId}/head-teacher-comment`,
    { headTeacherComment },
  );

  return response.data;
}

// Approve a draft report card.
export async function approveReportCard(reportCardId) {
  const response = await api.patch(`/report-cards/${reportCardId}/approve`);

  return response.data;
}

// Publish an approved report card.
export async function publishReportCard(reportCardId) {
  const response = await api.patch(`/report-cards/${reportCardId}/publish`);

  return response.data;
}

// Generate a report card that has already been published.
export async function generateReportCard(reportCardId) {
  const response = await api.get(`/report-cards/${reportCardId}/generate`);

  return response.data;
}
