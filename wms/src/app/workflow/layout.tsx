import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function WorkflowLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.workflow.manage);
  return <>{children}</>;
}
