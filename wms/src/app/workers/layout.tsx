import { WorkerSubNav } from "@/components/workers/worker-subnav";
import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function WorkersLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.workers.manage);
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Labor &amp; scheduling</h1>
        <p className="text-sm text-gray-500">
          Worker directory, assignments, shifts, and time tracking.
        </p>
      </div>
      <WorkerSubNav />
      {children}
    </div>
  );
}
