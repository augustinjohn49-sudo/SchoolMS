import api from "./api.js";

export async function getParentGuardians({ status = "", search = "" } = {}) {
  const response = await api.get("/parent-guardians", {
    params: {
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    },
  });

  return response.data;
}

export async function getParentGuardianById(parentGuardianId) {
  const response = await api.get(`/parent-guardians/${parentGuardianId}`);
  return response.data;
}

export async function createParentGuardian(guardianData) {
  const response = await api.post("/parent-guardians", guardianData);
  return response.data;
}

export async function updateParentGuardian(parentGuardianId, guardianData) {
  const response = await api.patch(
    `/parent-guardians/${parentGuardianId}`,
    guardianData,
  );

  return response.data;
}

export async function deactivateParentGuardian(parentGuardianId) {
  const response = await api.patch(
    `/parent-guardians/${parentGuardianId}/deactivate`,
  );

  return response.data;
}

export async function activateParentGuardian(parentGuardianId) {
  const response = await api.patch(
    `/parent-guardians/${parentGuardianId}/activate`,
  );

  return response.data;
}

export async function getGuardianStudents(parentGuardianId) {
  const response = await api.get(
    `/parent-guardians/${parentGuardianId}/students`,
  );

  return response.data;
}

export async function getStudentGuardians(studentId) {
  const response = await api.get(`/parent-guardians/student/${studentId}`);
  return response.data;
}

export async function linkGuardianToStudent(parentGuardianId, linkData) {
  const response = await api.post(
    `/parent-guardians/${parentGuardianId}/students`,
    linkData,
  );

  return response.data;
}

export async function unlinkGuardianFromStudent(parentGuardianId, studentId) {
  const response = await api.delete(
    `/parent-guardians/${parentGuardianId}/students/${studentId}`,
  );

  return response.data;
}
