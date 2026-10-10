import { useCallback, useEffect, useState } from "react";
import { Search, UserPlus, RefreshCw, X, Save } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getParentGuardians,
  createParentGuardian,
  updateParentGuardian,
  activateParentGuardian,
  deactivateParentGuardian,
  linkGuardianToStudent,
  getGuardianStudents,
  unlinkGuardianFromStudent,
} from "../../services/parentGuardianService.js";
import { getStudents } from "../../services/studentService.js";
import "./Guardians.css";

const initialFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  alternatePhone: "",
  email: "",
  address: "",
  occupation: "",
};

export default function ParentGuardians() {
  const [guardians, setGuardians] = useState([]);
  const [allGuardians, setAllGuardians] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalGuardians = allGuardians.length;

  const activeGuardians = allGuardians.filter(
    (guardian) => guardian.status === "ACTIVE",
  ).length;

  const inactiveGuardians = allGuardians.filter(
    (guardian) => guardian.status === "INACTIVE",
  ).length;

  const totalLinkedStudents = allGuardians.reduce(
    (total, guardian) => total + Number(guardian.studentCount || 0),
    0,
  );

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState(null);

  const [linkedStudents, setLinkedStudents] = useState([]);
  const [showLinkedStudents, setShowLinkedStudents] = useState(false);
  const [linkedStudentsLoading, setLinkedStudentsLoading] = useState(false);
  const [linkedStudentsError, setLinkedStudentsError] = useState("");

  const [linkFormData, setLinkFormData] = useState({
    studentId: "",
    relationship: "",
    isPrimary: false,
    isEmergencyContact: false,
  });

  const [linkFormLoading, setLinkFormLoading] = useState(false);
  const [linkFormError, setLinkFormError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const totalPages = Math.ceil(guardians.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedGuardians = guardians.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status]);

  const [editingGuardianId, setEditingGuardianId] = useState(null);

  const loadGuardians = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [filteredResponse, allResponse] = await Promise.all([
        getParentGuardians({ search, status }),
        getParentGuardians(),
      ]);

      const guardianList = Array.isArray(filteredResponse)
        ? filteredResponse
        : filteredResponse.parentGuardians || [];

      const allGuardianList = Array.isArray(allResponse)
        ? allResponse
        : allResponse.parentGuardians || [];

      setGuardians(guardianList);
      setAllGuardians(allGuardianList);
    } catch (err) {
      console.error("Failed to load parent/guardians:", err);
      setError(
        err.response?.data?.message || "Unable to load parent/guardians.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  const loadStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      setLinkFormError("");

      const response = await getStudents({
        page: 1,
        limit: 100,
        sortBy: "lastName",
        sortOrder: "asc",
      });

      setStudents(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load students for guardian linking:", err);
      setLinkFormError(
        err.response?.data?.message ||
          "Unable to load students. Please try again.",
      );
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuardians();
  }, [loadGuardians]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleOpenAddForm() {
    setEditingGuardianId(null);
    setFormData({ ...initialFormData });
    setFormError("");
    setSuccessMessage("");
    setShowAddForm(true);
  }

  async function handleOpenLinkForm(guardian) {
    setSelectedGuardian(guardian);
    setLinkFormError("");
    setLinkFormData({
      studentId: "",
      relationship: "",
      isPrimary: false,
      isEmergencyContact: false,
    });
    setShowLinkForm(true);

    await loadStudents();
  }

  async function handleViewLinkedStudents(guardian) {
    setSelectedGuardian(guardian);
    setShowLinkedStudents(true);
    setLinkedStudents([]);
    setLinkedStudentsError("");

    try {
      setLinkedStudentsLoading(true);

      const response = await getGuardianStudents(guardian.id);

      const studentList = Array.isArray(response)
        ? response
        : response.students || response.data || [];

      setLinkedStudents(studentList);
    } catch (err) {
      console.error("Failed to load linked students:", err);
      setLinkedStudentsError(
        err.response?.data?.message ||
          "Unable to load students linked to this guardian.",
      );
    } finally {
      setLinkedStudentsLoading(false);
    }
  }

  async function handleUnlinkStudent(parentGuardianId, studentId) {
    const confirmed = window.confirm(
      "Are you sure you want to unlink this student from the parent/guardian?",
    );

    if (!confirmed) return;

    try {
      setLinkedStudentsError("");

      await unlinkGuardianFromStudent(parentGuardianId, studentId);

      setLinkedStudents((currentStudents) =>
        currentStudents.filter((item) => {
          const student = item.student || item;
          return (item.studentId || student.id) !== studentId;
        }),
      );

      setSuccessMessage("Student unlinked successfully.");
    } catch (err) {
      console.error("Failed to unlink student:", err);

      setLinkedStudentsError(
        err.response?.data?.message ||
          "Unable to unlink this student. Please try again.",
      );
    }
  }

  async function handleLinkGuardianToStudent(event) {
    event.preventDefault();

    if (!selectedGuardian) {
      setLinkFormError("Please select a parent/guardian.");
      return;
    }

    try {
      setLinkFormLoading(true);
      setLinkFormError("");
      setSuccessMessage("");

      await linkGuardianToStudent(selectedGuardian.id, {
        studentId: linkFormData.studentId,
        relationship: linkFormData.relationship,
        isPrimary: linkFormData.isPrimary,
        isEmergencyContact: linkFormData.isEmergencyContact,
      });

      setShowLinkForm(false);
      setSelectedGuardian(null);
      setLinkFormData({
        studentId: "",
        relationship: "",
        isPrimary: false,
        isEmergencyContact: false,
      });

      setSuccessMessage("Student linked to parent/guardian successfully.");

      await loadGuardians();
    } catch (err) {
      console.error("Failed to link student to guardian:", err);
      setLinkFormError(
        err.response?.data?.message ||
          "Unable to link the student to this parent/guardian. Please try again.",
      );
    } finally {
      setLinkFormLoading(false);
    }
  }

  function handleOpenEditForm(guardian) {
    setEditingGuardianId(guardian.id);

    setFormData({
      firstName: guardian.firstName || "",
      middleName: guardian.middleName || "",
      lastName: guardian.lastName || "",
      phone: guardian.phone || "",
      alternatePhone: guardian.alternatePhone || "",
      email: guardian.email || "",
      address: guardian.address || "",
      occupation: guardian.occupation || "",
    });

    setFormError("");
    setSuccessMessage("");
    setShowAddForm(true);
  }

  function handleCloseAddForm() {
    if (formLoading) return;

    setShowAddForm(false);
    setFormError("");
    setFormData({ ...initialFormData });
  }

  async function handleCreateGuardian(event) {
    event.preventDefault();

    try {
      setFormLoading(true);
      setFormError("");
      setSuccessMessage("");

      const payload = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || null,
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        occupation: formData.occupation.trim() || null,
      };

      if (editingGuardianId) {
        await updateParentGuardian(editingGuardianId, payload);
      } else {
        await createParentGuardian(payload);
      }

      setShowAddForm(false);
      setFormData({ ...initialFormData });
      setSuccessMessage("Parent/guardian registered successfully.");

      const wasEditing = Boolean(editingGuardianId);

      setEditingGuardianId(null);
      setShowAddForm(false);
      setFormData({ ...initialFormData });
      setSuccessMessage(
        wasEditing
          ? "Parent/guardian updated successfully."
          : "Parent/guardian registered successfully.",
      );

      await loadGuardians();
    } catch (err) {
      console.error("Failed to create parent/guardian:", err);

      setFormError(
        err.response?.data?.message ||
          "Unable to register the parent/guardian. Please try again.",
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function handleToggleGuardianStatus(guardian) {
    const isActive = guardian.status === "ACTIVE";
    const action = isActive ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${formatGuardianName(guardian)}?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccessMessage("");

      if (isActive) {
        await deactivateParentGuardian(guardian.id);
      } else {
        await activateParentGuardian(guardian.id);
      }

      setSuccessMessage(
        `${formatGuardianName(guardian)} has been ${isActive ? "deactivated" : "activated"} successfully.`,
      );

      await loadGuardians();
    } catch (err) {
      console.error("Failed to change guardian status:", err);
      setError(
        err.response?.data?.message ||
          "Unable to change the parent/guardian status. Please try again.",
      );
    }
  }

  function formatGuardianName(guardian) {
    return [guardian.firstName, guardian.middleName, guardian.lastName]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <main className="guardian-page">
      <header className="guardian-page-header">
        <div>
          <h1>Parents &amp; Guardians</h1>
          <p>Manage parent and guardian records for your school.</p>
        </div>

        <button
          type="button"
          className="guardian-primary-button"
          onClick={handleOpenAddForm}
        >
          <UserPlus size={18} />
          Add Guardian
        </button>
      </header>

      <section className="guardian-stats-grid" aria-label="Guardian statistics">
        <article className="guardian-stat-card guardian-stat-total">
          <div className="guardian-stat-icon">
            <UserPlus size={22} />
          </div>
          <div>
            <p>Total Guardians</p>
            <h2>{totalGuardians}</h2>
            <span>Currently displayed</span>
          </div>
        </article>

        <article className="guardian-stat-card guardian-stat-active">
          <div className="guardian-stat-icon">
            <span className="guardian-stat-dot" />
          </div>
          <div>
            <p>Active Guardians</p>
            <h2>{activeGuardians}</h2>
            <span>Available for linking</span>
          </div>
        </article>

        <article className="guardian-stat-card guardian-stat-inactive">
          <div className="guardian-stat-icon">
            <X size={22} />
          </div>
          <div>
            <p>Inactive Guardians</p>
            <h2>{inactiveGuardians}</h2>
            <span>Currently inactive</span>
          </div>
        </article>

        <article className="guardian-stat-card guardian-stat-linked">
          <div className="guardian-stat-icon">
            <Search size={22} />
          </div>
          <div>
            <p>Student Links</p>
            <h2>{totalLinkedStudents}</h2>
            <span>Guardian–student relationships</span>
          </div>
        </article>
      </section>

      {successMessage && (
        <div className="guardian-success" role="status">
          {successMessage}
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {showAddForm && (
        <section className="guardian-form-container">
          <div className="guardian-form-header">
            <div>
              <h2>
                {editingGuardianId
                  ? "Edit Parent/Guardian"
                  : "Register Parent/Guardian"}
              </h2>
              <p>Enter the parent or guardian's contact information.</p>
            </div>

            <button
              type="button"
              className="guardian-close-button"
              onClick={handleCloseAddForm}
              disabled={formLoading}
              aria-label="Close registration form"
            >
              <X size={20} />
            </button>
          </div>

          {formError && (
            <div className="guardian-error" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateGuardian}>
            <div className="guardian-form-grid">
              <label>
                First name *
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleFormChange}
                  required
                  maxLength={100}
                  autoComplete="given-name"
                  disabled={formLoading}
                />
              </label>

              <label>
                Middle name
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleFormChange}
                  maxLength={100}
                  disabled={formLoading}
                />
              </label>

              <label>
                Last name *
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleFormChange}
                  required
                  maxLength={100}
                  autoComplete="family-name"
                  disabled={formLoading}
                />
              </label>

              <label>
                Phone number *
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  required
                  maxLength={30}
                  autoComplete="tel"
                  disabled={formLoading}
                />
              </label>

              <label>
                Alternate phone
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleFormChange}
                  maxLength={30}
                  disabled={formLoading}
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  maxLength={254}
                  autoComplete="email"
                  disabled={formLoading}
                />
              </label>

              <label>
                Occupation
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleFormChange}
                  maxLength={150}
                  disabled={formLoading}
                />
              </label>

              <label>
                Address
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  maxLength={255}
                  autoComplete="street-address"
                  disabled={formLoading}
                />
              </label>
            </div>

            <p className="guardian-form-note">* Required fields</p>

            <div className="guardian-form-actions">
              <button
                type="button"
                className="guardian-cancel-button"
                onClick={handleCloseAddForm}
                disabled={formLoading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="guardian-primary-button"
                disabled={formLoading}
              >
                <Save size={18} />
                {formLoading
                  ? "Saving..."
                  : editingGuardianId
                    ? "Save Changes"
                    : "Save Guardian"}
              </button>
            </div>
          </form>
        </section>
      )}

      {showLinkedStudents && selectedGuardian && (
        <section className="guardian-form-container">
          <div className="guardian-form-header">
            <div>
              <h2>Linked Students</h2>
              <p>Parent/Guardian: {formatGuardianName(selectedGuardian)}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowLinkedStudents(false);
                setSelectedGuardian(null);
                setLinkedStudents([]);
                setLinkedStudentsError("");
              }}
              disabled={linkedStudentsLoading}
            >
              Close
            </button>
          </div>

          {linkedStudentsError && (
            <div className="guardian-error-message" role="alert">
              {linkedStudentsError}
            </div>
          )}

          {linkedStudentsLoading ? (
            <p>Loading linked students...</p>
          ) : linkedStudents.length === 0 && !linkedStudentsError ? (
            <p>This guardian has no linked students yet.</p>
          ) : (
            <div className="guardian-table-container">
              <table className="guardian-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Relationship</th>
                    <th>Primary Contact</th>
                    <th>Emergency Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {linkedStudents.map((item) => {
                    const student = item.student || item;
                    const studentId = item.studentId || student.id;
                    const relationship =
                      item.relationship || item.guardianRelationship || "—";

                    const studentName = [
                      student.firstName,
                      student.middleName,
                      student.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <tr key={item.id || student.id}>
                        <td>{studentName || "Name unavailable"}</td>
                        <td>{relationship.replaceAll("_", " ")}</td>
                        <td>{item.isPrimary ? "Yes" : "No"}</td>
                        <td>{item.isEmergencyContact ? "Yes" : "No"}</td>
                        <td>
                          <button
                            type="button"
                            className="guardian-unlink-button"
                            onClick={() =>
                              handleUnlinkStudent(
                                selectedGuardian.id,
                                studentId,
                              )
                            }
                          >
                            Unlink
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

      {showLinkForm && selectedGuardian && (
        <section className="guardian-form-container">
          <div className="guardian-form-header">
            <div>
              <h2>Link Student to Guardian</h2>
              <p>Parent/Guardian: {formatGuardianName(selectedGuardian)}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowLinkForm(false);
                setSelectedGuardian(null);
                setLinkFormError("");
              }}
              disabled={linkFormLoading}
            >
              Close
            </button>
          </div>

          {linkFormError && (
            <div className="guardian-error-message" role="alert">
              {linkFormError}
            </div>
          )}

          <form onSubmit={handleLinkGuardianToStudent}>
            <div className="guardian-form-grid">
              <label>
                Student
                <select
                  value={linkFormData.studentId}
                  onChange={(event) =>
                    setLinkFormData((previous) => ({
                      ...previous,
                      studentId: event.target.value,
                    }))
                  }
                  required
                  disabled={studentsLoading || linkFormLoading}
                >
                  <option value="">
                    {studentsLoading ? "Loading students..." : "Select student"}
                  </option>

                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.middleName || ""}{" "}
                      {student.lastName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Relationship
                <select
                  value={linkFormData.relationship}
                  onChange={(event) =>
                    setLinkFormData((previous) => ({
                      ...previous,
                      relationship: event.target.value,
                    }))
                  }
                  required
                  disabled={linkFormLoading}
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
              </label>

              <label className="guardian-checkbox-label">
                <input
                  type="checkbox"
                  checked={linkFormData.isPrimary}
                  onChange={(event) =>
                    setLinkFormData((previous) => ({
                      ...previous,
                      isPrimary: event.target.checked,
                    }))
                  }
                  disabled={linkFormLoading}
                />
                Primary contact
              </label>

              <label className="guardian-checkbox-label">
                <input
                  type="checkbox"
                  checked={linkFormData.isEmergencyContact}
                  onChange={(event) =>
                    setLinkFormData((previous) => ({
                      ...previous,
                      isEmergencyContact: event.target.checked,
                    }))
                  }
                  disabled={linkFormLoading}
                />
                Emergency contact
              </label>
            </div>

            {students.length === 0 && !studentsLoading && (
              <p>No students were found. Register a student first.</p>
            )}

            <div className="guardian-form-actions">
              <button
                type="submit"
                disabled={
                  linkFormLoading || studentsLoading || students.length === 0
                }
              >
                {linkFormLoading ? "Linking..." : "Link Student"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="guardian-toolbar">
        <form onSubmit={handleSearchSubmit} className="guardian-search-form">
          <Search size={18} />

          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, phone, or email"
            aria-label="Search parents and guardians"
          />

          <button type="submit">Search</button>
        </form>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter guardians by status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <button
          type="button"
          className="guardian-refresh-button"
          onClick={loadGuardians}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="guardian-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadGuardians}>
            Try again
          </button>
        </div>
      )}

      <section className="guardian-table-container">
        {loading ? (
          <p className="guardian-message">Loading parents and guardians...</p>
        ) : error ? null : guardians.length === 0 ? (
          <p className="guardian-message">
            No parents or guardians found. Try changing your search or filter.
          </p>
        ) : (
          <div className="guardian-table-scroll">
            <table className="guardian-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Occupation</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {guardians.map((guardian) => (
                  <tr key={guardian.id}>
                    <td>{formatGuardianName(guardian) || "—"}</td>
                    <td>{guardian.phone || "—"}</td>
                    <td>{guardian.email || "—"}</td>
                    <td>{guardian.occupation || "—"}</td>
                    <td>{guardian.studentCount ?? 0}</td>
                    <td>
                      <span
                        className={`guardian-status guardian-status-${String(
                          guardian.status || "unknown",
                        ).toLowerCase()}`}
                      >
                        {guardian.status || "Unknown"}
                      </span>
                    </td>

                    <td>
                      <div className="guardian-row-actions">
                        <Link
                          to={`/guardians/${guardian.id}`}
                          className="guardian-view-details-button"
                        >
                          View Details
                        </Link>
                        <button
                          type="button"
                          className="guardian-edit-button"
                          onClick={() => handleOpenEditForm(guardian)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            guardian.status === "ACTIVE"
                              ? "guardian-deactivate-button"
                              : "guardian-activate-button"
                          }
                          onClick={() => handleToggleGuardianStatus(guardian)}
                        >
                          {guardian.status === "ACTIVE"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          className="guardian-link-button"
                          onClick={() => handleOpenLinkForm(guardian)}
                          disabled={guardian.status !== "ACTIVE"}
                        >
                          Link Student
                        </button>

                        <button
                          type="button"
                          className="guardian-view-students-button"
                          onClick={() => handleViewLinkedStudents(guardian)}
                        >
                          View Students
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && guardians.length > 0 && (
          <div className="guardian-pagination">
            <div className="guardian-pagination-info">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </div>

            <div className="guardian-pagination-controls">
              <label>
                Rows per page:
                <select
                  value={itemsPerPage}
                  onChange={(event) => {
                    setItemsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(page + 1, totalPages))
                }
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {!loading && !error && guardians.length > 0 && (
        <p className="guardian-result-count">
          {guardians.length} parent/guardian record
          {guardians.length === 1 ? "" : "s"} found
        </p>
      )}
    </main>
  );
}
