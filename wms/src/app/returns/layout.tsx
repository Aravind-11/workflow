import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function ReturnsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.returns.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Returns & Exceptions"
        description="RMAs, dispositions, and inventory impact — fully audited."
      />
      {children}
    </div>
  );
}
