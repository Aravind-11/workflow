export default function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500 dark:bg-navy dark:text-gray-400">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="dark:divide-navy-border">{children}</tbody>
      </table>
    </div>
  );
}
