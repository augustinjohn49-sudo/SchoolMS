import { useCallback, useEffect, useState } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import {
  getAcademicYears,
  getClassesByAcademicYear,
  getStreamsByClass,
} from "../../services/studentEnrollmentService.js";
import { getAttendanceReport } from "../../services/attendanceReportService.js";
import "./AttendanceReports.css";

const initialFilters = {
  academicYearId: "",
  classId: "",
  streamId: "",
  status: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 20,
};

function extractList(response, keys = []) {
  if (Array.isArray(response)) return response;

  const data = response?.data ?? response;

  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = String(value).slice(0, 10);
  const [year, month, day] = date.split("-");

  return year && month && day ? `${day}/${month}/${year}` : date;
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`attendance-report-stat ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}

export default function AttendanceReports() {
  const [filters, setFilters] = useState(initialFilters);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [report, setReport] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setError("");

    try {
      const response = await getAcademicYears();
      const years = extractList(response, ["academicYears"]);
      setAcademicYears(years);

      const activeYear =
        years.find((year) => year.isActive) ||
        years.find((year) => year.status === "ACTIVE");

      if (activeYear) {
        setFilters((current) => ({
          ...current,
          academicYearId: current.academicYearId || activeYear.id,
        }));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    let cancelled = false;

    async function loadClasses() {
      setClasses([]);
      setStreams([]);

      if (!filters.academicYearId) return;

      try {
        const response = await getClassesByAcademicYear(filters.academicYearId);

        if (!cancelled) {
          setClasses(extractList(response, ["classes"]));
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    }

    loadClasses();

    return () => {
      cancelled = true;
    };
  }, [filters.academicYearId]);

  useEffect(() => {
    let cancelled = false;

    async function loadStreams() {
      setStreams([]);

      if (!filters.classId) return;

      try {
        const response = await getStreamsByClass(filters.classId);

        if (!cancelled) {
          setStreams(extractList(response, ["streams"]));
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    }

    loadStreams();

    return () => {
      cancelled = true;
    };
  }, [filters.classId]);

  const fetchReport = useCallback(
    async (page = filters.page) => {
      setLoadingReport(true);
      setError("");
      setNotice("");

      try {
        const params = {
          page,
          limit: filters.limit,
          academicYearId: filters.academicYearId || undefined,
          classId: filters.classId || undefined,
          streamId: filters.streamId || undefined,
          status: filters.status || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        };

        const response = await getAttendanceReport(params);

        if (response?.success === false) {
          throw new Error(
            response.message || "Unable to load attendance report.",
          );
        }

        const data = response?.data ?? response;
        setReport(data);
        setFilters((current) => ({ ...current, page }));
      } catch (err) {
        setReport(null);
        setError(getErrorMessage(err));
      } finally {
        setLoadingReport(false);
      }
    },
    [filters],
  );

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  }

  function handleSearch(event) {
    event.preventDefault();

    if (
      filters.dateFrom &&
      filters.dateTo &&
      filters.dateFrom > filters.dateTo
    ) {
      setError("The start date cannot be later than the end date.");
      return;
    }

    fetchReport(1);
  }

  function handleReset() {
    setFilters((current) => ({
      ...initialFilters,
      academicYearId: current.academicYearId,
    }));
    setReport(null);
    setError("");
    setNotice("Filters cleared. Select Search to load the report.");
  }

  const summary = report?.summary || {};
  const pagination = report?.pagination || {};
  const records = report?.attendance || [];

  return (
    <section className="attendance-reports-page">
      <header className="attendance-reports-header">
        <div>
          <p className="attendance-reports-eyebrow">ATTENDANCE</p>
          <h1>Attendance Reports</h1>
          <p>Review attendance records and summaries for your school.</p>
        </div>

        <button
          type="button"
          className="attendance-report-refresh"
          onClick={() => fetchReport(1)}
          disabled={loadingReport || loadingOptions}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="attendance-report-alert error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="attendance-report-alert notice" role="status">
          {notice}
        </div>
      )}

      <form className="attendance-report-filters" onSubmit={handleSearch}>
        <div className="attendance-report-filter-grid">
          <label>
            Academic year
            <select
              value={filters.academicYearId}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  academicYearId: event.target.value,
                  classId: "",
                  streamId: "",
                  page: 1,
                }));
              }}
              disabled={loadingOptions}
            >
              <option value="">All academic years</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Class
            <select
              value={filters.classId}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  classId: event.target.value,
                  streamId: "",
                  page: 1,
                }));
              }}
            >
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Stream
            <select
              value={filters.streamId}
              onChange={(event) => updateFilter("streamId", event.target.value)}
              disabled={!filters.classId}
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
            Attendance status
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </label>

          <label>
            From date
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>

          <label>
            To date
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>
        </div>

        <div className="attendance-report-filter-actions">
          <button type="submit" disabled={loadingReport}>
            <Search size={17} />
            {loadingReport ? "Loading..." : "Search"}
          </button>

          <button type="button" className="secondary" onClick={handleReset}>
            Clear filters
          </button>
        </div>
      </form>

      <div className="attendance-report-section-heading">
        <div>
          <h2>Attendance summary</h2>
          <p>Totals for the records matching your filters.</p>
        </div>
      </div>

      <div className="attendance-report-stats">
        <StatCard label="Total records" value={summary.totalRecords} />
        <StatCard label="Present" value={summary.present} tone="present" />
        <StatCard label="Absent" value={summary.absent} tone="absent" />
        <StatCard label="Late" value={summary.late} tone="late" />
        <StatCard label="Excused" value={summary.excused} tone="excused" />
        <StatCard
          label="Attendance rate"
          value={`${summary.attendancePercentage ?? 0}%`}
          tone="rate"
        />
      </div>

      <section className="attendance-report-records">
        <div className="attendance-report-section-heading">
          <div>
            <h2>Attendance history</h2>
            <p>{pagination.total ?? 0} matching records</p>
          </div>
          <FileText size={22} />
        </div>

        <div className="attendance-report-table-wrapper">
          <table className="attendance-report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Admission no.</th>
                <th>Student</th>
                <th>Class</th>
                <th>Stream</th>
                <th>Academic year</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>

            <tbody>
              {loadingReport ? (
                <tr>
                  <td colSpan="8" className="attendance-report-empty">
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="8" className="attendance-report-empty">
                    No attendance records to display. Select your filters and
                    click Search.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.admissionNumber || "—"}</td>
                    <td>
                      {[record.firstName, record.middleName, record.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td>{record.className || "—"}</td>
                    <td>{record.streamName || "—"}</td>
                    <td>{record.academicYearName || "—"}</td>
                    <td>
                      <span
                        className={`attendance-report-status ${(record.status || "").toLowerCase()}`}
                      >
                        {record.status || "—"}
                      </span>
                    </td>
                    <td>{record.remarks || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="attendance-report-pagination">
          <span>
            Page {pagination.page ?? filters.page} of{" "}
            {pagination.totalPages ?? 0}
          </span>

          <div>
            <button
              type="button"
              className="secondary"
              disabled={
                loadingReport || !pagination.page || pagination.page <= 1
              }
              onClick={() => fetchReport(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="secondary"
              disabled={
                loadingReport ||
                !pagination.totalPages ||
                pagination.page >= pagination.totalPages
              }
              onClick={() => fetchReport(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </section>
  );
}
