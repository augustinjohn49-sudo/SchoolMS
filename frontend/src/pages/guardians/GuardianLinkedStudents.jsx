import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getParentGuardianById,
  getGuardianStudents,
  unlinkGuardianFromStudent,
} from "../../services/parentGuardianService.js";
import "./GuardianDetails.css";

export default function GuardianLinkedStudents() {
  const { parentGuardianId } = useParams();

  const [guardian, setGuardian] = useState(null);
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlinkingStudentId, setUnlinkingStudentId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [guardianResponse, studentsResponse] = await Promise.all([
        getParentGuardianById(parentGuardianId),
        getGuardianStudents(parentGuardianId),
      ]);

      setGuardian(guardianResponse.parentGuardian || guardianResponse);

      const studentList = Array.isArray(studentsResponse)
        ? studentsResponse
        : studentsResponse.students ||
          studentsResponse.linkedStudents ||
          studentsResponse.data ||
          [];

      setLinkedStudents(studentList);
    } catch (err) {
      console.error("Failed to load linked students:", err);
      setError(
        err.response?.data?.message || "Unable to load linked students.",
      );
    } finally {
      setLoading(false);
    }
  }, [parentGuardianId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUnlink(item) {
    const student = item.student || item;
    const studentId = item.studentId || student.id;

    if (!studentId) {
      setError("Unable to identify this student.");
      return;
    }

    const studentName =
      [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ") ||
      student.fullName ||
      "this student";

    const confirmed = window.confirm(
      `Are you sure you want to unlink ${studentName} from this parent/guardian?`,
    );

    if (!confirmed) return;

    try {
      setUnlinkingStudentId(studentId);
      setError("");
      setSuccess("");

      await unlinkGuardianFromStudent(parentGuardianId, studentId);

      setLinkedStudents((current) =>
        current.filter((linkedItem) => {
          const linkedStudent = linkedItem.student || linkedItem;
          return (linkedItem.studentId || linkedStudent.id) !== studentId;
        }),
      );

      setSuccess(`${studentName} was unlinked successfully.`);
    } catch (err) {
      console.error("Failed to unlink student:", err);
      setError(
        err.response?.data?.message ||
          "Unable to unlink this student. Please try again.",
      );
    } finally {
      setUnlinkingStudentId(null);
    }
  }

  return (
    <main className="guardian-details-page">
      <Link className="guardian-details-back" to="/guardians">
        ← Back to Parent/Guardians
      </Link>

      {loading ? (
        <p className="guardian-details-message">Loading linked students...</p>
      ) : (
        <>
          <header className="guardian-details-header">
            <div>
              <h1>
                {guardian
                  ? [guardian.firstName, guardian.middleName, guardian.lastName]
                      .filter(Boolean)
                      .join(" ")
                  : "Parent/Guardian"}
              </h1>
              <p>Manage Linked Students</p>
            </div>

            {guardian && (
              <Link
                className="guardian-view-details-button"
                to={`/guardians/${parentGuardianId}`}
              >
                View Guardian Details
              </Link>
            )}
          </header>

          {error && (
            <section
              className="guardian-details-message guardian-details-error"
              role="alert"
            >
              {error}
            </section>
          )}

          {success && (
            <section className="guardian-details-message" role="status">
              {success}
            </section>
          )}

          {!error && !guardian ? (
            <section className="guardian-details-message">
              Parent/guardian not found.
            </section>
          ) : (
            <section className="guardian-details-card">
              <h2>Linked Students</h2>

              {linkedStudents.length === 0 ? (
                <p className="guardian-details-empty">
                  No students are currently linked to this guardian.
                </p>
              ) : (
                <div className="guardian-students-table-wrapper">
                  <table className="guardian-students-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Relationship</th>
                        <th>Primary Guardian</th>
                        <th>Emergency Contact</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {linkedStudents.map((item, index) => {
                        const student = item.student || item;
                        const studentId = item.studentId || student.id;

                        const studentName =
                          [
                            student.firstName,
                            student.middleName,
                            student.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                          student.fullName ||
                          "Student";

                        return (
                          <tr
                            key={
                              item.relationshipId ||
                              item.id ||
                              studentId ||
                              index
                            }
                          >
                            <td className="guardian-student-name">
                              {studentName}
                            </td>
                            <td>
                              {(
                                item.relationship ||
                                item.guardianRelationship ||
                                "—"
                              ).replaceAll("_", " ")}
                            </td>
                            <td>{item.isPrimary ? "Yes" : "No"}</td>
                            <td>{item.isEmergencyContact ? "Yes" : "No"}</td>
                            <td>
                              <button
                                type="button"
                                className="guardian-unlink-button"
                                onClick={() => handleUnlink(item)}
                                disabled={
                                  !studentId || unlinkingStudentId === studentId
                                }
                              >
                                {unlinkingStudentId === studentId
                                  ? "Unlinking..."
                                  : "Unlink"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
