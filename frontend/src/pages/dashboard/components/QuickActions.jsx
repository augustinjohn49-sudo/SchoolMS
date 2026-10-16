import { Link } from "react-router-dom";

export default function QuickActions({ actions }) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <div>
          <span className="dashboard-eyebrow">WORKSPACE</span>
          <h2>Quick Actions</h2>
          <p>Access the tools you need to manage your school efficiently.</p>
        </div>
      </div>

      <div className="dashboard-quick-actions">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              to={action.href}
              className="dashboard-action-card"
              key={action.title}
            >
              <div className={`dashboard-action-icon ${action.color || ""}`}>
                <Icon size={21} strokeWidth={1.8} />
              </div>

              <div className="dashboard-action-content">
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>

              <span className="dashboard-action-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
