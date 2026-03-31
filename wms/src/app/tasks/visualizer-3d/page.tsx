import { Warehouse3DVisualizer } from "@/components/visualizer/warehouse-3d-visualizer";

export default function Visualizer3DPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">3D Task Visualizer</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Interactive Three.js plan rendered from the provided 2D floor layout, with direct bot control and patrol mode.
        </p>
      </header>
      <Warehouse3DVisualizer />
    </div>
  );
}
