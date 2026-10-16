import {
  School,
  UserPlus,
  BookOpen,
  CreditCard,
  ClipboardCheck,
  FileText,
} from "lucide-react";

const overviewItems = [
  {
    title: "School Management",
    description: "Manage your school's core information.",
    icon: School,
    color: "overview-blue",
  },
  {
    title: "Students & Staff",
    description: "Maintain student and staff records.",
    icon: UserPlus,
    color: "overview-green",
  },
  {
    title: "Academic Management",
    description: "Organize subjects and examinations.",
    icon: BookOpen,
    color: "overview-purple",
  },
  {
    title: "Attendance Tracking",
    description: "Monitor daily student attendance.",
    icon: ClipboardCheck,
    color: "overview-orange",
  },
  {
    title: "Report Cards",
    description: "Access academic reporting tools.",
    icon: FileText,
    color: "overview-blue",
  },
  {
    title: "Finance Management",
    description: "Access school finance features.",
    icon: CreditCard,
    color: "overview-green",
  },
];

export default function SystemOverview() {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <div>
          <span className="dashboard-eyebrow">YOUR SCHOOL</span>
          <h2>System Overview</h2>
          <p>An overview of the main areas of your school management system.</p>
        </div>
      </div>

      <div className="dashboard-overview">
        {overviewItems.map((item) => {
          const Icon = item.icon;

          return (
            <article className="dashboard-overview-card" key={item.title}>
              <div className={`dashboard-overview-icon ${item.color}`}>
                <Icon size={21} strokeWidth={1.8} />
              </div>

              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
