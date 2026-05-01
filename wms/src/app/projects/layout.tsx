import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(P.projects.view);
  return <>{children}</>;
}
