import "./Students.css";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import {
  getStudents,
  admitStudent,
  updateStudent,
  deleteStudent,
} from "../../services/studentService.js";
import {
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    // Student details
    admissionNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",

    // Parent/guardian details
    guardianFirstName: "",
    guardianMiddleName: "",
    guardianLastName: "",
    guardianPhone: "",
    guardianAlternatePhone: "",
    guardianEmail: "",
    guardianAddress: "",
    guardianOccupation: "",

    // Relationship to the student
    relationship: "",
    isPrimary: true,
    isEmergencyContact: true,
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [statusUpdatingStudentId, setStatusUpdatingStudentId] = useState(null);
  const [statusUpdateError, setStatusUpdateError] = useState("");

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getStudents({
        search,
        status,
        page: pagination.page,
        limit: pagination.limit,
      });

      setStudents(response.data || []);
      setPagination((current) => response.pagination || current);
    } catch (err) {
      console.error("Failed to load students:", err);

      setError(err.response?.data?.message || "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, [search, status, pagination.page, pagination.limit]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  function handleSearchSubmit(event) {
    event.preventDefault();

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);

    setPagination((current) => ({
      ...current,
      page: 1,
    }));
  }

  async function handleStudentStatusChange(student, newStatus) {
    if (!newStatus || newStatus === student.status) {
      return;
    }

    try {
      setStatusUpdatingStudentId(student.id);
      setStatusUpdateError("");

      await updateStudent(student.id, {
        status: newStatus,
      });

      await loadStudents();
    } catch (err) {
      console.error("Failed to update student status:", err);

      setStatusUpdateError(
        err.response?.data?.message || "Unable to update student status.",
      );
    } finally {
      setStatusUpdatingStudentId(null);
    }
  }

  const handleDeleteStudent = async (student) => {
    const studentName = formatStudentName(student);

    const confirmed = window.confirm(
      `Are you sure you want to delete ${studentName}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteStudent(student.id);

      setStudents((currentStudents) =>
        currentStudents.filter(
          (currentStudent) => currentStudent.id !== student.id,
        ),
      );
    } catch (error) {
      console.error("Delete student error:", error);

      const message =
        error.response?.data?.message || "Failed to delete student.";

      window.alert(message);
    }
  };

  function goToPreviousPage() {
    setPagination((current) => ({
      ...current,
      page: Math.max(1, current.page - 1),
    }));
  }

  function goToNextPage() {
    setPagination((current) => ({
      ...current,
      page: Math.min(current.totalPages, current.page + 1),
    }));
  }

  function formatStudentName(student) {
    return [student.firstName, student.middleName, student.lastName]
      .filter(Boolean)
      .join(" ");
  }

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString();
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetStudentForm() {
    setFormData({
      // Student details
      admissionNumber: "",
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      email: "",
      address: "",

      // Parent/guardian details
      guardianFirstName: "",
      guardianMiddleName: "",
      guardianLastName: "",
      guardianPhone: "",
      guardianAlternatePhone: "",
      guardianEmail: "",
      guardianAddress: "",
      guardianOccupation: "",

      // Relationship to the student
      relationship: "",
      isPrimary: true,
      isEmergencyContact: true,
    });

    setFormError("");
  }

  function handleOpenAddForm() {
    resetStudentForm();
    setShowAddForm(true);
  }

  function handleCloseAddForm() {
    if (formLoading) {
      return;
    }

    setShowAddForm(false);
    resetStudentForm();
  }

  async function handleCreateStudent(event) {
    event.preventDefault();

    try {
      setFormLoading(true);
      setFormError("");

      const payload = {
        student: {
          admissionNumber: formData.admissionNumber.trim(),
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim() || undefined,
          lastName: formData.lastName.trim(),
          dateOfBirth: formData.dateOfBirth || undefined,
          gender: formData.gender,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
        },

        guardian: {
          firstName: formData.guardianFirstName.trim(),
          middleName: formData.guardianMiddleName.trim() || undefined,
          lastName: formData.guardianLastName.trim(),
          phone: formData.guardianPhone.trim(),
          alternatePhone: formData.guardianAlternatePhone.trim() || undefined,
          email: formData.guardianEmail.trim() || undefined,
          address: formData.guardianAddress.trim() || undefined,
          occupation: formData.guardianOccupation.trim() || undefined,
        },

        relationship: formData.relationship,
        isPrimary: formData.isPrimary,
        isEmergencyContact: formData.isEmergencyContact,
      };

      await admitStudent(payload);

      setShowAddForm(false);
      resetStudentForm();

      setPagination((current) => ({
        ...current,
        page: 1,
      }));

      await loadStudents();
    } catch (err) {
      console.error("Failed to admit student:", err);

      setFormError(
        err.response?.data?.message || "Unable to complete student admission.",
      );
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="students-page">
      <section className="students-page-header">
        <div>
          <h1>Students</h1>
          <p>
            Manage student records, enrollment information, and student details.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleOpenAddForm}
        >
          <UserPlus size={18} />
          Add Student
        </button>
      </section>

      <section className="students-toolbar">
        <form className="students-search" onSubmit={handleSearchSubmit}>
          <Search size={18} />

          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button type="submit" className="secondary-button">
            Search
          </button>
        </form>

        <select
          className="students-status-filter"
          value={status}
          onChange={handleStatusChange}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="GRADUATED">Graduated</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </section>

      {error && <div className="dashboard-error">{error}</div>}

      {statusUpdateError && (
        <div className="dashboard-error">{statusUpdateError}</div>
      )}

      <section className="students-table-card">
        <div className="students-table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>Admission Number</th>
                <th>Student Name</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="students-empty">
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="students-empty">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.admissionNumber}</strong>
                    </td>

                    <td>{formatStudentName(student)}</td>

                    <td>{student.gender || "—"}</td>

                    <td>{formatDate(student.dateOfBirth)}</td>

                    <td>{student.phone || "—"}</td>

                    <td>
                      <span
                        className={`student-status student-status-${student.status.toLowerCase()}`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td>
                      <div className="student-actions">
                        <Link
                          to={`/students/${student.id}`}
                          className="student-view-link"
                        >
                          View
                        </Link>

                        <Link
                          to={`/students/${student.id}?edit=true`}
                          className="student-edit-link"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          className="student-delete-link"
                          onClick={() => handleDeleteStudent(student)}
                        >
                          Delete
                        </button>

                        <select
                          className="student-status-action"
                          value={student.status}
                          onChange={(event) =>
                            handleStudentStatusChange(
                              student,
                              event.target.value,
                            )
                          }
                          disabled={statusUpdatingStudentId === student.id}
                          aria-label={`Change status for ${formatStudentName(student)}`}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="GRADUATED">Graduated</option>
                          <option value="TRANSFERRED">Transferred</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>

                        {statusUpdatingStudentId === student.id && (
                          <RefreshCw
                            size={16}
                            className="student-status-loading"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {showAddForm && (
            <div className="student-modal-overlay">
              <div className="student-modal">
                <div className="student-modal-header">
                  <div>
                    <h2>Admit Student</h2>
                    <p>
                      Enter the student's details and their parent or guardian
                      information.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="student-modal-close"
                    onClick={handleCloseAddForm}
                    disabled={formLoading}
                  >
                    ×
                  </button>
                </div>

                {formError && (
                  <div className="dashboard-error">{formError}</div>
                )}

                <form className="student-form" onSubmit={handleCreateStudent}>
                  <div className="student-form-grid">
                    <div className="student-form-field">
                      <label htmlFor="admissionNumber">
                        Admission Number *
                      </label>

                      <input
                        id="admissionNumber"
                        name="admissionNumber"
                        type="text"
                        value={formData.admissionNumber}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="firstName">First Name *</label>

                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="middleName">Middle Name</label>

                      <input
                        id="middleName"
                        name="middleName"
                        type="text"
                        value={formData.middleName}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="lastName">Last Name *</label>

                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="dateOfBirth">Date of Birth</label>

                      <input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="gender">Gender *</label>

                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="phone">Phone</label>

                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="email">Email</label>

                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field student-form-field-full">
                      <label htmlFor="address">Address</label>

                      <textarea
                        id="address"
                        name="address"
                        rows="3"
                        value={formData.address}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field-full">
                      <h3>Parent / Guardian Information</h3>
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="guardianFirstName">First Name *</label>
                      <input
                        id="guardianFirstName"
                        name="guardianFirstName"
                        value={formData.guardianFirstName}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="guardianMiddleName">Middle Name</label>
                      <input
                        id="guardianMiddleName"
                        name="guardianMiddleName"
                        value={formData.guardianMiddleName}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="guardianLastName">Last Name *</label>
                      <input
                        id="guardianLastName"
                        name="guardianLastName"
                        value={formData.guardianLastName}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="guardianPhone">Phone Number *</label>
                      <input
                        id="guardianPhone"
                        name="guardianPhone"
                        type="tel"
                        value={formData.guardianPhone}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="guardianAlternatePhone">
                        Alternative Phone
                      </label>
                      <input
                        id="guardianAlternatePhone"
                        name="guardianAlternatePhone"
                        type="tel"
                        value={formData.guardianAlternatePhone}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="guardianEmail">Email</label>
                      <input
                        id="guardianEmail"
                        name="guardianEmail"
                        type="email"
                        value={formData.guardianEmail}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="guardianAddress">Address</label>
                      <input
                        id="guardianAddress"
                        name="guardianAddress"
                        value={formData.guardianAddress}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="guardianOccupation">Occupation</label>
                      <input
                        id="guardianOccupation"
                        name="guardianOccupation"
                        value={formData.guardianOccupation}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="student-form-field">
                      <label htmlFor="relationship">
                        Relationship to Student *
                      </label>
                      <select
                        id="relationship"
                        name="relationship"
                        value={formData.relationship}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Select relationship</option>
                        <option value="FATHER">Father</option>
                        <option value="MOTHER">Mother</option>
                        <option value="GUARDIAN">Guardian</option>
                        <option value="GRANDPARENT">Grandparent</option>
                        <option value="SIBLING">Sibling</option>
                        <option value="UNCLE">Uncle</option>
                        <option value="AUNT">Aunt</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="student-form-field-full">
                      <label>
                        <input
                          type="checkbox"
                          name="isPrimary"
                          checked={formData.isPrimary}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              isPrimary: event.target.checked,
                            }))
                          }
                        />
                        Primary guardian
                      </label>
                    </div>

                    <div className="student-form-field-full">
                      <label>
                        <input
                          type="checkbox"
                          name="isEmergencyContact"
                          checked={formData.isEmergencyContact}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              isEmergencyContact: event.target.checked,
                            }))
                          }
                        />
                        Emergency contact
                      </label>
                    </div>
                  </div>

                  <div className="student-form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleCloseAddForm}
                      disabled={formLoading}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={formLoading}
                    >
                      {formLoading ? "Creating..." : "Create Student"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="students-pagination">
          <span>
            Showing{" "}
            {students.length > 0
              ? (pagination.page - 1) * pagination.limit + 1
              : 0}{" "}
            to {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
            of {pagination.total} students
          </span>

          <div className="students-pagination-controls">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={pagination.page <= 1 || loading}
              className="pagination-button"
            >
              <ChevronLeft size={17} />
              Previous
            </button>

            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="pagination-button"
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
