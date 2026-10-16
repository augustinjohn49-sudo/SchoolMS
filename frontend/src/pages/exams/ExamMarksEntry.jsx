import { useCallback, useEffect, useState } from "react";
import { BookOpen, ClipboardList, RefreshCw, Save, Search } from "lucide-react";
import {
  createExamResult,
  getExamResults,
  getExamSubjects,
  getExams,
  updateExamResult,
} from "../../services/examService.js";
import {
  getAcademicYears,
  getStudentEnrollments,
} from "../../services/studentEnrollmentService.js";
import "./ExamMarksEntry.css";

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getList(response, key = "data") {
  const value = response?.[key];
  return Array.isArray(value) ? value : [];
}

function getStudentName(student) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}

export default function ExamMarksEntry() {
  const [academicYears, setAcademicYears] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [existingResults, setExistingResults] = useState([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examSubjectId, setExamSubjectId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedSubject = subjects.find(
    (subject) => subject.id === examSubjectId,
  );

  const loadAcademicYears = useCallback(async () => {
    try {
      const response = await getAcademicYears();
      setAcademicYears(getList(response));
    } catch (requestError) {
      setError(
        `Unable to load academic years: ${getErrorMessage(requestError)}`,
      );
    }
  }, []);

  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  async function handleAcademicYearChange(value) {
    setAcademicYearId(value);
    setExamId("");
    setExamSubjectId("");
    setExams([]);
    setSubjects([]);
    setStudents([]);
    setExistingResults([]);
    setMarks({});
    setRemarks({});
    setError("");
    setSuccess("");

    if (!value) return;

    setLoading(true);
    try {
      const response = await getExams({ academicYearId: value });
      setExams(getList(response));
    } catch (requestError) {
      setError(`Unable to load examinations: ${getErrorMessage(requestError)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleExamChange(value) {
    setExamId(value);
    setExamSubjectId("");
    setSubjects([]);
    setStudents([]);
    setExistingResults([]);
    setMarks({});
    setRemarks({});
    setError("");
    setSuccess("");

    if (!value) return;

    setLoading(true);
    try {
      const response = await getExamSubjects(value);
      setSubjects(getList(response?.data, "subjects"));
    } catch (requestError) {
      setError(`Unable to load subjects: ${getErrorMessage(requestError)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubjectChange(value) {
    setExamSubjectId(value);
    setStudents([]);
    setExistingResults([]);
    setMarks({});
    setRemarks({});
    setError("");
    setSuccess("");

    const subject = subjects.find((item) => item.id === value);

    if (!value || !subject) {
      return;
    }

    setLoading(true);

    try {
      const [enrollmentResponse, resultsResponse] = await Promise.all([
        getStudentEnrollments({
          academicYearId,
          classId: subject.classId,
          status: "ACTIVE",
          page: 1,
          limit: 100,
        }),
        getExamResults(examId),
      ]);

      const enrollmentList = getList(enrollmentResponse);
      const resultList = getList(resultsResponse, "results");

      setStudents(enrollmentList);
      setExistingResults(resultList);

      const resultByStudent = new Map(
        resultList
          .filter((result) => result.examSubjectId === value)
          .map((result) => [result.studentId, result]),
      );

      const initialMarks = {};
      const initialRemarks = {};

      enrollmentList.forEach((student) => {
        const result = resultByStudent.get(student.studentId);

        initialMarks[student.studentId] =
          result?.marks === null || result?.marks === undefined
            ? ""
            : String(result.marks);

        initialRemarks[student.studentId] = result?.remarks || "";
      });

      setMarks(initialMarks);
      setRemarks(initialRemarks);
    } catch (requestError) {
      setError(
        `Unable to load student marks: ${getErrorMessage(requestError)}`,
      );
    } finally {
      setLoading(false);
    }
  }

  function handleMarkChange(studentId, value) {
    setMarks((current) => ({ ...current, [studentId]: value }));
    setSuccess("");
  }

  function handleRemarkChange(studentId, value) {
    setRemarks((current) => ({ ...current, [studentId]: value }));
    setSuccess("");
  }

  async function handleSave() {
    setError("");
    setSuccess("");

    const maximum = Number(maxMarks);

    if (!examId || !examSubjectId || !selectedSubject) {
      setError("Select an examination and subject first.");
      return;
    }

    if (!Number.isFinite(maximum) || maximum <= 0) {
      setError("Maximum marks must be a number greater than zero.");
      return;
    }

    if (students.length === 0) {
      setError("There are no students to save marks for.");
      return;
    }

    const resultMap = new Map(
      existingResults
        .filter((result) => result.examSubjectId === examSubjectId)
        .map((result) => [result.studentId, result]),
    );

    const pendingResults = [];

    for (const student of students) {
      const rawMark = marks[student.studentId];

      // Leave blank marks unchanged; do not create a result for an empty field.
      if (rawMark === "" || rawMark === undefined || rawMark === null) {
        continue;
      }

      const mark = Number(rawMark);

      if (!Number.isFinite(mark) || mark < 0 || mark > maximum) {
        setError(
          `Enter valid marks between 0 and ${maximum} for ${getStudentName(student)}.`,
        );
        return;
      }

      pendingResults.push({
        student,
        mark,
        existingResult: resultMap.get(student.studentId),
      });
    }

    if (pendingResults.length === 0) {
      setError("Enter marks for at least one student before saving.");
      return;
    }

    setSaving(true);

    try {
      // Save sequentially so each failure can be reported clearly.
      let savedCount = 0;

      for (const item of pendingResults) {
        const payload = {
          studentId: item.student.studentId,
          examSubjectId,
          marks: item.mark,
          maxMarks: maximum,
          remarks: remarks[item.student.studentId]?.trim() || null,
        };

        if (item.existingResult) {
          await updateExamResult(examId, item.existingResult.id, payload);
        } else {
          await createExamResult(examId, payload);
        }

        savedCount += 1;
      }

      const response = await getExamResults(examId);
      const refreshedResults = getList(response, "results");
      setExistingResults(refreshedResults);

      setSuccess(`Successfully saved marks for ${savedCount} student(s).`);
    } catch (requestError) {
      setError(
        `Some marks may have been saved before the error occurred. ${getErrorMessage(requestError)}`,
      );

      // Refresh saved results so the page reflects any successful requests.
      try {
        const response = await getExamResults(examId);
        setExistingResults(getList(response, "results"));
      } catch {
        // Keep the original save error visible.
      }
    } finally {
      setSaving(false);
    }
  }

  const enteredCount = students.filter(
    (student) =>
      marks[student.studentId] !== "" && marks[student.studentId] !== undefined,
  ).length;

  return (
    <main className="exam-marks-page">
      <header className="exam-marks-header">
        <div>
          <span className="exam-marks-eyebrow">ACADEMIC MANAGEMENT</span>
          <h1>Exam Marks Entry</h1>
          <p>Enter, review, and update students' examination marks.</p>
        </div>

        <div className="exam-marks-header-icon">
          <ClipboardList size={28} />
        </div>
      </header>

      {error && (
        <div className="exam-marks-alert exam-marks-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div
          className="exam-marks-alert exam-marks-alert-success"
          role="status"
        >
          {success}
        </div>
      )}

      <section className="exam-marks-panel">
        <div className="exam-marks-section-title">
          <BookOpen size={20} />
          <div>
            <h2>Select Examination</h2>
            <p>Choose an academic year, examination, and subject.</p>
          </div>
        </div>

        <div className="exam-marks-filters">
          <label>
            Academic Year
            <select
              value={academicYearId}
              onChange={(event) => handleAcademicYearChange(event.target.value)}
            >
              <option value="">Select academic year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Examination
            <select
              value={examId}
              onChange={(event) => handleExamChange(event.target.value)}
              disabled={!academicYearId || loading}
            >
              <option value="">Select examination</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Subject
            <select
              value={examSubjectId}
              onChange={(event) => handleSubjectChange(event.target.value)}
              disabled={!examId || loading}
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.subjectName} — {subject.className}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedSubject && (
          <div className="exam-marks-subject-info">
            <div>
              <span>Selected subject</span>
              <strong>{selectedSubject.subjectName}</strong>
            </div>
            <div>
              <span>Class</span>
              <strong>{selectedSubject.className}</strong>
            </div>
            <label>
              Maximum marks for all students
              <input
                type="number"
                min="1"
                step="any"
                value={maxMarks}
                onChange={(event) => setMaxMarks(event.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      <section className="exam-marks-panel">
        <div className="exam-marks-table-header">
          <div className="exam-marks-section-title">
            <Search size={20} />
            <div>
              <h2>Student Marks</h2>
              <p>
                {students.length} student(s) loaded · {enteredCount} with marks
                entered
              </p>
            </div>
          </div>

          {examSubjectId && (
            <button
              type="button"
              className="exam-marks-button exam-marks-button-primary"
              onClick={handleSave}
              disabled={saving || loading || students.length === 0}
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Marks"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="exam-marks-empty">
            <RefreshCw className="exam-marks-spin" size={24} />
            <p>Loading examination data...</p>
          </div>
        ) : !examSubjectId ? (
          <div className="exam-marks-empty">
            <ClipboardList size={30} />
            <p>Select an examination subject to load its students.</p>
          </div>
        ) : students.length === 0 ? (
          <div className="exam-marks-empty">
            <p>No active student enrollments were found for this class.</p>
          </div>
        ) : (
          <div className="exam-marks-table-wrap">
            <table className="exam-marks-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Admission No.</th>
                  <th>Student Name</th>
                  <th>Marks / {Number(maxMarks) > 0 ? maxMarks : "—"}</th>
                  <th>Remarks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const existingResult = existingResults.find(
                    (result) =>
                      result.studentId === student.studentId &&
                      result.examSubjectId === examSubjectId,
                  );

                  return (
                    <tr key={student.studentId}>
                      <td>{index + 1}</td>
                      <td>{student.admissionNumber || "—"}</td>
                      <td className="exam-marks-student-name">
                        {getStudentName(student) || "Unnamed student"}
                      </td>
                      <td>
                        <input
                          className="exam-marks-number-input"
                          type="number"
                          min="0"
                          max={Number(maxMarks) > 0 ? maxMarks : undefined}
                          step="any"
                          value={marks[student.studentId] ?? ""}
                          onChange={(event) =>
                            handleMarkChange(
                              student.studentId,
                              event.target.value,
                            )
                          }
                          aria-label={`Marks for ${getStudentName(student)}`}
                        />
                      </td>
                      <td>
                        <input
                          className="exam-marks-remarks-input"
                          type="text"
                          maxLength="500"
                          value={remarks[student.studentId] ?? ""}
                          onChange={(event) =>
                            handleRemarkChange(
                              student.studentId,
                              event.target.value,
                            )
                          }
                          placeholder="Optional remarks"
                          aria-label={`Remarks for ${getStudentName(student)}`}
                        />
                      </td>
                      <td>
                        <span
                          className={`exam-marks-status ${
                            existingResult ? "is-saved" : "is-new"
                          }`}
                        >
                          {existingResult ? "Saved" : "New"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {examSubjectId && students.length > 0 && (
          <div className="exam-marks-footer">
            <span>
              Blank marks are skipped. Existing results are updated when saved.
            </span>
            <button
              type="button"
              className="exam-marks-button exam-marks-button-primary"
              onClick={handleSave}
              disabled={saving || loading}
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Marks"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
