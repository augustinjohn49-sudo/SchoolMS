import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import {
  getAcademicYears,
  getClassesByAcademicYear,
  getStreamsByClass,
  getStudentEnrollments,
} from "../../services/studentEnrollmentService.js";
import {
  getAttendanceByClassAndDate,
  createAttendance,
  updateAttendance,
} from "../../services/attendanceService.js";
import "./Attendance.css";

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "EXCUSED", label: "Excused" },
];

function getStudentName(student) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Attendance() {
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [date, setDate] = useState(getTodayDate());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAcademicYears = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAcademicYears();
      const years = response.data || [];

      setAcademicYears(years);

      const activeYear = years.find((year) => year.status === "ACTIVE");

      if (activeYear) {
        setAcademicYearId((current) => current || activeYear.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load academic years.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  useEffect(() => {
    async function loadClasses() {
      setClasses([]);
      setClassId("");
      setStreams([]);
      setStreamId("");
      setStudents([]);
      setAttendance({});
      setMessage("");

      if (!academicYearId) return;

      try {
        setError("");
        const response = await getClassesByAcademicYear(academicYearId);
        setClasses(response.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load classes.");
      }
    }

    loadClasses();
  }, [academicYearId]);

  useEffect(() => {
    async function loadStreams() {
      setStreams([]);
      setStreamId("");

      if (!classId) return;

      try {
        const response = await getStreamsByClass(classId);
        setStreams(response.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load streams.");
      }
    }

    loadStreams();
  }, [classId]);

  const loadRegister = useCallback(async () => {
    if (!academicYearId || !classId || !date) {
      setStudents([]);
      setAttendance({});
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const firstPage = await getStudentEnrollments({
        academicYearId,
        classId,
        streamId,
        status: "ACTIVE",
        page: 1,
        limit: 100,
      });

      const roster = [...(firstPage.data || [])];
      const totalPages = firstPage.pagination?.totalPages || 1;

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await getStudentEnrollments({
          academicYearId,
          classId,
          streamId,
          status: "ACTIVE",
          page,
          limit: 100,
        });

        roster.push(...(response.data || []));
      }

      const attendanceResponse = await getAttendanceByClassAndDate(
        classId,
        date,
      );

      const existingRecords = attendanceResponse.data?.attendance || [];
      const existingByStudent = new Map(
        existingRecords.map((record) => [record.studentId, record]),
      );

      const nextAttendance = {};

      roster.forEach((enrollment) => {
        const existing = existingByStudent.get(enrollment.studentId);

        nextAttendance[enrollment.studentId] = {
          attendanceId: existing?.id || null,
          status: existing?.status || "PRESENT",
          remarks: existing?.remarks || "",
          originalStatus: existing?.status || null,
          originalRemarks: existing?.remarks || "",
        };
      });

      setStudents(roster);
      setAttendance(nextAttendance);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load the attendance register.",
      );
      setStudents([]);
      setAttendance({});
    } finally {
      setLoading(false);
    }
  }, [academicYearId, classId, streamId, date]);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  function handleStatusChange(studentId, status) {
    setAttendance((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        status,
      },
    }));
  }

  function handleRemarksChange(studentId, remarks) {
    setAttendance((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        remarks,
      },
    }));
  }

  async function handleSaveAttendance() {
    if (!academicYearId || !classId || !date || students.length === 0) {
      setError(
        "Select an academic year, class, and date with enrolled students.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const failures = [];

      for (const student of students) {
        const record = attendance[student.studentId];

        if (!record) continue;

        const payload = {
          studentId: student.studentId,
          academicYearId,
          classId,
          date,
          status: record.status,
          remarks: record.remarks.trim() || null,
        };

        try {
          if (record.attendanceId) {
            if (
              record.status !== record.originalStatus ||
              record.remarks !== record.originalRemarks
            ) {
              await updateAttendance(record.attendanceId, {
                status: record.status,
                remarks: payload.remarks,
              });
            }
          } else {
            await createAttendance(payload);
          }
        } catch (err) {
          failures.push({
            name: getStudentName(student) || student.admissionNumber,
            message:
              err.response?.data?.message || "Could not save this record.",
          });
        }
      }

      if (failures.length > 0) {
        setError(
          `${failures.length} attendance record(s) could not be saved. Refresh the register and retry. First error: ${failures[0].name}: ${failures[0].message}`,
        );
      } else {
        setMessage("Attendance saved successfully.");
        await loadRegister();
      }
    } finally {
      setSaving(false);
    }
  }

  const counts = students.reduce(
    (result, student) => {
      const status = attendance[student.studentId]?.status;
      if (status) result[status] += 1;
      return result;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
  );

  return (
    <div className="attendance-page">
      <header className="attendance-header">
        <div>
          <h1>Attendance Management</h1>
          <p>Record and manage daily student attendance.</p>
        </div>

        <button
          type="button"
          className="attendance-refresh-button"
          onClick={loadRegister}
          disabled={loading || saving}
        >
          <RefreshCw size={16} />
          Refresh Register
        </button>
      </header>

      {error && <div className="attendance-alert error">{error}</div>}
      {message && <div className="attendance-alert success">{message}</div>}

      <section className="attendance-filters">
        <label>
          Academic Year
          <select
            value={academicYearId}
            onChange={(event) => setAcademicYearId(event.target.value)}
          >
            <option value="">Select academic year</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
                {year.status === "ACTIVE" ? " (Active)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          Class
          <select
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            disabled={!academicYearId}
          >
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Stream (optional)
          <select
            value={streamId}
            onChange={(event) => setStreamId(event.target.value)}
            disabled={!classId}
          >
            <option value="">All streams</option>
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Attendance Date
          <span className="attendance-date-input">
            <CalendarDays size={16} />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </span>
        </label>
      </section>

      <section className="attendance-register">
        <div className="attendance-register-header">
          <div>
            <h2>Class Register</h2>
            <p>{students.length} enrolled student(s)</p>
          </div>
          <button
            type="button"
            className="attendance-save-button"
            onClick={handleSaveAttendance}
            disabled={loading || saving || students.length === 0}
          >
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>

        <div className="attendance-summary">
          {STATUS_OPTIONS.map((option) => (
            <div key={option.value} className="attendance-summary-item">
              <span>{option.label}</span>
              <strong>{counts[option.value]}</strong>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="attendance-empty">Loading attendance register...</div>
        ) : !classId ? (
          <div className="attendance-empty">
            Choose an academic year and class to continue.
          </div>
        ) : students.length === 0 ? (
          <div className="attendance-empty">
            No active student enrollments were found for this selection.
          </div>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Admission No.</th>
                  <th>Student Name</th>
                  <th>Stream</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const record = attendance[student.studentId];

                  return (
                    <tr key={student.studentId}>
                      <td>{index + 1}</td>
                      <td>{student.admissionNumber || "—"}</td>
                      <td>{getStudentName(student) || "Unnamed student"}</td>
                      <td>{student.streamName || "—"}</td>
                      <td>
                        <select
                          aria-label={`Attendance status for ${getStudentName(student)}`}
                          value={record?.status || "PRESENT"}
                          onChange={(event) =>
                            handleStatusChange(
                              student.studentId,
                              event.target.value,
                            )
                          }
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={record?.remarks || ""}
                          placeholder="Optional remarks"
                          onChange={(event) =>
                            handleRemarksChange(
                              student.studentId,
                              event.target.value,
                            )
                          }
                        />
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
  );
}
