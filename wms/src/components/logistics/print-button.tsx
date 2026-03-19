"use client";

export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={
        className ??
        "rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
      }
      onClick={() => window.print()}
    >
      Print
    </button>
  );
}
