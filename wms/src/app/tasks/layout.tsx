import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function TasksLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.tasks.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tasks"
        description="Floor work queue — create, assign, and track warehouse tasks."
      />
      {children}
    </div>
  );
}
