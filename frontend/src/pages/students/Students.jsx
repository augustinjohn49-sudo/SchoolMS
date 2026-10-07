import "./Students.css";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { getStudents, createStudent } from "../../services/studentService.js";

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
    admissionNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadStudents() {
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
      setPagination(response.pagination || pagination);
    } catch (err) {
      console.error("Failed to load students:", err);

      setError(err.response?.data?.message || "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, [pagination.page, pagination.limit, status]);

  // function handleSearchSubmit(event) {
  //   event.preventDefault();

  //   setPagination((current) => ({
  //     ...current,
  //     page: 1,
  //   }));

  //   loadStudents();
  // }

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
      admissionNumber: "",
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      email: "",
      address: "",
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
        admissionNumber: formData.admissionNumber.trim(),
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      await createStudent(payload);

      setShowAddForm(false);
      resetStudentForm();

      setPagination((current) => ({
        ...current,
        page: 1,
      }));

      await loadStudents();
    } catch (err) {
      console.error("Failed to create student:", err);

      setFormError(err.response?.data?.message || "Unable to create student.");
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
        </select>
      </section>

      {error && <div className="dashboard-error">{error}</div>}

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
                      <Link
                        to={`/students/${student.id}`}
                        className="student-view-link"
                      >
                        View
                      </Link>
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
                    <h2>Add Student</h2>
                    <p>Enter the student's basic information.</p>
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
