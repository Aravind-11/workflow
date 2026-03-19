import { Package } from "lucide-react";

export function InventoryEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-16 text-center">
      <Package className="mb-3 h-10 w-10 text-gray-400" aria-hidden />
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p> : null}
    </div>
  );
}
