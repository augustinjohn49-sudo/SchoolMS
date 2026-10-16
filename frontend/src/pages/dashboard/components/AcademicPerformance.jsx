import { Award, TrendingUp, Users, FileText } from "lucide-react";

function formatPercentage(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export default function AcademicPerformance({ data }) {
  const hasReportCards = data.totalReportCards > 0;
  const gradeDistribution = data.gradeDistribution ?? [];

  const metrics = [
    {
      label: "Average performance",
      value: formatPercentage(data.averagePercentage),
      icon: TrendingUp,
    },
    {
      label: "Highest performance",
      value: formatPercentage(data.highestPercentage),
      icon: Award,
    },
    {
      label: "Students with results",
      value: data.studentsWithResults,
      icon: Users,
    },
    {
      label: "Published report cards",
      value: data.totalReportCards,
      icon: FileText,
    },
  ];

  return (
    <section className="dashboard-section academic-performance">
      <div className="dashboard-section-header">
        <div>
          <span className="dashboard-eyebrow">ACADEMIC RESULTS</span>
          <h2>Academic Performance</h2>
          <p>
            A summary of published report cards and their overall performance.
          </p>
        </div>
      </div>

      {!hasReportCards ? (
        <div className="academic-empty-state">
          <FileText size={28} />
          <h3>No published report cards yet</h3>
          <p>
            Academic performance statistics will appear here when report cards
            have been published.
          </p>
        </div>
      ) : (
        <>
          <div className="academic-metrics">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <article className="academic-metric-card" key={metric.label}>
                  <div className="academic-metric-icon">
                    <Icon size={20} />
                  </div>

                  <div>
                    <p>{metric.label}</p>
                    <strong>{metric.value}</strong>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="academic-grade-card">
            <div className="academic-grade-header">
              <div>
                <h3>Grade distribution</h3>
                <p>Published report cards grouped by configured grade.</p>
              </div>
            </div>

            {gradeDistribution.length === 0 ? (
              <p className="academic-no-grades">
                No grade distribution is available for these report cards. Check
                that the report cards have grading scales with matching
                percentage ranges.
              </p>
            ) : (
              <div className="academic-grade-list">
                {gradeDistribution.map((grade) => {
                  const count = Number(grade.studentCount ?? 0);
                  const percentage =
                    data.totalReportCards > 0
                      ? Math.min((count / data.totalReportCards) * 100, 100)
                      : 0;

                  return (
                    <div className="academic-grade-row" key={grade.gradeName}>
                      <div className="academic-grade-label">
                        <span>{grade.gradeName}</span>
                        <strong>{count}</strong>
                      </div>

                      <div
                        className="academic-grade-track"
                        role="progressbar"
                        aria-label={`${grade.gradeName} grade distribution`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Number(percentage.toFixed(1))}
                      >
                        <div
                          className="academic-grade-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
