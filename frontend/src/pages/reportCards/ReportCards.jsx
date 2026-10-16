import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Eye,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  getReportCards,
  getReportCardById,
  createReportCard,
  addReportCardSubject,
  approveReportCard,
  publishReportCard,
  generateReportCard,
} from "../../services/reportCardService.js";

import {
  getAcademicYears,
  getStudentEnrollments,
} from "../../services/studentEnrollmentService.js";

import {
  getTermsByAcademicYear,
  getGradingScales,
  getExams,
  getExamResults,
} from "../../services/reportCardLookupService.js";

import "./ReportCards.css";

function extractList(response, keys = []) {
  if (Array.isArray(response)) return response;

  let value = response;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return [];
    }
  }

  return Array.isArray(value) ? value : [];
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function getStudentName(reportCard) {
  return [reportCard.firstName, reportCard.middleName, reportCard.lastName]
    .filter(Boolean)
    .join(" ");
}

function ReportCards() {
  const [reportCards, setReportCards] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [terms, setTerms] = useState([]);
  const [gradingScales, setGradingScales] = useState([]);

  const [exams, setExams] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedExamResultId, setSelectedExamResultId] = useState("");
  const [examResultsLoading, setExamResultsLoading] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);

  const [filters, setFilters] = useState({
    academicYearId: "",
    termId: "",
    studentId: "",
  });

  const [form, setForm] = useState({
    studentEnrollmentId: "",
    academicYearId: "",
    termId: "",
    gradingScaleId: "",
    title: "",
    overallRemarks: "",
  });

  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadReportCards = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getReportCards({
        academicYearId: filters.academicYearId || undefined,
        termId: filters.termId || undefined,
        studentId: filters.studentId || undefined,
      });

      setReportCards(response.reportCards || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters.academicYearId, filters.termId, filters.studentId]);

  const loadLookups = useCallback(async () => {
    setLookupsLoading(true);

    try {
      const [yearsResponse, scalesResponse] = await Promise.all([
        getAcademicYears(),
        getGradingScales(),
      ]);

      setAcademicYears(yearsResponse.data || []);
      setGradingScales(scalesResponse.data || []);
    } catch (requestError) {
      setError(
        `Unable to load academic years or grading scales: ${getErrorMessage(requestError)}`,
      );
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  const loadEnrollments = useCallback(async (academicYearId) => {
    if (!academicYearId) {
      setEnrollments([]);
      return;
    }

    setEnrollmentsLoading(true);
    setError("");

    try {
      const response = await getStudentEnrollments({
        academicYearId,
        status: "ACTIVE",
        page: 1,
        limit: 100,
      });

      setEnrollments(response.data || []);
    } catch (requestError) {
      setEnrollments([]);
      setError(`Unable to load students: ${getErrorMessage(requestError)}`);
    } finally {
      setEnrollmentsLoading(false);
    }
  }, []);

  const loadExams = useCallback(async (academicYearId, termId) => {
    console.log("Loading exams with:", { academicYearId, termId });
    if (!academicYearId || !termId) {
      setExams([]);
      setSelectedExamId("");
      setExamResults([]);
      setSelectedExamResultId("");
      return;
    }

    try {
      const response = await getExams({
        academicYearId,
        termId,
      });

      console.log("Exams API response:", response);

      setExams(response.data || []);
      setSelectedExamId("");
      setExamResults([]);
      setSelectedExamResultId("");
    } catch (requestError) {
      setExams([]);
      setError(`Unable to load exams: ${getErrorMessage(requestError)}`);
    }
  }, []);

  const loadExamResults = useCallback(async (examId, studentId) => {
    if (!examId || !studentId) {
      setExamResults([]);
      setSelectedExamResultId("");
      return;
    }

    setExamResultsLoading(true);

    try {
      const response = await getExamResults(examId, studentId);

      console.log(
        "Exam results API response:",
        JSON.stringify(response, null, 2),
      );

      setExamResults(response.results || []);
      setSelectedExamResultId("");
    } catch (requestError) {
      setExamResults([]);
      setError(`Unable to load exam results: ${getErrorMessage(requestError)}`);
    } finally {
      setExamResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportCards();
  }, [loadReportCards]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadEnrollments(form.academicYearId);
  }, [form.academicYearId, loadEnrollments]);

  const loadTerms = useCallback(async (academicYearId) => {
    if (!academicYearId) {
      setTerms([]);
      return;
    }

    try {
      const response = await getTermsByAcademicYear(academicYearId);
      setTerms(response.data || []);
    } catch (requestError) {
      setError(`Unable to load terms: ${getErrorMessage(requestError)}`);
    }
  }, []);

  useEffect(() => {
    if (filters.academicYearId) {
      loadTerms(filters.academicYearId);
    } else {
      setTerms([]);
    }
  }, [filters.academicYearId, loadTerms]);

  useEffect(() => {
    if (form.academicYearId) {
      loadTerms(form.academicYearId);
    }
  }, [form.academicYearId, loadTerms]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === "academicYearId" ? { termId: "" } : {}),
    }));
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "academicYearId"
        ? { termId: "", studentEnrollmentId: "" }
        : {}),
    }));

    if (name === "academicYearId") {
      setExams([]);
      setSelectedExamId("");
      setExamResults([]);
      setSelectedExamResultId("");
      loadTerms(value);
    }

    if (name === "termId") {
      setExams([]);
      setSelectedExamId("");
      setExamResults([]);
      setSelectedExamResultId("");

      if (value && form.academicYearId) {
        loadExams(form.academicYearId, value);
      }
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await createReportCard({
        ...form,
        title: form.title.trim() || null,
        overallRemarks: form.overallRemarks.trim() || null,
      });

      setSuccess(response.message || "Report card created successfully.");
      setShowCreateForm(false);
      setForm({
        studentEnrollmentId: "",
        academicYearId: "",
        termId: "",
        gradingScaleId: "",
        title: "",
        overallRemarks: "",
      });

      await loadReportCards();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleView(reportCardId) {
    setError("");
    setSuccess("");
    setActionLoading(reportCardId);

    try {
      const response = await getReportCardById(reportCardId);
      const reportCard = response.reportCard;

      setSelectedCard(reportCard);
      setSelectedExamId("");
      setExamResults([]);
      setSelectedExamResultId("");

      if (reportCard.status === "DRAFT") {
        await loadExams(reportCard.academicYearId, reportCard.termId);
      } else {
        setExams([]);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading("");
    }
  }

  async function handleWorkflowAction(reportCardId, action, successMessage) {
    setError("");
    setSuccess("");
    setActionLoading(reportCardId);

    try {
      await action(reportCardId);
      setSuccess(successMessage);
      await loadReportCards();

      if (selectedCard?.id === reportCardId) {
        const response = await getReportCardById(reportCardId);
        setSelectedCard(response.reportCard);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading("");
    }
  }

  async function handleGenerate(reportCardId) {
    setError("");
    setSuccess("");
    setActionLoading(reportCardId);

    try {
      const response = await generateReportCard(reportCardId);
      setSuccess(response.message || "Report card generated successfully.");
      await loadReportCards();

      const details = await getReportCardById(reportCardId);
      setSelectedCard(details.reportCard);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading("");
    }
  }

  async function handleAddSubject() {
    if (!selectedCard?.id || !selectedExamResultId) {
      setError("Please select a subject result to add.");
      return;
    }

    setError("");
    setSuccess("");
    setAddingSubject(true);

    try {
      await addReportCardSubject(selectedCard.id, {
        examResultId: selectedExamResultId,
      });

      const response = await getReportCardById(selectedCard.id);
      setSelectedCard(response.reportCard);
      setSelectedExamResultId("");
      setSuccess("Subject result added successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setAddingSubject(false);
    }
  }

  return (
    <main className="report-cards-page">
      <header className="report-cards-header">
        <div>
          <h1>Report Cards</h1>
          <p>Create, review, approve, and publish student report cards.</p>
        </div>

        <div className="report-cards-header-actions">
          <button
            type="button"
            className="rc-button rc-button-secondary"
            onClick={loadReportCards}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            className="rc-button rc-button-primary"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowCreateForm((current) => !current);
              setSelectedCard(null);
            }}
          >
            <Plus size={18} />
            Create Report Card
          </button>
        </div>
      </header>

      {error && (
        <div className="rc-alert rc-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rc-alert rc-alert-success" role="status">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {showCreateForm && (
        <section className="rc-panel">
          <div className="rc-section-heading">
            <BookOpen size={20} />
            <h2>Create a Report Card</h2>
          </div>

          <p className="rc-muted">
            Select the academic year, term, student enrollment, and grading
            scale.
          </p>

          <form className="rc-form-grid" onSubmit={handleCreate}>
            <label>
              Academic Year
              <select
                name="academicYearId"
                value={form.academicYearId}
                onChange={handleFormChange}
                required
                disabled={lookupsLoading}
              >
                <option value="">Select academic year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name || year.academicYearName || year.year || year.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Term
              <select
                name="termId"
                value={form.termId}
                onChange={handleFormChange}
                required
                disabled={!form.academicYearId}
              >
                <option value="">Select term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name || term.termName || term.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Grading Scale
              <select
                name="gradingScaleId"
                value={form.gradingScaleId}
                onChange={handleFormChange}
                required
                disabled={lookupsLoading}
              >
                <option value="">Select grading scale</option>
                {gradingScales.map((scale) => (
                  <option key={scale.id} value={scale.id}>
                    {scale.name || scale.gradingScaleName || scale.id}
                    {scale.isDefault ? " (Default)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Student
              <select
                name="studentEnrollmentId"
                value={form.studentEnrollmentId}
                onChange={handleFormChange}
                required
                disabled={!form.academicYearId || enrollmentsLoading}
              >
                <option value="">
                  {!form.academicYearId
                    ? "Select an academic year first"
                    : enrollmentsLoading
                      ? "Loading students..."
                      : "Select student"}
                </option>

                {enrollments.map((enrollment) => {
                  const studentName = [
                    enrollment.firstName,
                    enrollment.middleName,
                    enrollment.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <option key={enrollment.id} value={enrollment.id}>
                      {studentName || "Unnamed student"}
                      {enrollment.admissionNumber
                        ? ` — ${enrollment.admissionNumber}`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              Report Card Title (optional)
              <input
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="e.g. Term 1 Report Card"
              />
            </label>

            <label className="rc-field-full">
              Overall Remarks (optional)
              <textarea
                name="overallRemarks"
                value={form.overallRemarks}
                onChange={handleFormChange}
                rows={3}
                placeholder="Enter overall remarks"
              />
            </label>

            <div className="rc-form-actions rc-field-full">
              <button
                type="button"
                className="rc-button rc-button-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rc-button rc-button-primary"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle className="rc-spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}
                {saving ? "Creating..." : "Create Report Card"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rc-panel">
        <div className="rc-section-heading">
          <Search size={20} />
          <h2>Find Report Cards</h2>
        </div>

        <div className="rc-filter-grid">
          <label>
            Academic Year
            <select
              name="academicYearId"
              value={filters.academicYearId}
              onChange={handleFilterChange}
              disabled={lookupsLoading}
            >
              <option value="">All academic years</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name || year.academicYearName || year.year || year.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Term
            <select
              name="termId"
              value={filters.termId}
              onChange={handleFilterChange}
              disabled={!filters.academicYearId}
            >
              <option value="">All terms</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name || term.termName || term.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Student ID
            <input
              name="studentId"
              value={filters.studentId}
              onChange={handleFilterChange}
              placeholder="Filter by student ID"
            />
          </label>
        </div>
      </section>

      <section className="rc-panel">
        <div className="rc-section-heading">
          <FileText size={20} />
          <h2>Report Card Records</h2>
          <span className="rc-count">{reportCards.length}</span>
        </div>

        {loading ? (
          <div className="rc-empty-state">
            <LoaderCircle className="rc-spin" size={24} />
            <p>Loading report cards...</p>
          </div>
        ) : reportCards.length === 0 ? (
          <div className="rc-empty-state">
            <FileText size={30} />
            <p>No report cards found for the selected filters.</p>
          </div>
        ) : (
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Academic Year</th>
                  <th>Term</th>
                  <th>Class</th>
                  <th>Grading Scale</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportCards.map((card) => (
                  <tr key={card.id}>
                    <td>{getStudentName(card) || "Student"}</td>
                    <td>{card.admissionNumber || "—"}</td>
                    <td>{card.academicYearName || "—"}</td>
                    <td>{card.termName || "—"}</td>
                    <td>{card.className || card.classId || "—"}</td>
                    <td>{card.gradingScaleName || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="rc-button rc-button-small rc-button-secondary"
                        onClick={() => handleView(card.id)}
                        disabled={actionLoading === card.id}
                      >
                        {actionLoading === card.id ? (
                          <LoaderCircle className="rc-spin" size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedCard && (
        <section className="rc-panel rc-details-panel">
          <div className="rc-section-heading">
            <FileText size={20} />
            <h2>Report Card Details</h2>
            <span
              className={`rc-status rc-status-${String(selectedCard.status || "draft").toLowerCase()}`}
            >
              {selectedCard.status || "DRAFT"}
            </span>
            <button
              type="button"
              className="rc-button rc-button-secondary rc-close-button"
              onClick={() => setSelectedCard(null)}
            >
              Close
            </button>
          </div>

          <div className="rc-details-grid">
            <div>
              <span>Student</span>
              <strong>{getStudentName(selectedCard) || "—"}</strong>
            </div>
            <div>
              <span>Admission Number</span>
              <strong>{selectedCard.admissionNumber || "—"}</strong>
            </div>
            <div>
              <span>Academic Year</span>
              <strong>{selectedCard.academicYearName || "—"}</strong>
            </div>
            <div>
              <span>Term</span>
              <strong>{selectedCard.termName || "—"}</strong>
            </div>
            <div>
              <span>Class</span>
              <strong>{selectedCard.className || "—"}</strong>
            </div>
            <div>
              <span>Grading Scale</span>
              <strong>{selectedCard.gradingScaleName || "—"}</strong>
            </div>
          </div>

          <h3>Subject Results</h3>
          {!selectedCard.subjects?.length ? (
            <p className="rc-muted">
              No subjects have been added to this report card yet.
            </p>
          ) : (
            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Maximum</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCard.subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td>{subject.subjectName || "—"}</td>
                      <td>{subject.marks ?? "—"}</td>
                      <td>{subject.maxMarks ?? "—"}</td>
                      <td>
                        {subject.percentage == null
                          ? "—"
                          : `${Number(subject.percentage).toFixed(1)}%`}
                      </td>
                      <td>{subject.gradeName || "—"}</td>
                      <td>{subject.remarks || subject.gradeRemarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedCard.status === "DRAFT" && (
            <div className="rc-add-subject">
              <h4>Add Subject Result</h4>

              <div className="rc-form-grid">
                <div className="rc-form-field">
                  <label htmlFor="rc-exam">Examination</label>
                  <select
                    id="rc-exam"
                    value={selectedExamId}
                    onChange={(event) => {
                      const examId = event.target.value;
                      setSelectedExamId(examId);
                      loadExamResults(examId, selectedCard.studentId);
                    }}
                    disabled={!exams.length || examResultsLoading}
                  >
                    <option value="">Select an examination</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rc-form-field">
                  <label htmlFor="rc-exam-result">Subject Result</label>
                  <select
                    id="rc-exam-result"
                    value={selectedExamResultId}
                    onChange={(event) =>
                      setSelectedExamResultId(event.target.value)
                    }
                    disabled={!selectedExamId || examResultsLoading}
                  >
                    <option value="">
                      {examResultsLoading
                        ? "Loading results..."
                        : "Select a subject result"}
                    </option>
                    {examResults.map((result) => (
                      <option key={result.id} value={result.id}>
                        {result.subjectName} — {result.marks}/{result.maxMarks}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="rc-button rc-button-primary"
                disabled={!selectedExamResultId || addingSubject}
                onClick={handleAddSubject}
              >
                {addingSubject ? (
                  <>
                    <LoaderCircle size={16} />
                    Adding Subject...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Subject
                  </>
                )}
              </button>

              {selectedExamId && !examResultsLoading && !examResults.length && (
                <p className="rc-muted">
                  No results were found for this student in the selected exam.
                </p>
              )}
            </div>
          )}

          <div className="rc-attendance-summary">
            <h3>Attendance Summary</h3>
            <div className="rc-details-grid">
              <div>
                <span>Total Days</span>
                <strong>{selectedCard.attendance?.totalDays ?? 0}</strong>
              </div>
              <div>
                <span>Present</span>
                <strong>{selectedCard.attendance?.present ?? 0}</strong>
              </div>
              <div>
                <span>Absent</span>
                <strong>{selectedCard.attendance?.absent ?? 0}</strong>
              </div>
              <div>
                <span>Late</span>
                <strong>{selectedCard.attendance?.late ?? 0}</strong>
              </div>
              <div>
                <span>Excused</span>
                <strong>{selectedCard.attendance?.excused ?? 0}</strong>
              </div>
              <div>
                <span>Attendance</span>
                <strong>
                  {Number(
                    selectedCard.attendance?.attendancePercentage ?? 0,
                  ).toFixed(1)}
                  %
                </strong>
              </div>
            </div>
          </div>

          <div className="rc-comments-grid">
            <div>
              <h3>Class Teacher Comment</h3>
              <p>{selectedCard.classTeacherComment || "No comment added."}</p>
            </div>
            <div>
              <h3>Head Teacher Comment</h3>
              <p>{selectedCard.headTeacherComment || "No comment added."}</p>
            </div>
          </div>

          <div className="rc-workflow-actions">
            {selectedCard.status === "DRAFT" && (
              <button
                type="button"
                className="rc-button rc-button-primary"
                disabled={actionLoading === selectedCard.id}
                onClick={() =>
                  handleWorkflowAction(
                    selectedCard.id,
                    approveReportCard,
                    "Report card approved successfully.",
                  )
                }
              >
                Approve Report Card
              </button>
            )}

            {selectedCard.status === "APPROVED" && (
              <button
                type="button"
                className="rc-button rc-button-primary"
                disabled={actionLoading === selectedCard.id}
                onClick={() =>
                  handleWorkflowAction(
                    selectedCard.id,
                    publishReportCard,
                    "Report card published successfully.",
                  )
                }
              >
                Publish Report Card
              </button>
            )}

            {selectedCard.status === "PUBLISHED" && (
              <button
                type="button"
                className="rc-button rc-button-primary"
                disabled={actionLoading === selectedCard.id}
                onClick={() => handleGenerate(selectedCard.id)}
              >
                Generate Report Card
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default ReportCards;
