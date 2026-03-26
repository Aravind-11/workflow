import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TaskSubNav } from "@/components/tasks/task-subnav";

export default async function TasksLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.tasks.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tasks"
        description="Floor work queue — create, assign, and track warehouse tasks."
      />
      <TaskSubNav />
      {children}
    </div>
  );
}
