import { useState } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { getLowAttendanceAlerts } from "../../services/attendanceService.js";
import "./LowAttendanceAlerts.css";

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Unable to load low-attendance alerts. Please try again."
  );
}

function formatStudentName(student) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}

export default function LowAttendanceAlerts() {
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    threshold: 75,
    academicYearId: "",
    classId: "",
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function loadAlerts(event) {
    event?.preventDefault();

    if (!filters.dateFrom || !filters.dateTo) {
      setError("Please select both a start date and an end date.");
      return;
    }

    if (filters.dateFrom > filters.dateTo) {
      setError("The start date cannot be later than the end date.");
      return;
    }

    const threshold = Number(filters.threshold);

    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
      setError("The attendance threshold must be between 0 and 100.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getLowAttendanceAlerts({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        threshold,
        academicYearId: filters.academicYearId || undefined,
        classId: filters.classId || undefined,
      });

      if (response?.success === false) {
        throw new Error(response.message || "Unable to load alerts.");
      }

      setData(response?.data ?? response);
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const alerts = data?.alerts ?? [];
  const summary = data?.summary ?? {};

  return (
    <section className="low-attendance-page">
      <header className="low-attendance-header">
        <div>
          <p className="low-attendance-eyebrow">ATTENDANCE</p>
          <h1>Low Attendance Alerts</h1>
          <p>
            Identify students whose recorded attendance falls below your
            school's threshold.
          </p>
        </div>

        <button
          type="button"
          className="low-attendance-refresh"
          onClick={() => loadAlerts()}
          disabled={loading || !filters.dateFrom || !filters.dateTo}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="low-attendance-message error" role="alert">
          {error}
        </div>
      )}

      <form className="low-attendance-filters" onSubmit={loadAlerts}>
        <div className="low-attendance-filter-grid">
          <label>
            From date
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
              required
            />
          </label>

          <label>
            To date
            <input
              type="date"
              min={filters.dateFrom || undefined}
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
              required
            />
          </label>

          <label>
            Attendance threshold (%)
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={filters.threshold}
              onChange={(event) =>
                updateFilter("threshold", event.target.value)
              }
              required
            />
          </label>

          <label>
            Academic year ID (optional)
            <input
              type="text"
              value={filters.academicYearId}
              onChange={(event) =>
                updateFilter("academicYearId", event.target.value)
              }
              placeholder="Enter academic year ID"
            />
          </label>

          <label>
            Class ID (optional)
            <input
              type="text"
              value={filters.classId}
              onChange={(event) => updateFilter("classId", event.target.value)}
              placeholder="Enter class ID"
            />
          </label>
        </div>

        <div className="low-attendance-filter-actions">
          <button type="submit" disabled={loading}>
            <Search size={17} />
            {loading ? "Searching..." : "Search alerts"}
          </button>
        </div>
      </form>

      <section className="low-attendance-summary">
        <div className="low-attendance-stat">
          <span>Students requiring attention</span>
          <strong>{summary.alertCount ?? 0}</strong>
        </div>
        <div className="low-attendance-stat">
          <span>Threshold</span>
          <strong>{data?.filters?.threshold ?? filters.threshold}%</strong>
        </div>
      </section>

      <section className="low-attendance-records">
        <div className="low-attendance-section-heading">
          <div>
            <h2>Students below threshold</h2>
            <p>
              {alerts.length} student
              {alerts.length === 1 ? "" : "s"} found
            </p>
          </div>
          <AlertTriangle size={22} />
        </div>

        <div className="low-attendance-table-wrapper">
          <table className="low-attendance-table">
            <thead>
              <tr>
                <th>Admission no.</th>
                <th>Student</th>
                <th>Class</th>
                <th>Days recorded</th>
                <th>Days attended</th>
                <th>Days absent</th>
                <th>Attendance</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="low-attendance-empty">
                    Loading alerts...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="low-attendance-empty">
                    {data
                      ? "No students are below the selected attendance threshold."
                      : "Select a date range and click Search alerts."}
                  </td>
                </tr>
              ) : (
                alerts.map((student) => (
                  <tr key={`${student.studentId}-${student.academicYearId}`}>
                    <td>{student.admissionNumber || "—"}</td>
                    <td>{formatStudentName(student) || "—"}</td>
                    <td>{student.className || "—"}</td>
                    <td>{student.recordedDays}</td>
                    <td>{student.attendedDays}</td>
                    <td>{student.absentDays}</td>
                    <td>
                      <span className="low-attendance-percentage">
                        {student.attendancePercentage}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
