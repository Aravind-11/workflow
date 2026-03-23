import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import { TaskCreateForm } from "@/components/tasks/task-create-form";
import { listWarehousesForSelect } from "@/features/logistics/service";
import { prisma } from "@/server/db/prisma";

export default async function TasksPage() {
  const warehouses = await listWarehousesForSelect();
  const tasks = await prisma.task.findMany({
    where: { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 80,
    include: {
      warehouse: { select: { code: true, name: true } },
      workerProfile: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">Tasks</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Open work queue across warehouses.{" "}
          <Link href="/" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
            Back to dashboard
          </Link>
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TaskCreateForm warehouses={warehouses} />
        </div>
        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-navy dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">WH</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Prio</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 dark:border-navy-border">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-gray-100">{t.title}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.warehouse.code}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.taskType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">{t.priority}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {t.dueDate ? new Date(t.dueDate).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-white/10 dark:text-gray-300">
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                      No open tasks.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
