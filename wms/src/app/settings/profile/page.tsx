import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/server/db/prisma";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProfileForm } from "@/components/profile/profile-form";
import { NavCustomizer } from "@/components/profile/nav-customizer";
import { filterNav } from "@/lib/nav/config";

export default async function ProfilePage() {
  const ctx = await requireAuth();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    include: {
      roleMappings: {
        include: {
          role: { select: { name: true } },
          warehouse: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <div className="space-y-8">
      <SectionHeader
        title="My Profile"
        description="Update your display name, customize your sidebar, and see your role assignments."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Profile form */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Account details</h2>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-navy-border dark:bg-navy dark:text-gray-400">
              {user.email}
            </p>
          </div>

          <ProfileForm
            initialFullName={user.fullName}
            initialNickname={user.nickname}
          />
        </section>

        {/* Role assignments */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Role assignments</h2>

          {user.roleMappings.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No roles assigned yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-navy-border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {user.roleMappings.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100 dark:border-navy-border">
                      <td className="px-4 py-3 font-medium capitalize text-gray-800 dark:text-gray-200">
                        {m.role.name.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        <span className="font-mono text-xs">{m.warehouse.code}</span>
                        <span className="ml-2">{m.warehouse.name}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Sidebar customization */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Customize sidebar</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Toggle which sections appear in your sidebar. Hidden sections are still accessible via URL.
        </p>
        <NavCustomizer
          allItems={filterNav(ctx.permissions).map((n) => ({ href: n.href, label: n.label }))}
          initialHidden={user.hiddenNavPaths}
        />
      </section>
    </div>
  );
}
