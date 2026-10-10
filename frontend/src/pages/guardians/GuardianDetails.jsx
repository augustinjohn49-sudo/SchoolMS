import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getParentGuardianById,
  getGuardianStudents,
} from "../../services/parentGuardianService.js";
import "./GuardianDetails.css";

function GuardianDetails() {
  const { parentGuardianId } = useParams();

  const [guardian, setGuardian] = useState(null);
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGuardianDetails() {
      try {
        setLoading(true);
        setError("");

        const [guardianResponse, studentsResponse] = await Promise.all([
          getParentGuardianById(parentGuardianId),
          getGuardianStudents(parentGuardianId),
        ]);

        if (cancelled) return;

        setGuardian(guardianResponse.parentGuardian || guardianResponse);

        const studentList = Array.isArray(studentsResponse)
          ? studentsResponse
          : studentsResponse.students || studentsResponse.linkedStudents || [];

        setLinkedStudents(studentList);
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to load guardian details:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load parent/guardian details.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGuardianDetails();

    return () => {
      cancelled = true;
    };
  }, [parentGuardianId]);

  if (loading) {
    return (
      <main className="guardian-details-page">
        <p className="guardian-details-message">
          Loading parent/guardian details...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="guardian-details-page">
        <Link className="guardian-details-back" to="/guardians">
          ← Back to Parent/Guardians
        </Link>

        <section
          className="guardian-details-message guardian-details-error"
          role="alert"
        >
          {error}
        </section>
      </main>
    );
  }

  if (!guardian) {
    return (
      <main className="guardian-details-page">
        <Link className="guardian-details-back" to="/guardians">
          ← Back to Parent/Guardians
        </Link>

        <section className="guardian-details-message">
          Parent/guardian not found.
        </section>
      </main>
    );
  }

  return (
    <main className="guardian-details-page">
      <Link className="guardian-details-back" to="/guardians">
        ← Back to Parent/Guardians
      </Link>

      <header className="guardian-details-header">
        <div>
          <h1>
            {[guardian.firstName, guardian.middleName, guardian.lastName]
              .filter(Boolean)
              .join(" ")}
          </h1>
          <p>Parent/Guardian Details</p>
        </div>

        <span
          className={`guardian-details-status ${
            guardian.status === "INACTIVE" ? "inactive" : ""
          }`}
        >
          {guardian.status || "Unknown"}
        </span>
      </header>

      <div className="guardian-details-grid">
        <section className="guardian-details-card">
          <h2>Contact Information</h2>

          <dl className="guardian-contact-grid">
            <div className="guardian-contact-item">
              <dt>Phone</dt>
              <dd>{guardian.phone || "—"}</dd>
            </div>

            <div className="guardian-contact-item">
              <dt>Alternate Phone</dt>
              <dd>{guardian.alternatePhone || "—"}</dd>
            </div>

            <div className="guardian-contact-item">
              <dt>Email</dt>
              <dd>{guardian.email || "—"}</dd>
            </div>

            <div className="guardian-contact-item">
              <dt>Address</dt>
              <dd>{guardian.address || "—"}</dd>
            </div>

            <div className="guardian-contact-item">
              <dt>Occupation</dt>
              <dd>{guardian.occupation || "—"}</dd>
            </div>
          </dl>
        </section>

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
                  </tr>
                </thead>

                <tbody>
                  {linkedStudents.map((item, index) => {
                    const student = item.student || item;

                    const studentName =
                      [student.firstName, student.middleName, student.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      student.fullName ||
                      "Student";

                    return (
                      <tr
                        key={
                          item.relationshipId ||
                          item.studentId ||
                          student.id ||
                          index
                        }
                      >
                        <td className="guardian-student-name">{studentName}</td>

                        <td>{item.relationship || "—"}</td>

                        <td>
                          <span
                            className={`guardian-detail-flag ${
                              item.isPrimary ? "yes" : ""
                            }`}
                          >
                            {item.isPrimary ? "Yes" : "No"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`guardian-detail-flag ${
                              item.isEmergencyContact ? "yes" : ""
                            }`}
                          >
                            {item.isEmergencyContact ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default GuardianDetails;
