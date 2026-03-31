import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function TasksLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.tasks.manage);
  return <>{children}</>;
}
