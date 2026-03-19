import { WmsDashboard } from "@/components/dashboard/wms-dashboard";
import { getDashboardSnapshot } from "@/features/dashboard/service";
import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function DashboardPage() {
  await requirePermission(P.dashboard.view);
  const data = await getDashboardSnapshot();
  return <WmsDashboard data={data} />;
}
