import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { TaskSubNav } from "@/components/tasks/task-subnav";

export default async function TasksLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.tasks.manage);
  return (
    <div className="space-y-4">
      <TaskSubNav />
      {children}
    </div>
  );
}
