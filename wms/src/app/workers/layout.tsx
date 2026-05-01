import { WorkerSubNav } from "@/components/workers/worker-subnav";
import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function WorkersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(P.workers.manage);
  return (
    <div className="space-y-6">
      <WorkerSubNav />
      {children}
    </div>
  );
}
