"use client";

export function DetailDrawer({
  open,
  title,
  onClose,
  children,
  widthClassName = "max-w-lg",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="h-full flex-1 cursor-default bg-black/40"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div
        className={`flex h-full w-full ${widthClassName} flex-col border-l border-gray-200 bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
