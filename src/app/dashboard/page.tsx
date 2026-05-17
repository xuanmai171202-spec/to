import StatsDashboard from '@/components/StatsDashboard';
import ProjectsSection from '@/components/ProjectsSection';
import TaskList from '@/components/TaskList';

export default function Dashboard() {
  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <section>
        <div className="flex flex-col mb-6">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Workspace Overview</h1>
          <p className="text-muted-foreground text-sm">Monitor your projects and team productivity in real-time.</p>
        </div>
        <StatsDashboard minimal />
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Active Projects</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProjectsSection />
        </div>
      </section>

      <section>
        <TaskList
          title="Recent Assignments"
          listId="recent_assignments"
          placeholder="New quick task..."
        />
      </section>
    </div>
  );
}
