import { UsersAdminPanel } from "@/components/admin/users-admin-panel";
import { prisma } from "@/server/db/prisma";

export default async function AdminUsersPage() {
  const [users, warehouses, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: "asc" },
      include: {
        roleMappings: {
          include: {
            role: true,
            warehouse: { select: { id: true, code: true, name: true } },
          },
        },
      },
    }),
    prisma.warehouse.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-gray-100">User management</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
          Assign roles per warehouse. Users must sign in with Supabase using the same email; create the Supabase user
          in the Supabase dashboard or via the Admin API.
        </p>
      </div>
      <UsersAdminPanel
        users={JSON.parse(JSON.stringify(users))}
        warehouses={warehouses}
        roles={roles.map((r) => ({ id: r.id, name: r.name, description: r.description }))}
      />
    </div>
  );
}
