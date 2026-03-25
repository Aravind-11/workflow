import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.admin.users);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Administration"
        description="User management, roles, and system settings."
      />
      {children}
    </div>
  );
}
