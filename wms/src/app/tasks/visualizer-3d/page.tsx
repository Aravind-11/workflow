import { ExternalLink } from "lucide-react";
import { getSelectedWarehouseId } from "@/lib/warehouse-context";

const EXTERNAL_3D_URL = "https://warehouse-3d-sage.vercel.app/";

export const dynamic = "force-dynamic";

export default async function Visualizer3DPage() {
  const warehouseId = await getSelectedWarehouseId();
  const apiBase = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const iframeUrl = new URL(EXTERNAL_3D_URL);
  if (apiBase) iframeUrl.searchParams.set("apiUrl", `${apiBase}/api/v1`);
  if (warehouseId) iframeUrl.searchParams.set("warehouseId", warehouseId);

  const externalUrl = iframeUrl.toString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-navy-border dark:bg-navy-surface">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Interactive 3D warehouse view
          </p>
          {apiBase && (
            <p className="mt-0.5 text-[10px] text-gray-400">
              API: {apiBase}/api/v1 · Warehouse: {warehouseId ?? "none"}
            </p>
          )}
        </div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Open in new tab
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-navy-border">
        <iframe
          src={externalUrl}
          title="Warehouse 3D Visualizer"
          className="h-[75vh] w-full"
          allow="accelerometer; gyroscope"
        />
      </div>
    </div>
  );
}
