export default function DashboardStats({ stats }) {
  return (
    <section className="dashboard-stats">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <article className="dashboard-stat-card" key={stat.title}>
            <div className={`dashboard-stat-icon ${stat.color || ""}`}>
              <Icon size={22} strokeWidth={1.8} />
            </div>

            <div className="dashboard-stat-content">
              <span className="dashboard-stat-title">{stat.title}</span>

              <strong className="dashboard-stat-value">{stat.value}</strong>

              <span className="dashboard-stat-description">
                {stat.description}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
