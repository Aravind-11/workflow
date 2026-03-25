import { WorkerSubNav } from "@/components/workers/worker-subnav";
import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function WorkersLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.workers.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Labor & Scheduling"
        description="Worker directory, assignments, shifts, and time tracking."
      />
      <WorkerSubNav />
      {children}
    </div>
  );
}
