import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function WarehousesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.warehouses.view);
  return <>{children}</>;
}
