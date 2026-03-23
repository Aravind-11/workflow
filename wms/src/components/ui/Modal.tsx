export default function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-navy-surface dark:shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-sm text-gray-500 dark:text-gray-400">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
