import { ExternalLink } from "lucide-react";

const EXTERNAL_3D_URL = "https://warehouse-3d-sage.vercel.app/";

export default function Visualizer3DPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-navy-border dark:bg-navy-surface">
        <p className="text-sm text-gray-500 dark:text-gray-400">Interactive 3D warehouse view</p>
        <a
          href={EXTERNAL_3D_URL}
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
          src={EXTERNAL_3D_URL}
          title="Warehouse 3D Visualizer"
          className="h-[75vh] w-full"
          allow="accelerometer; gyroscope"
        />
      </div>
    </div>
  );
}
