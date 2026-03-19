"use client";

import { UserStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  assignUserRoleAction,
  createUserAction,
  removeUserRoleAction,
  setUserStatusAction,
} from "@/features/admin/users-actions";

type Wh = { id: string; code: string; name: string };
type RoleRow = { id: string; name: string; description: string | null };
type UserRow = {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  roleMappings: Array<{
    id: string;
    role: { name: string };
    warehouse: { id: string; code: string; name: string };
  }>;
};

export function UsersAdminPanel({
  users,
  warehouses,
  roles,
}: {
  users: UserRow[];
  warehouses: Wh[];
  roles: RoleRow[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ email: "", fullName: "" });
  const [assignForm, setAssignForm] = useState({
    userId: users[0]?.id ?? "",
    warehouseId: warehouses[0]?.id ?? "",
    roleName: roles[0]?.name ?? "",
  });

  async function createUser() {
    setErr(null);
    setMsg(null);
    const r = await createUserAction(createForm);
    if (!r.ok) setErr(r.error);
    else {
      setMsg("User created. Add Supabase auth for this email to allow login.");
      setCreateForm({ email: "", fullName: "" });
      router.refresh();
    }
  }

  async function assign() {
    setErr(null);
    setMsg(null);
    const r = await assignUserRoleAction(assignForm);
    if (!r.ok) setErr(r.error);
    else {
      setMsg("Role assigned.");
      router.refresh();
    }
  }

  async function removeAssignment(id: string) {
    setErr(null);
    setMsg(null);
    const r = await removeUserRoleAction({ assignmentId: id });
    if (!r.ok) setErr(r.error);
    else {
      setMsg("Assignment removed.");
      router.refresh();
    }
  }

  async function setStatus(userId: string, status: UserStatus) {
    setErr(null);
    setMsg(null);
    const r = await setUserStatusAction({ userId, status });
    if (!r.ok) setErr(r.error);
    else {
      setMsg("Status updated.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      {(msg || err) && (
        <div className="text-sm">
          {msg ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-900">{msg}</p> : null}
          {err ? <p className="rounded-md bg-red-50 px-3 py-2 text-red-900">{err}</p> : null}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Create user (database)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Creates the profile only — mirror the email in Supabase Authentication for login.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            className="min-h-10 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"
            placeholder="Email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="min-h-10 w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"
            placeholder="Full name"
            value={createForm.fullName}
            onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
          />
          <Button type="button" onClick={createUser} disabled={!createForm.email || !createForm.fullName}>
            Create
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Assign role</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-0 flex-1 text-xs text-slate-600 sm:max-w-[220px]">
            User
            <select
              className="mt-1 block w-full min-h-10 rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={assignForm.userId}
              onChange={(e) => setAssignForm((f) => ({ ...f, userId: e.target.value }))}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1 text-xs text-slate-600 sm:max-w-[200px]">
            Warehouse
            <select
              className="mt-1 block w-full min-h-10 rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={assignForm.warehouseId}
              onChange={(e) => setAssignForm((f) => ({ ...f, warehouseId: e.target.value }))}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1 text-xs text-slate-600 sm:max-w-[200px]">
            Role
            <select
              className="mt-1 block w-full min-h-10 rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={assignForm.roleName}
              onChange={(e) => setAssignForm((f) => ({ ...f, roleName: e.target.value }))}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={assign}>
            Assign / update
          </Button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Roles</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{u.fullName}</div>
                  <div className="font-mono text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                    value={u.status}
                    onChange={(e) => setStatus(u.id, e.target.value as UserStatus)}
                  >
                    {Object.values(UserStatus).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <ul className="space-y-1">
                    {u.roleMappings.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono text-slate-700">{m.warehouse.code}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5">{m.role.name}</span>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => removeAssignment(m.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                    {u.roleMappings.length === 0 && <li className="text-slate-400">No roles</li>}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
