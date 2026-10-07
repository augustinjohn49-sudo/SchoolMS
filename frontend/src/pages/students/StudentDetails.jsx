import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Phone, UserRound } from "lucide-react";

import {
  getStudentById,
  updateStudent,
} from "../../services/studentService.js";

import {
  createStudentEnrollment,
  getStudentEnrollmentHistory,
  getAcademicYears,
  getClassesByAcademicYear,
  getStreamsByClass,
  updateStudentEnrollment,
  deleteStudentEnrollment,
} from "../../services/studentEnrollmentService.js";

import "./StudentDetails.css";

export default function StudentDetails() {
  const { studentId } = useParams();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    status: "",
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const [enrollmentsError, setEnrollmentsError] = useState("");

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);

  const [editAcademicYears, setEditAcademicYears] = useState([]);
  const [editClasses, setEditClasses] = useState([]);
  const [editStreams, setEditStreams] = useState([]);

  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState("");

  const [enrollmentForm, setEnrollmentForm] = useState({
    academicYearId: "",
    classId: "",
    streamId: "",
  });

  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [editEnrollmentForm, setEditEnrollmentForm] = useState({
    academicYearId: "",
    classId: "",
    streamId: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        setError("");

        const response = await getStudentById(studentId);

        setStudent(response.data);
      } catch (err) {
        console.error("Failed to load student:", err);

        setError(
          err.response?.data?.message || "Unable to load student details.",
        );
      } finally {
        setLoading(false);
      }
    }

    async function loadEnrollmentHistory() {
      try {
        setEnrollmentsLoading(true);
        setEnrollmentsError("");

        const response = await getStudentEnrollmentHistory(studentId);

        setEnrollments(response.data || []);
      } catch (err) {
        console.error("Failed to load enrollment history:", err);

        setEnrollmentsError(
          err.response?.data?.message || "Failed to load enrollment history.",
        );
      } finally {
        setEnrollmentsLoading(false);
      }
    }

    loadStudent();
    loadEnrollmentHistory();
  }, [studentId]);

  async function loadAcademicYears() {
    try {
      setEnrollmentError("");

      const response = await getAcademicYears();

      const activeAcademicYears = (response.data || []).filter(
        (year) => year.status === "ACTIVE",
      );

      setAcademicYears(activeAcademicYears);

      // Automatically select the active academic year
      // when there is only one available.
      if (activeAcademicYears.length === 1) {
        const activeYear = activeAcademicYears[0];

        setEnrollmentForm((previous) => ({
          ...previous,
          academicYearId: activeYear.id,
          classId: "",
          streamId: "",
        }));

        setClasses([]);
        setStreams([]);

        await loadClasses(activeYear.id);
      }
    } catch (err) {
      console.error("Failed to load academic years:", err);

      setEnrollmentError(
        err.response?.data?.message || "Failed to load academic years.",
      );
    }
  }

  async function loadClasses(academicYearId) {
    try {
      setEnrollmentError("");

      const response = await getClassesByAcademicYear(academicYearId);

      setClasses(response.data || []);
    } catch (err) {
      console.error("Failed to load classes:", err);

      setEnrollmentError(
        err.response?.data?.message || "Failed to load classes.",
      );
    }
  }

  async function loadStreams(classId) {
    try {
      setEnrollmentError("");

      const response = await getStreamsByClass(classId);

      setStreams(response.data || []);
    } catch (err) {
      console.error("Failed to load streams:", err);

      setEnrollmentError(
        err.response?.data?.message || "Failed to load streams.",
      );
    }
  }

  async function loadEditAcademicYears() {
    try {
      const response = await getAcademicYears();

      setEditAcademicYears(response.data || []);
    } catch (error) {
      console.error(
        "Failed to load academic years for editing enrollment:",
        error,
      );

      setEnrollmentError(
        error.response?.data?.message || "Failed to load academic years.",
      );
    }
  }

  async function loadEditClasses(academicYearId) {
    if (!academicYearId) {
      setEditClasses([]);
      setEditStreams([]);
      return;
    }

    try {
      const response = await getClassesByAcademicYear(academicYearId);

      setEditClasses(response.data || []);
      setEditStreams([]);
    } catch (error) {
      console.error("Failed to load classes for editing enrollment:", error);

      setEditClasses([]);
      setEditStreams([]);

      setEnrollmentError(
        error.response?.data?.message || "Failed to load classes.",
      );
    }
  }

  async function loadEditStreams(classId) {
    if (!classId) {
      setEditStreams([]);
      return;
    }

    try {
      const response = await getStreamsByClass(classId);

      setEditStreams(response.data || []);
    } catch (error) {
      console.error("Failed to load streams for editing enrollment:", error);

      setEditStreams([]);

      setEnrollmentError(
        error.response?.data?.message || "Failed to load streams.",
      );
    }
  }

  function handleEnrollmentChange(event) {
    const { name, value } = event.target;

    setEnrollmentForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "academicYearId") {
      setEnrollmentForm((previous) => ({
        ...previous,
        academicYearId: value,
        classId: "",
        streamId: "",
      }));

      setClasses([]);
      setStreams([]);

      if (value) {
        loadClasses(value);
      }
    }

    if (name === "classId") {
      setEnrollmentForm((previous) => ({
        ...previous,
        classId: value,
        streamId: "",
      }));

      setStreams([]);

      if (value) {
        loadStreams(value);
      }
    }
  }

  async function handleEditEnrollmentChange(event) {
    const { name, value } = event.target;

    setEditEnrollmentForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "academicYearId") {
      setEditEnrollmentForm((previous) => ({
        ...previous,
        academicYearId: value,
        classId: "",
        streamId: "",
      }));

      setEditStreams([]);

      if (value) {
        await loadEditClasses(value);
      } else {
        setEditClasses([]);
      }
    }

    if (name === "classId") {
      setEditEnrollmentForm((previous) => ({
        ...previous,
        classId: value,
        streamId: "",
      }));

      if (value) {
        await loadEditStreams(value);
      } else {
        setEditStreams([]);
      }
    }
  }

  async function openEnrollmentForm() {
    setEnrollmentError("");

    setEnrollmentForm({
      academicYearId: "",
      classId: "",
      streamId: "",
    });

    setClasses([]);
    setStreams([]);

    setShowEnrollmentForm(true);

    await loadAcademicYears();
  }

  async function handleCreateEnrollment(event) {
    event.preventDefault();

    if (!enrollmentForm.academicYearId || !enrollmentForm.classId) {
      setEnrollmentError("Academic year and class are required.");

      return;
    }

    try {
      setEnrollmentLoading(true);
      setEnrollmentError("");

      const payload = {
        studentId,
        academicYearId: enrollmentForm.academicYearId,
        classId: enrollmentForm.classId,
        streamId: enrollmentForm.streamId || null,
      };

      await createStudentEnrollment(payload);

      setShowEnrollmentForm(false);

      const response = await getStudentEnrollmentHistory(studentId);

      setEnrollments(response.data || []);
    } catch (err) {
      console.error("Failed to enroll student:", err);

      setEnrollmentError(
        err.response?.data?.message || "Failed to enroll student.",
      );
    } finally {
      setEnrollmentLoading(false);
    }
  }

  async function handleDeleteEnrollment(enrollment) {
    if (enrollment.status === "ACTIVE") {
      setEnrollmentError(
        "An active student enrollment cannot be deleted. Change the enrollment status first.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this enrollment record? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setEnrollmentLoading(true);
      setEnrollmentError("");

      await deleteStudentEnrollment(enrollment.id);

      const response = await getStudentEnrollmentHistory(studentId);
      setEnrollments(response.data || []);
    } catch (error) {
      console.error("Failed to delete enrollment:", error);

      setEnrollmentError(
        error.response?.data?.message || "Failed to delete enrollment.",
      );
    } finally {
      setEnrollmentLoading(false);
    }
  }

  async function startEditingEnrollment(enrollment) {
    setEnrollmentError("");

    setEditEnrollmentForm({
      academicYearId: enrollment.academicYearId || "",
      classId: enrollment.classId || "",
      streamId: enrollment.streamId || "",
      status: enrollment.status || "ACTIVE",
    });

    setEditClasses([]);
    setEditStreams([]);

    setEditingEnrollment(enrollment);

    try {
      // Load all academic years for editing,
      // including historical/inactive academic years.
      await loadEditAcademicYears();

      // Load classes for the enrollment's academic year.
      if (enrollment.academicYearId) {
        await loadEditClasses(enrollment.academicYearId);
      }

      // Load streams for the enrollment's class.
      if (enrollment.classId) {
        await loadEditStreams(enrollment.classId);
      }
    } catch (error) {
      console.error("Failed to load enrollment edit data:", error);

      setEnrollmentError(
        error.response?.data?.message || "Failed to load enrollment data.",
      );
    }
  }

  function formatStudentName() {
    return [student?.firstName, student?.middleName, student?.lastName]
      .filter(Boolean)
      .join(" ");
  }

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString();
  }

  function startEditing() {
    setEditForm({
      firstName: student.firstName || "",
      middleName: student.middleName || "",
      lastName: student.lastName || "",
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
      gender: student.gender || "",
      phone: student.phone || "",
      email: student.email || "",
      address: student.address || "",
      status: student.status || "",
    });

    setEditError("");
    setEditing(true);
  }

  function cancelEditing() {
    if (saving) {
      return;
    }

    setEditing(false);
    setEditError("");
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleUpdateStudent(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setEditError("");

      const payload = {
        firstName: editForm.firstName.trim(),
        middleName: editForm.middleName.trim() || null,
        lastName: editForm.lastName.trim(),
        dateOfBirth: editForm.dateOfBirth || null,
        gender: editForm.gender,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        address: editForm.address.trim() || null,
        status: editForm.status,
      };

      const response = await updateStudent(studentId, payload);

      setStudent(response.data);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update student:", err);

      setEditError(err.response?.data?.message || "Unable to update student.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="student-details-page">
        <div className="student-details-loading">
          Loading student details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-details-page">
        <Link to="/students" className="student-back-link">
          <ArrowLeft size={17} />
          Back to Students
        </Link>

        <div className="dashboard-error">{error}</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="student-details-page">
        <Link to="/students" className="student-back-link">
          <ArrowLeft size={17} />
          Back to Students
        </Link>

        <div className="student-details-empty">Student not found.</div>
      </div>
    );
  }

  return (
    <div className="student-details-page">
      <div className="student-details-header">
        <div>
          <Link to="/students" className="student-back-link">
            <ArrowLeft size={17} />
            Back to Students
          </Link>

          <div className="student-details-title">
            <div className="student-avatar">
              <UserRound size={28} />
            </div>

            <div>
              <h1>{formatStudentName()}</h1>
              <p>{student.admissionNumber}</p>
            </div>
          </div>
        </div>

        <div className="student-details-actions">
          <button
            type="button"
            className="student-details-button student-details-button-primary"
            onClick={openEnrollmentForm}
          >
            Enroll Student
          </button>

          <button
            type="button"
            className="student-details-button"
            onClick={startEditing}
          >
            Edit Student
          </button>

          <Link to="/students" className="student-details-button">
            Back to Students
          </Link>
        </div>
      </div>

      <section className="student-details-card">
        <div className="student-details-card-header">
          <div>
            <h2>{editing ? "Edit Student" : "Personal Information"}</h2>

            <p>
              {editing
                ? "Update the student's information."
                : "Basic information about the student."}
            </p>
          </div>

          {!editing && (
            <span
              className={`student-status student-status-${student.status.toLowerCase()}`}
            >
              {student.status}
            </span>
          )}
        </div>

        {editing ? (
          <form className="student-edit-form" onSubmit={handleUpdateStudent}>
            {editError && <div className="dashboard-error">{editError}</div>}

            <div className="student-form-grid">
              <div className="student-form-field">
                <label htmlFor="edit-firstName">First Name *</label>
                <input
                  id="edit-firstName"
                  name="firstName"
                  value={editForm.firstName}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="student-form-field">
                <label htmlFor="edit-middleName">Middle Name</label>
                <input
                  id="edit-middleName"
                  name="middleName"
                  value={editForm.middleName}
                  onChange={handleEditChange}
                />
              </div>

              <div className="student-form-field">
                <label htmlFor="edit-lastName">Last Name *</label>
                <input
                  id="edit-lastName"
                  name="lastName"
                  value={editForm.lastName}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="student-form-field">
                <label htmlFor="edit-dateOfBirth">Date of Birth</label>
                <input
                  id="edit-dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={handleEditChange}
                />
              </div>

              <div className="student-form-field">
                <label htmlFor="edit-gender">Gender *</label>
                <select
                  id="edit-gender"
                  name="gender"
                  value={editForm.gender}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div className="student-form-field">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  name="status"
                  value={editForm.status}
                  onChange={handleEditChange}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="GRADUATED">Graduated</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="student-form-field">
                <label htmlFor="edit-phone">Phone</label>
                <input
                  id="edit-phone"
                  name="phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={handleEditChange}
                />
              </div>

              <div className="student-form-field">
                <label htmlFor="edit-email">Email</label>
                <input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                />
              </div>

              <div className="student-form-field student-form-field-full">
                <label htmlFor="edit-address">Address</label>
                <textarea
                  id="edit-address"
                  name="address"
                  rows="3"
                  value={editForm.address}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <div className="student-form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="student-details-grid">
            <div className="student-detail-item">
              <span>Admission Number</span>
              <strong>{student.admissionNumber}</strong>
            </div>

            <div className="student-detail-item">
              <span>Gender</span>
              <strong>{student.gender || "—"}</strong>
            </div>

            <div className="student-detail-item">
              <span>Date of Birth</span>
              <strong>{formatDate(student.dateOfBirth)}</strong>
            </div>

            <div className="student-detail-item">
              <span>Status</span>
              <strong>{student.status}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="student-details-card">
        <div className="student-details-card-header">
          <div>
            <h2>Contact Information</h2>
            <p>Student contact and address details.</p>
          </div>
        </div>

        <div className="student-contact-grid">
          <div className="student-contact-item">
            <Phone size={19} />
            <div>
              <span>Phone</span>
              <strong>{student.phone || "—"}</strong>
            </div>
          </div>

          <div className="student-contact-item">
            <Mail size={19} />
            <div>
              <span>Email</span>
              <strong>{student.email || "—"}</strong>
            </div>
          </div>

          <div className="student-contact-item">
            <MapPin size={19} />
            <div>
              <span>Address</span>
              <strong>{student.address || "—"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="student-details-section">
        <div className="student-details-section-header">
          <div>
            <h2>Enrollment History</h2>
            <p>Academic enrollment records for this student.</p>
          </div>
        </div>

        {enrollmentError && (
          <div className="student-details-error">{enrollmentError}</div>
        )}

        {enrollmentsLoading ? (
          <div className="student-details-loading">
            Loading enrollment history...
          </div>
        ) : enrollmentsError ? (
          <div className="student-details-error">{enrollmentsError}</div>
        ) : enrollments.length === 0 ? (
          <div className="student-details-empty">
            No enrollment history found for this student.
          </div>
        ) : (
          <div className="student-enrollment-table-wrapper">
            <table className="student-enrollment-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Class</th>
                  <th>Stream</th>
                  <th>Status</th>
                  <th>Enrollment Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>{enrollment.academicYearName || "—"}</td>
                    <td>{enrollment.className || "—"}</td>
                    <td>{enrollment.streamName || "—"}</td>

                    <td>
                      <span
                        className={`student-status-badge ${
                          enrollment.status?.toLowerCase() || ""
                        }`}
                      >
                        {enrollment.status || "—"}
                      </span>
                    </td>

                    <td>
                      {enrollment.enrolledAt
                        ? new Date(enrollment.enrolledAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="student-enrollment-edit-button"
                        onClick={() => startEditingEnrollment(enrollment)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="student-enrollment-delete-button"
                        onClick={() => handleDeleteEnrollment(enrollment)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="student-details-card">
        <div className="student-details-card-header">
          <div>
            <h2>Record Information</h2>
            <p>System record timestamps.</p>
          </div>
        </div>

        <div className="student-details-grid">
          <div className="student-detail-item">
            <span>Created</span>
            <strong>{formatDate(student.createdAt)}</strong>
          </div>

          <div className="student-detail-item">
            <span>Last Updated</span>
            <strong>{formatDate(student.updatedAt)}</strong>
          </div>
        </div>
      </section>

      {showEnrollmentForm && (
        <div className="student-modal-overlay">
          <div className="student-modal">
            <div className="student-modal-header">
              <div>
                <h2>Enroll Student</h2>
                <p>
                  Enroll {student.firstName} {student.lastName} into an academic
                  year, class, and stream.
                </p>
              </div>

              <button
                type="button"
                className="student-modal-close"
                onClick={() => setShowEnrollmentForm(false)}
              >
                ×
              </button>
            </div>

            <form className="student-form" onSubmit={handleCreateEnrollment}>
              {enrollmentError && (
                <div className="student-form-error">{enrollmentError}</div>
              )}

              <div className="student-form-field">
                <label htmlFor="academicYearId">Academic Year</label>

                <select
                  id="academicYearId"
                  name="academicYearId"
                  value={enrollmentForm.academicYearId}
                  onChange={handleEnrollmentChange}
                  required
                >
                  <option value="">Select academic year</option>

                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name || year.year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="student-form-field">
                <label htmlFor="classId">Class</label>

                <select
                  id="classId"
                  name="classId"
                  value={enrollmentForm.classId}
                  onChange={handleEnrollmentChange}
                  disabled={!enrollmentForm.academicYearId}
                  required
                >
                  <option value="">Select class</option>

                  {classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="student-form-field">
                <label htmlFor="streamId">Stream</label>

                <select
                  id="streamId"
                  name="streamId"
                  value={enrollmentForm.streamId}
                  onChange={handleEnrollmentChange}
                  disabled={!enrollmentForm.classId}
                >
                  <option value="">Select stream</option>

                  {streams.map((stream) => (
                    <option key={stream.id} value={stream.id}>
                      {stream.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="student-form-actions">
                <button
                  type="button"
                  className="student-form-cancel"
                  onClick={() => setShowEnrollmentForm(false)}
                  disabled={enrollmentLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="student-form-submit"
                  disabled={enrollmentLoading}
                >
                  {enrollmentLoading ? "Enrolling..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingEnrollment && (
        <div className="student-modal-overlay">
          <div className="student-modal">
            <div className="student-modal-header">
              <div>
                <h2>Edit Enrollment</h2>
                <p>
                  Update the academic year, class, stream, or enrollment status.
                </p>
              </div>

              <button
                type="button"
                className="student-modal-close"
                onClick={() => setEditingEnrollment(null)}
                disabled={enrollmentLoading}
              >
                ×
              </button>
            </div>

            <form
              className="student-form"
              onSubmit={async (event) => {
                event.preventDefault();

                if (!editEnrollmentForm.academicYearId) {
                  setEnrollmentError("Please select an academic year.");
                  return;
                }

                if (!editEnrollmentForm.classId) {
                  setEnrollmentError("Please select a class.");
                  return;
                }

                try {
                  setEnrollmentLoading(true);
                  setEnrollmentError("");

                  const payload = {
                    academicYearId: editEnrollmentForm.academicYearId,
                    classId: editEnrollmentForm.classId,
                    streamId: editEnrollmentForm.streamId || null,
                    status: editEnrollmentForm.status,
                  };

                  await updateStudentEnrollment(editingEnrollment.id, payload);

                  setEditingEnrollment(null);

                  const response = await getStudentEnrollmentHistory(studentId);

                  setEnrollments(response.data || []);
                } catch (error) {
                  console.error("Failed to update enrollment:", error);

                  setEnrollmentError(
                    error.response?.data?.message ||
                      "Failed to update enrollment.",
                  );
                } finally {
                  setEnrollmentLoading(false);
                }
              }}
            >
              {enrollmentError && (
                <div className="student-form-error">{enrollmentError}</div>
              )}

              {/* Academic Year */}
              <div className="student-form-field">
                <label htmlFor="edit-enrollment-academic-year">
                  Academic Year
                </label>

                <select
                  id="edit-enrollment-academic-year"
                  name="academicYearId"
                  value={editEnrollmentForm.academicYearId}
                  onChange={handleEditEnrollmentChange}
                  disabled={enrollmentLoading}
                >
                  <option value="">Select academic year</option>

                  {editAcademicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name || year.year || year.academicYear || year.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div className="student-form-field">
                <label htmlFor="edit-enrollment-class">Class</label>

                <select
                  id="edit-enrollment-class"
                  name="classId"
                  value={editEnrollmentForm.classId}
                  onChange={handleEditEnrollmentChange}
                  disabled={
                    enrollmentLoading || !editEnrollmentForm.academicYearId
                  }
                >
                  <option value="">Select class</option>

                  {editClasses.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name ||
                        classItem.className ||
                        classItem.title ||
                        classItem.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stream */}
              <div className="student-form-field">
                <label htmlFor="edit-enrollment-stream">Stream</label>

                <select
                  id="edit-enrollment-stream"
                  name="streamId"
                  value={editEnrollmentForm.streamId}
                  onChange={handleEditEnrollmentChange}
                  disabled={enrollmentLoading || !editEnrollmentForm.classId}
                >
                  <option value="">No stream</option>

                  {editStreams.map((stream) => (
                    <option key={stream.id} value={stream.id}>
                      {stream.name ||
                        stream.streamName ||
                        stream.title ||
                        stream.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="student-form-field">
                <label htmlFor="edit-enrollment-status">Status</label>

                <select
                  id="edit-enrollment-status"
                  name="status"
                  value={editEnrollmentForm.status}
                  onChange={(event) =>
                    setEditEnrollmentForm((previous) => ({
                      ...previous,
                      status: event.target.value,
                    }))
                  }
                  disabled={enrollmentLoading}
                >
                  <option value="ACTIVE">Active</option>

                  <option value="COMPLETED">Completed</option>

                  <option value="TRANSFERRED">Transferred</option>

                  <option value="WITHDRAWN">Withdrawn</option>
                </select>
              </div>

              <div className="student-form-actions">
                <button
                  type="button"
                  className="student-form-cancel"
                  onClick={() => setEditingEnrollment(null)}
                  disabled={enrollmentLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="student-form-submit"
                  disabled={enrollmentLoading}
                >
                  {enrollmentLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
