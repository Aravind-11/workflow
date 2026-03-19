import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { getWorkerDetail } from "@/features/workers/service";
import { WorkerProfilePanels } from "@/components/workers/worker-profile-panels";

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getWorkerDetail(id);
  if (!data) notFound();

  const { worker, roleName, tasks, todaySchedules, timeOff, recentSchedules } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/workers" className="text-sm text-blue-700 hover:underline">
            ← Directory
          </Link>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">
            {worker.firstName} {worker.lastName}
          </h2>
          <p className="text-sm text-gray-600">
            {worker.employeeCode} · {worker.warehouse.code} {worker.warehouse.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <span>
              <span className="text-gray-500">Role:</span>{" "}
              <span className="font-medium">{roleName ?? "—"}</span>
            </span>
            <span>
              <span className="text-gray-500">Availability:</span>{" "}
              <span className="font-medium">
                {worker.status === "ACTIVE" ? "Available to schedule" : "Not available"}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">Contact</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd>{worker.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd>{worker.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Linked user</dt>
              <dd>{worker.user?.email ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-gray-900">Certifications</h3>
          {worker.certifications?.length ? (
            <ul className="list-inside list-disc text-sm text-gray-700">
              {worker.certifications.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">None recorded.</p>
          )}
        </section>
      </div>

      <WorkerProfilePanels
        workerId={worker.id}
        warehouseId={worker.warehouseId}
        todaySchedules={JSON.parse(JSON.stringify(todaySchedules))}
        timeOff={JSON.parse(JSON.stringify(timeOff))}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-gray-900">Task assignments</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500">No tasks assigned.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Due</th>
                  <th className="py-2 pr-4">Location</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4 font-medium">{t.title}</td>
                    <td className="py-2 pr-4">{t.taskType}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          t.status === TaskStatus.COMPLETED
                            ? "text-green-700"
                            : t.status === TaskStatus.IN_PROGRESS
                              ? "text-amber-700"
                              : "text-gray-700"
                        }
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      {t.dueDate ? new Date(t.dueDate).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {t.location?.locationCode ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-gray-900">Recent schedules</h3>
        {recentSchedules.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {recentSchedules.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {new Date(s.scheduleDate).toLocaleDateString()} · {s.shift.name}
                </span>
                <span className="text-gray-500">
                  {s.status.replace("_", " ")} · {s.confirmationStatus}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
